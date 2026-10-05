import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { prisma } from '../src/lib/prisma.js'
import { buildApp } from '../src/app.js'
import { createAccessToken } from '../src/modules/core/auth/jwt.js'
import { env } from '../src/config/env.js'
import { requireMediaStorage } from '../src/modules/media/runtime.js'

const multipart = (bytes: Uint8Array, type: string, filename: string) => {
  const boundary = '----cisne-member-phase3'
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`)
  return { payload: Buffer.concat([head, Buffer.from(bytes), Buffer.from(`\r\n--${boundary}--\r\n`)]), contentType: `multipart/form-data; boundary=${boundary}` }
}
const image = (format: 'jpeg' | 'png' | 'webp', width = 300, height = 400) => sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 180 } } }).toFormat(format).toBuffer()
const cpf = (seed: number) => { const digits = String(seed).padStart(9, '0').slice(0, 9).split('').map(Number); const check = (length: number) => { const sum = digits.slice(0, length).reduce((total, digit, index) => total + digit * (length + 1 - index), 0); const value = (sum * 10) % 11; return value === 10 ? 0 : value }; digits.push(check(9)); digits.push(check(10)); return digits.join('') }

const main = async () => {
  const app = await buildApp()
  const admin = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'ADMIN' } } } } })
  const category = await prisma.memberCategory.findFirstOrThrow({ where: { isDependent: false, requiresHolder: false } })
  const token = createAccessToken(admin.id, env.jwtSecret)
  const created: string[] = []
  const createMember = async () => {
    const response = await app.inject({ method: 'POST', url: '/api/members', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, payload: { fullName: `Phase3 ${crypto.randomUUID()}`, cpf: cpf(Math.floor(Math.random() * 900000000) + 100000000), birthDate: '1990-01-01', admissionDate: '2026-01-01', categoryId: category.id } })
    assert.equal(response.statusCode, 201, response.body)
    const member = response.json<any>(); created.push(member.id); return member
  }
  const upload = async (member: any, bytes: Uint8Array, type: string, filename: string) => { const file = multipart(bytes, type, filename); return app.inject({ method: 'POST', url: `/api/members/${member.id}/photo`, headers: { authorization: `Bearer ${token}`, 'content-type': file.contentType }, payload: file.payload }) }
  try {
    for (const [format, mime] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']] as const) {
      const member = await createMember(); const response = await upload(member, await image(format), mime, `photo.${format}`); assert.equal(response.statusCode, 200, response.body)
      const row = await prisma.person.findUniqueOrThrow({ where: { id: member.person.id }, include: { photoAsset: true } })
      assert.equal(row.photoAsset?.visibility, 'PRIVATE'); assert.equal(row.photoAsset?.purpose, 'MEMBER_PHOTO'); assert.match(row.photoAsset?.storageKey || '', new RegExp(`^private/members/${member.person.id}/[0-9a-f-]+\\.jpg$`))
      const stored = await requireMediaStorage().read(row.photoAsset!.storageKey); assert.equal(row.photoAsset!.checksumSha256, crypto.createHash('sha256').update(stored).digest('hex')); assert.equal((await sharp(stored).metadata()).width, 300)
    }
    const invalid = await createMember(); const bad = await upload(invalid, await image('png', 400, 300), 'image/png', 'bad.png'); assert.equal(bad.statusCode, 400)
    const fake = await upload(invalid, await image('png'), 'image/jpeg', 'fake.jpg'); assert.equal(fake.statusCode, 400)
    const corrupt = await upload(invalid, Buffer.from('not-an-image'), 'image/png', 'corrupt.png'); assert.equal(corrupt.statusCode, 400)
    const removed = await createMember(); const uploaded = await upload(removed, await image('jpeg'), 'image/jpeg', 'delete.jpg'); assert.equal(uploaded.statusCode, 200)
    const before = await prisma.person.findUniqueOrThrow({ where: { id: removed.person.id }, select: { photoAssetId: true } }); const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: before.photoAssetId! } })
    assert.equal((await app.inject({ method: 'GET', url: `/api/members/${removed.id}/photo` })).statusCode, 401)
    const deleted = await app.inject({ method: 'DELETE', url: `/api/members/${removed.id}/photo`, headers: { authorization: `Bearer ${token}` } }); assert.equal(deleted.statusCode, 200)
    const after = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } }); assert.ok(after.deletedAt); assert.equal(await requireMediaStorage().exists(asset.storageKey), true); assert.equal((await app.inject({ method: 'GET', url: `/api/members/${removed.id}/photo`, headers: { authorization: `Bearer ${token}` } })).statusCode, 404)
    console.log('Member media Phase 3 HTTP validation passed.')
  } finally { for (const id of created) await prisma.member.delete({ where: { id } }).catch(() => undefined); await app.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
