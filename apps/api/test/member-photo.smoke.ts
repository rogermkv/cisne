import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { prisma } from '../src/lib/prisma.js'
import { createAccessToken } from '../src/modules/core/auth/jwt.js'
import { env } from '../src/config/env.js'
import { resolveFinancialResponsibleMemberId } from '../src/modules/core/members/domain.js'

const cpf = (seed: number) => {
  const digits = String(seed).padStart(9, '0').slice(0, 9).split('').map(Number)
  const check = (length: number) => { const sum = digits.slice(0, length).reduce((total, digit, index) => total + digit * (length + 1 - index), 0); const value = (sum * 10) % 11; return value === 10 ? 0 : value }
  digits.push(check(9)); digits.push(check(10)); return digits.join('')
}

const crc32 = (buffer: Buffer) => { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)) } return (crc ^ 0xffffffff) >>> 0 }
const png = (width: number, height: number, color: number) => {
  const chunk = (type: string, data: Buffer) => { const label = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([label, data])), 0); const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0); return Buffer.concat([length, label, data, crc]) }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6
  const rowSize = width * 4 + 1; const pixels = Buffer.alloc(rowSize * height); for (let row = 0; row < height; row++) { pixels[row * rowSize] = 0; for (let column = 0; column < width; column++) { const offset = row * rowSize + 1 + column * 4; pixels[offset] = color; pixels[offset + 1] = 120; pixels[offset + 2] = 200; pixels[offset + 3] = 255 } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
}
const png3x4 = (color: number) => png(3, 4, color)

