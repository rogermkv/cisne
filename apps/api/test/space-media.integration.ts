import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { LocalMediaStorage } from '../src/modules/media/local-media-storage.js'

const root = path.resolve(process.env.MEDIA_STORAGE_ROOT || '')
const legacyRoot = path.resolve(process.env.SPACE_PHOTOS_DIR || '')
const multipart = (bytes: Uint8Array, mime: string, filename: string, isPrimary = false) => {
  const boundary = `----cisne-${crypto.randomUUID()}`
  const field = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="isPrimary"\r\n\r\n${isPrimary ? 'true' : 'false'}\r\n`)
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`)
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return { payload: Buffer.concat([field, head, Buffer.from(bytes), tail]), contentType: `multipart/form-data; boundary=${boundary}` }
}
const image = (format: 'jpeg' | 'png' | 'webp', width = 400, height = 300, orientation?: number) => {
  let pipeline = sharp({ create: { width, height, channels: 4, background: { r: 40, g: 100, b: 180, alpha: 1 } } })
  if (orientation) pipeline = pipeline.withMetadata({ orientation })
  return format === 'jpeg' ? pipeline.jpeg().toBuffer() : format === 'png' ? pipeline.png().toBuffer() : pipeline.webp().toBuffer()
}

const main = async () => {
  assert.ok(process.env.DATABASE_URL)
  assert.ok(process.env.MEDIA_STORAGE_ROOT)
  const app = await buildApp()
  try {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf: '52998224725', password: 'Phase2Password123!' } })
    assert.equal(login.statusCode, 200, login.body)
    const token = login.json<{ token: string }>().token
    const auth = { authorization: `Bearer ${token}` }
    const spaceId = 'space-quiosque-1'
    const originalCount = await prisma.spacePhoto.count({ where: { spaceId } })
    const mediaCountBeforeUpload = await prisma.mediaAsset.count({ where: { purpose: 'SPACE_PHOTO' } })

    const oriented = await image('jpeg', 400, 300, 6)
    const uploadRequest = multipart(oriented, 'image/jpeg', 'oriented.jpg', true)
    const upload = await app.inject({ method: 'POST', url: `/api/spaces/${spaceId}/photo`, headers: { ...auth, 'content-type': uploadRequest.contentType }, payload: uploadRequest.payload })
    assert.equal(upload.statusCode, 201, upload.body)
    const uploaded = upload.json<any>()
    const storedPhoto = await prisma.spacePhoto.findUniqueOrThrow({ where: { id: uploaded.id }, include: { mediaAsset: true, space: true } })
    assert.ok(storedPhoto.mediaAssetId)
    assert.equal(storedPhoto.mediaAsset?.visibility, 'PUBLIC')
    assert.equal(storedPhoto.mediaAsset?.purpose, 'SPACE_PHOTO')
    assert.match(storedPhoto.mediaAsset!.storageKey, new RegExp(`^public/spaces/${spaceId}/[0-9a-f-]+\\.jpg$`))
    const storedBytes = await new LocalMediaStorage(root).read(storedPhoto.mediaAsset!.storageKey)
    assert.equal(crypto.createHash('sha256').update(storedBytes).digest('hex'), storedPhoto.mediaAsset!.checksumSha256)
    const metadata = await sharp(storedBytes).metadata()
    assert.equal(metadata.orientation, undefined)
    assert.equal(storedPhoto.mediaAsset!.width, metadata.width)
    assert.equal(storedPhoto.mediaAsset!.height, metadata.height)
    assert.equal(storedPhoto.path.startsWith('/uploads/space-photos/'), true)
    assert.equal(storedPhoto.space.imagePath, storedPhoto.path)
    assert.equal(await prisma.spacePhoto.count({ where: { spaceId, isPrimary: true } }), 1)

    const canonical = await app.inject({ method: 'GET', url: `/api/media/${storedPhoto.mediaAssetId}` })
    assert.equal(canonical.statusCode, 200)
    assert.equal(canonical.headers['content-type'], 'image/jpeg')
    assert.deepEqual(canonical.rawPayload, storedBytes)

    const spacesResponse = await app.inject({ method: 'GET', url: '/api/reservable-spaces', headers: auth })
    assert.equal(spacesResponse.statusCode, 200)
    const listed = spacesResponse.json<any[]>().find(space => space.id === spaceId)
    assert.equal(listed.primaryMedia.id, storedPhoto.mediaAssetId)
    assert.equal(listed.photos.find((photo: any) => photo.id === storedPhoto.id).path, `/api/media/${storedPhoto.mediaAssetId}`)

    const badMime = await image('jpeg')
    const badMimeRequest = multipart(badMime, 'image/png', 'fake.png')
    const beforeBad = await prisma.spacePhoto.count({ where: { spaceId } })
    const badMimeResponse = await app.inject({ method: 'POST', url: `/api/spaces/${spaceId}/photo`, headers: { ...auth, 'content-type': badMimeRequest.contentType }, payload: badMimeRequest.payload })
    assert.equal(badMimeResponse.statusCode, 400)
    assert.equal(await prisma.spacePhoto.count({ where: { spaceId } }), beforeBad)
    const corruptRequest = multipart(Buffer.from('corrupt'), 'image/jpeg', 'corrupt.jpg')
    const corruptResponse = await app.inject({ method: 'POST', url: `/api/spaces/${spaceId}/photo`, headers: { ...auth, 'content-type': corruptRequest.contentType }, payload: corruptRequest.payload })
    assert.equal(corruptResponse.statusCode, 400)
    assert.equal(await prisma.mediaAsset.count({ where: { purpose: 'SPACE_PHOTO' } }), mediaCountBeforeUpload + 1)
    const huge = await image('png', 3000, 3000)
    const hugeRequest = multipart(huge, 'image/png', 'huge.png')
    const hugeResponse = await app.inject({ method: 'POST', url: `/api/spaces/${spaceId}/photo`, headers: { ...auth, 'content-type': hugeRequest.contentType }, payload: hugeRequest.payload })
    assert.equal(hugeResponse.statusCode, 201)
    const hugeAsset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: hugeResponse.json<any>().media.id } })
    const hugeMetadata = await sharp(await new LocalMediaStorage(root).read(hugeAsset.storageKey)).metadata()
    assert.ok((hugeMetadata.width || 0) <= 2560 && (hugeMetadata.height || 0) <= 2560)

    const photos = await prisma.spacePhoto.findMany({ where: { spaceId }, orderBy: { sortOrder: 'asc' } })
    for (const photo of photos.slice(0, 3)) {
      const response = await app.inject({ method: 'PUT', url: `/api/spaces/${spaceId}/photos/${photo.id}/primary`, headers: auth })
      assert.equal(response.statusCode, 200, response.body)
      assert.equal(await prisma.spacePhoto.count({ where: { spaceId, isPrimary: true } }), 1)
      assert.equal((await prisma.reservableSpace.findUniqueOrThrow({ where: { id: spaceId } })).imagePath, photo.path)
    }

    const legacyOnlyPath = '/uploads/space-photos/legacy-only.png'
    const legacyOnlyBytes = await image('png', 30, 20)
    await fs.writeFile(path.join(legacyRoot, 'legacy-only.png'), legacyOnlyBytes)
    const legacyOnly = await prisma.spacePhoto.create({ data: { spaceId, path: legacyOnlyPath, sortOrder: 99 } })
    const legacyListing = (await app.inject({ method: 'GET', url: '/api/reservable-spaces', headers: auth })).json<any[]>().find(space => space.id === spaceId)
    assert.equal(legacyListing.photos.find((photo: any) => photo.id === legacyOnly.id).path, legacyOnlyPath)
    const legacyPhysical = await app.inject({ method: 'GET', url: legacyOnlyPath })
    assert.equal(legacyPhysical.statusCode, 200)
    assert.deepEqual(legacyPhysical.rawPayload, legacyOnlyBytes)

    const migratedPhoto = await prisma.spacePhoto.findFirstOrThrow({ where: { spaceId, mediaAssetId: { not: null } } })
    const migratedAsset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: migratedPhoto.mediaAssetId! } })
    await fs.rm(path.join(legacyRoot, path.basename(migratedPhoto.path)), { force: true })
    const legacyFallback = await app.inject({ method: 'GET', url: migratedPhoto.path })
    assert.equal(legacyFallback.statusCode, 200)
    assert.deepEqual(legacyFallback.rawPayload, await new LocalMediaStorage(root).read(migratedAsset.storageKey))

    const privateBytes = await image('png', 10, 10)
    const privateKey = `private/test/${crypto.randomUUID()}.png`
    await new LocalMediaStorage(root).put(privateKey, privateBytes)
    const privateAsset = await prisma.mediaAsset.create({ data: { storageKey: privateKey, mimeType: 'image/png', sizeBytes: privateBytes.length, width: 10, height: 10, checksumSha256: crypto.createHash('sha256').update(privateBytes).digest('hex'), visibility: 'PRIVATE', purpose: 'MEMBER_PHOTO', originalName: 'private.png' } })
    assert.equal((await app.inject({ method: 'GET', url: `/api/media/${privateAsset.id}` })).statusCode, 404)
    assert.equal((await app.inject({ method: 'GET', url: '/api/media/not-a-real-id' })).statusCode, 404)
    assert.equal((await app.inject({ method: 'GET', url: `/api/media/${privateAsset.id}/..` })).statusCode, 404)
    assert.equal((await app.inject({ method: 'GET', url: '/uploads/space-photos/../../etc/passwd' })).statusCode, 404)
    assert.equal((await app.inject({ method: 'GET', url: '/uploads/space-photos/does-not-exist.jpg' })).statusCode, 404)

    const deletedAsset = await prisma.mediaAsset.create({ data: { storageKey: `public/test/${crypto.randomUUID()}.png`, mimeType: 'image/png', sizeBytes: 1, width: 1, height: 1, checksumSha256: 'x', visibility: 'PUBLIC', purpose: 'SPACE_PHOTO', deletedAt: new Date() } })
    const deletedPhoto = await prisma.spacePhoto.create({ data: { spaceId, path: '/uploads/space-photos/deleted-modern.png', mediaAssetId: deletedAsset.id, sortOrder: 101 } })
    assert.equal((await app.inject({ method: 'GET', url: `/api/media/${deletedAsset.id}` })).statusCode, 404)
    const deletedListing = (await app.inject({ method: 'GET', url: '/api/reservable-spaces', headers: auth })).json<any[]>().find(space => space.id === spaceId)
    assert.equal(deletedListing.photos.find((photo: any) => photo.id === deletedPhoto.id).path, deletedPhoto.path)

    const missingAsset = await prisma.mediaAsset.create({ data: { storageKey: `public/test/${crypto.randomUUID()}.png`, mimeType: 'image/png', sizeBytes: 1, width: 1, height: 1, checksumSha256: 'missing', visibility: 'PUBLIC', purpose: 'SPACE_PHOTO' } })
    const missingPhoto = await prisma.spacePhoto.create({ data: { spaceId, path: '/uploads/space-photos/missing-modern.png', mediaAssetId: missingAsset.id, sortOrder: 102 } })
    const missingListing = (await app.inject({ method: 'GET', url: '/api/reservable-spaces', headers: auth })).json<any[]>().find(space => space.id === spaceId)
    assert.equal(missingListing.photos.find((photo: any) => photo.id === missingPhoto.id).path, `/api/media/${missingAsset.id}`)
    assert.equal((await app.inject({ method: 'GET', url: `/api/media/${missingAsset.id}` })).statusCode, 404)

    const deleteTarget = await prisma.spacePhoto.findFirstOrThrow({ where: { spaceId, mediaAssetId: { not: null }, isPrimary: false } })
    const deleteAsset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: deleteTarget.mediaAssetId! } })
    const deletePath = path.join(root, ...deleteAsset.storageKey.split('/'))
    assert.equal((await app.inject({ method: 'DELETE', url: `/api/spaces/${spaceId}/photos/${deleteTarget.id}`, headers: auth })).statusCode, 200)
    assert.ok((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: deleteAsset.id } })).deletedAt)
    await fs.access(deletePath)
    assert.equal((await app.inject({ method: 'GET', url: `/api/media/${deleteAsset.id}` })).statusCode, 404)

    const deleteSpace = await app.inject({ method: 'POST', url: '/api/spaces', headers: { ...auth, 'content-type': 'application/json' }, payload: { name: 'Fase2 Delete Space', price: 0, capacity: 2 } })
    assert.equal(deleteSpace.statusCode, 201, deleteSpace.body)
    const temporarySpaceId = deleteSpace.json<any>().id
    const temporaryAssets: string[] = []
    for (let i = 0; i < 3; i++) {
      const request = multipart(await image('webp', 20 + i, 20), 'image/webp', `delete-${i}.webp`, i === 0)
      const response = await app.inject({ method: 'POST', url: `/api/spaces/${temporarySpaceId}/photo`, headers: { ...auth, 'content-type': request.contentType }, payload: request.payload })
      assert.equal(response.statusCode, 201, response.body)
      temporaryAssets.push(response.json<any>().media.id)
    }
    const beforeDeleteSpace = await prisma.mediaAsset.findMany({ where: { id: { in: temporaryAssets } } })
    assert.equal((await app.inject({ method: 'DELETE', url: `/api/spaces/${temporarySpaceId}`, headers: auth })).statusCode, 200)
    assert.equal(await prisma.spacePhoto.count({ where: { spaceId: temporarySpaceId } }), 0)
    for (const asset of beforeDeleteSpace) { assert.ok((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt); await fs.access(path.join(root, ...asset.storageKey.split('/'))); assert.equal((await app.inject({ method: 'GET', url: `/api/media/${asset.id}` })).statusCode, 404) }

    console.log('SPACE_MEDIA_INTEGRATION_OK')
  } finally { await app.close() }
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
