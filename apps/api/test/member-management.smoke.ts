import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma.js'
import { createAccessToken } from '../src/modules/core/auth/jwt.js'
import { env } from '../src/config/env.js'

const cpf = (seed: number) => {
  const digits = String(seed).padStart(9, '0').slice(0, 9).split('').map(Number)
  const calculate = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i += 1) sum += digits[i] * (length + 1 - i)
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }
  digits.push(calculate(9))
  digits.push(calculate(10))
  return digits.join('')
}
const request = (token: string, body?: unknown) => ({ headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, payload: body })

const main = async () => {
  const { buildApp } = await import('../src/app.js')
  const app = await buildApp()
  const admin = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'ADMIN' } } } } })
  const token = createAccessToken(admin.id, env.jwtSecret)
  const category = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, isDependent: false, requiresHolder: false } })
  const dependentCategory = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, isDependent: true } })
  const seed = Number(String(Date.now()).slice(-9))
  const people: string[] = []
  const members: string[] = []
  try {
    const first = await app.inject({ method: 'POST', url: '/api/members', ...request(token, { fullName: 'Smoke Sócio Validação', cpf: cpf(seed), birthDate: '1990-01-02', admissionDate: '2026-01-01', categoryId: category.id }) })
    assert.equal(first.statusCode, 201)
    const holder = first.json<any>(); members.push(holder.id); people.push(holder.person.id)
    const form = { ...holder.person, categoryId: category.id, admissionDate: String(holder.admissionDate).slice(0, 10), birthDate: String(holder.person.birthDate).slice(0, 10), cpf: holder.person.cpf }
    const invalid = await app.inject({ method: 'PUT', url: '/api/members/' + holder.id, ...request(token, { ...form, cpf: '11111111111' }) })
    assert.equal(invalid.statusCode, 400); assert.equal(invalid.json().field, 'cpf'); assert.equal(invalid.json().message, 'Informe um CPF válido.')
    const duplicate = await app.inject({ method: 'POST', url: '/api/members', ...request(token, { fullName: 'Smoke Outro Sócio', cpf: cpf(seed + 1), birthDate: '1990-01-03', admissionDate: '2026-01-01', categoryId: category.id }) })
    assert.equal(duplicate.statusCode, 201)
    const other = duplicate.json<any>(); members.push(other.id); people.push(other.person.id)
    const conflict = await app.inject({ method: 'PUT', url: '/api/members/' + holder.id, ...request(token, { ...form, cpf: other.person.cpf }) })
    assert.equal(conflict.statusCode, 409); assert.equal(conflict.json().field, 'cpf')
    const update = await app.inject({ method: 'PUT', url: '/api/members/' + holder.id, ...request(token, { ...form, fullName: 'Smoke Sócio Atualizado', phone: '55999990000' }) })
    assert.equal(update.statusCode, 200); assert.equal(update.json().person.fullName, 'Smoke Sócio Atualizado')
    const dependent = await app.inject({ method: 'POST', url: '/api/members/' + holder.id + '/dependents', ...request(token, { fullName: 'Smoke Dependente', cpf: cpf(seed + 2), birthDate: '2015-03-04', relationship: 'Filho' }) })
    assert.equal(dependent.statusCode, 200)
    const dependentRow = dependent.json<any>(); members.push(dependentRow.id); people.push(dependentRow.person.id)
    const blockedStatus = await app.inject({ method: 'POST', url: '/api/members/' + holder.id + '/status', ...request(token, { status: 'INACTIVE' }) })
    assert.equal(blockedStatus.statusCode, 409)
    const blockedDelete = await app.inject({ method: 'DELETE', url: '/api/members/' + holder.id, headers: { authorization: 'Bearer ' + token } })
    assert.equal(blockedDelete.statusCode, 409)
    await prisma.member.update({ where: { id: dependentRow.id }, data: { status: 'TERMINATED' } })
    const inactive = await app.inject({ method: 'POST', url: '/api/members/' + holder.id + '/status', ...request(token, { status: 'INACTIVE' }) })
    assert.equal(inactive.statusCode, 200); assert.equal(inactive.json().status, 'INACTIVE')
    const userAfterInactive = await prisma.user.findUniqueOrThrow({ where: { personId: holder.person.id } })
    assert.equal(userAfterInactive.active, false)
    const active = await app.inject({ method: 'POST', url: '/api/members/' + holder.id + '/status', ...request(token, { status: 'ACTIVE' }) })
    assert.equal(active.statusCode, 200); assert.equal((await prisma.user.findUniqueOrThrow({ where: { personId: holder.person.id } })).active, false)
    const enabled = await app.inject({ method: 'POST', url: '/api/members/' + holder.id + '/access/toggle', ...request(token, { active: true }) })
    assert.equal(enabled.statusCode, 200)
    const deleted = await app.inject({ method: 'DELETE', url: '/api/members/' + holder.id, headers: { authorization: 'Bearer ' + token } })
    assert.equal(deleted.statusCode, 409)
    const clean = await app.inject({ method: 'POST', url: '/api/members', ...request(token, { fullName: 'Smoke Exclusão', cpf: cpf(seed + 3), birthDate: '1990-01-05', admissionDate: '2026-01-01', categoryId: category.id }) })
    assert.equal(clean.statusCode, 201)
    const cleanRow = clean.json<any>(); members.push(cleanRow.id); people.push(cleanRow.person.id)
    const physicallyDeleted = await app.inject({ method: 'DELETE', url: '/api/members/' + cleanRow.id, headers: { authorization: 'Bearer ' + token } })
    assert.equal(physicallyDeleted.statusCode, 200)
    console.log('Member management smoke validated.')
  } finally {
    await prisma.user.deleteMany({ where: { personId: { in: people } } })
    await prisma.member.deleteMany({ where: { id: { in: members } } })
    await prisma.person.deleteMany({ where: { id: { in: people } } })
    await app.close()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
