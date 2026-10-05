import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { LocalMediaStorage } from '../src/modules/media/local-media-storage.js'
import { MediaService, type MediaAssetRecord, type MediaAssetRepository } from '../src/modules/media/media-service.js'

const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

class InMemoryAssets implements MediaAssetRepository {
  records: MediaAssetRecord[] = []
  async create(args: { data: Omit<MediaAssetRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<MediaAssetRecord> {
    const record = { id: crypto.randomUUID(), ...args.data }
    this.records.push(record)
    return record
  }
  async update(args: { where: { id: string }; data: { deletedAt: Date } }): Promise<MediaAssetRecord> {
    const record = this.records.find((item) => item.id === args.where.id)
    assert.ok(record)
    record.deletedAt = args.data.deletedAt
    return record
  }
}

const expectRejected = async (callback: () => unknown, message: RegExp) => {
  await assert.rejects(async () => callback(), message)
}

const main = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cisne-media-foundation-'))
  try {
    const storage = new LocalMediaStorage(root)
    const key = 'private/members/member-1/photo.jpg'
    const bytes = Buffer.from('cisne-media-test')
    await storage.put(key, bytes)
    assert.equal(await storage.exists(key), true)
    assert.deepEqual(await storage.read(key), bytes)
    assert.equal((await storage.stat(key)).sizeBytes, bytes.length)
    await expectRejected(() => storage.put(key, Buffer.from('overwrite')), /EEXIST|already exists/)
    const concurrentKey = 'private/members/member-1/concurrent.jpg'
    const concurrentResults = await Promise.allSettled([
      storage.put(concurrentKey, Buffer.from('first')),
      storage.put(concurrentKey, Buffer.from('second')),
    ])
    assert.equal(concurrentResults.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(concurrentResults.filter((result) => result.status === 'rejected').length, 1)
    const concurrentContent = await storage.read(concurrentKey)
    assert.ok(concurrentContent.equals(Buffer.from('first')) || concurrentContent.equals(Buffer.from('second')))
    await storage.delete(key)
    assert.equal(await storage.exists(key), false)
    await assert.rejects(() => storage.read(key), /ENOENT/)

    const invalidKeys = ['', '../escape.txt', '../../escape.txt', 'a/../../escape.txt', '/absolute.txt', 'C:/absolute.txt', 'file:///tmp/a', 'http://example/a', 'https://example/a', 'private/./file.jpg', 'private/../file.jpg', 'private\\member\\file.jpg']
    for (const invalidKey of invalidKeys) await expectRejected(() => storage.put(invalidKey, bytes), /Storage key/)
    await storage.put('private/%2e%2e/literal.jpg', bytes)
    assert.deepEqual(await storage.read('private/%2e%2e/literal.jpg'), bytes)

    const failureRoot = path.join(root, 'failure')
    const failingStorage = new LocalMediaStorage(failureRoot, { writeFile: async () => { throw new Error('simulated write failure') }, link: fs.link, unlink: fs.unlink, realpath: fs.realpath })
    await expectRejected(() => failingStorage.put('private/members/member-1/failure.jpg', bytes), /simulated write failure/)
    assert.deepEqual(await fs.readdir(path.join(failureRoot, 'private', 'members', 'member-1')), [])

    const assets = new InMemoryAssets()
    const service = new MediaService(storage, assets)
    const publicAsset = await service.create({ bytes: png1x1, mimeType: 'image/png', visibility: 'PUBLIC', purpose: 'SPACE_PHOTO', ownerId: 'space-1', originalName: 'space.png' })
    const privateAsset = await service.create({ bytes: png1x1, mimeType: 'image/png', visibility: 'PRIVATE', purpose: 'MEMBER_PHOTO', ownerId: 'member-1', originalName: 'member.png' })
    assert.equal(publicAsset.visibility, 'PUBLIC')
    assert.equal(privateAsset.visibility, 'PRIVATE')
    assert.equal(publicAsset.width, 1)
    assert.equal(publicAsset.height, 1)
    assert.equal(publicAsset.checksumSha256, crypto.createHash('sha256').update(png1x1).digest('hex'))
    assert.notEqual(publicAsset.storageKey, privateAsset.storageKey)
    assert.equal(publicAsset.checksumSha256, privateAsset.checksumSha256)
    assert.equal(assets.records.length, 2)
    await service.softDelete(privateAsset)
    assert.ok(assets.records[1].deletedAt)
    assert.equal(await storage.exists(privateAsset.storageKey), true)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