const multipart = (bytes: Uint8Array, filename: string) => {
  const boundary = '----cisne-photo-test'
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`)
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return { payload: Buffer.concat([head, Buffer.from(bytes), tail]), contentType: `multipart/form-data; boundary=${boundary}` }
}

const main = async () => {
  const { buildApp } = await import('../src/app.js')
  const app = await buildApp()
  const secretaria = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'SECRETARIA' } } } } })
  const admin = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'ADMIN' } } } } })
  const tokens = { secretaria: createAccessToken(secretaria.id, env.jwtSecret), admin: createAccessToken(admin.id, env.jwtSecret) }
  const holderCategory = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, isDependent: false, requiresHolder: false } })
  const dependentCategory = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, OR: [{ isDependent: true }, { requiresHolder: true }] } })
  const seed = Number(String(Date.now()).slice(-9)); const people: string[] = []; const members: string[] = []
  const jsonHeaders = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' })
  const create = async (token: string, body: any) => {
    const response = await app.inject({ method: 'POST', url: '/api/members', headers: jsonHeaders(token), payload: body })
    assert.equal(response.statusCode, 201, response.body)
    const member = response.json<any>(); people.push(member.person.id); members.push(member.id); return member
  }
  const update = async (token: string, id: string, body: any) => {
    const response = await app.inject({ method: 'PUT', url: `/api/members/${id}`, headers: jsonHeaders(token), payload: body })
    assert.equal(response.statusCode, 200, response.body); return response.json<any>()
  }
  const upload = async (token: string, id: string, bytes: number[], name: string) => {
    const file = multipart(new Uint8Array(bytes), name)
    const response = await app.inject({ method: 'POST', url: `/api/members/${id}/photo`, headers: { authorization: `Bearer ${token}`, 'content-type': file.contentType }, payload: file.payload })
    assert.equal(response.statusCode, 200, response.body); return response.json<any>()
  }
  try {
    const holderFromSecretaria = await create(tokens.secretaria, { fullName: 'Smoke Titular Secretaria', cpf: cpf(seed), birthDate: '1990-01-01', admissionDate: '2026-01-01', categoryId: holderCategory.id, email: `secretaria-${seed}@example.test`, city: 'Santa Rosa' })
    assert.equal(holderFromSecretaria.person.photoPath, null)
    const invalidRatio = multipart(png(4, 3, 99), 'landscape.png')
    const invalidResponse = await app.inject({ method: 'POST', url: `/api/members/${holderFromSecretaria.id}/photo`, headers: { authorization: `Bearer ${tokens.admin}`, 'content-type': invalidRatio.contentType }, payload: invalidRatio.payload })
    assert.equal(invalidResponse.statusCode, 400); assert.match(invalidResponse.body, /3:4/)
    const holderPhoto = await upload(tokens.admin, holderFromSecretaria.id, png3x4(1), 'holder-first.png')
    assert.match(holderPhoto.person.photoPath, /person-photos\/.*\.png$/)
    const holderEdited = await update(tokens.secretaria, holderFromSecretaria.id, { fullName: 'Smoke Titular Secretaria Editado', cpf: cpf(seed), birthDate: '1990-01-01', admissionDate: '2026-01-01', categoryId: holderCategory.id, email: `secretaria-edit-${seed}@example.test`, city: 'Santa Rosa' })
    assert.equal(holderEdited.person.email, `secretaria-edit-${seed}@example.test`)
    const holderReplaced = await upload(tokens.secretaria, holderFromSecretaria.id, png3x4(2), 'holder-second.png')
    assert.notEqual(holderReplaced.person.photoPath, holderPhoto.person.photoPath)

    const holderFromAdmin = await create(tokens.admin, { fullName: 'Smoke Titular Admin', cpf: cpf(seed + 1), birthDate: '1988-02-02', admissionDate: '2026-01-01', categoryId: holderCategory.id })
    const holderAdminPhoto = await upload(tokens.secretaria, holderFromAdmin.id, png3x4(3), 'holder-admin.png')
    assert.ok(holderAdminPhoto.person.photoPath)
    await update(tokens.admin, holderFromAdmin.id, { fullName: 'Smoke Titular Admin Editado', cpf: cpf(seed + 1), birthDate: '1988-02-02', admissionDate: '2026-01-01', categoryId: holderCategory.id })

    const missingHolder = await app.inject({ method: 'POST', url: '/api/members', headers: jsonHeaders(tokens.admin), payload: { fullName: 'Smoke Dependente Sem Titular', cpf: cpf(seed + 2), birthDate: '2015-01-01', admissionDate: '2026-01-01', categoryId: dependentCategory.id, relationship: 'Filho' } })
    assert.equal(missingHolder.statusCode, 400)
    assert.match(missingHolder.body, /titular/i)

    const beforeCharges = await prisma.financialCharge.count({ where: { responsibleMemberId: holderFromSecretaria.id } })
    const dependent = await create(tokens.secretaria, { fullName: 'Smoke Dependente Unificado', cpf: cpf(seed + 3), birthDate: '2015-03-03', admissionDate: '2026-01-01', categoryId: dependentCategory.id, titularMemberId: holderFromSecretaria.id, relationship: 'Filho', email: `dependente-${seed}@example.test`, city: 'Santa Rosa' })
    assert.equal(dependent.titularMemberId, holderFromSecretaria.id)
    assert.equal(dependent.person.email, `dependente-${seed}@example.test`)
    assert.equal(await resolveFinancialResponsibleMemberId(dependent.id), holderFromSecretaria.id)
    assert.equal(await prisma.financialCharge.count({ where: { memberId: dependent.id } }), 0)
    assert.equal(await prisma.financialCharge.count({ where: { responsibleMemberId: holderFromSecretaria.id } }), beforeCharges)

    const dependentPhoto = await upload(tokens.admin, dependent.id, png3x4(4), 'dependent-first.png')
    const dependentEdited = await update(tokens.admin, dependent.id, { fullName: 'Smoke Dependente Unificado Editado', cpf: cpf(seed + 3), birthDate: '2015-03-03', admissionDate: '2026-01-01', categoryId: dependentCategory.id, titularMemberId: holderFromSecretaria.id, relationship: 'Filha', email: `dependente-edit-${seed}@example.test`, city: 'Santa Rosa' })
    assert.equal(dependentEdited.titularMemberId, holderFromSecretaria.id)
    assert.equal(dependentEdited.person.email, `dependente-edit-${seed}@example.test`)
    const dependentReplaced = await upload(tokens.secretaria, dependent.id, png3x4(5), 'dependent-second.png')
    assert.notEqual(dependentReplaced.person.photoPath, dependentPhoto.person.photoPath)

    const existing = await prisma.member.findFirst({ where: { titularMemberId: { not: null }, id: { notIn: members } } })
    if (existing) { const response = await app.inject({ method: 'GET', url: `/api/members/${existing.id}`, headers: { authorization: `Bearer ${tokens.admin}` } }); assert.equal(response.statusCode, 200) }
    console.log('Member holder/dependent form, photo, permissions and financial responsibility smoke validated.')
  } finally {
    for (const id of members) await app.inject({ method: 'DELETE', url: `/api/members/${id}/photo`, headers: { authorization: `Bearer ${tokens.admin}` } })
    await prisma.user.deleteMany({ where: { personId: { in: people } } })
    await prisma.member.deleteMany({ where: { id: { in: members } } })
    await prisma.person.deleteMany({ where: { id: { in: people } } })
    await app.close()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
