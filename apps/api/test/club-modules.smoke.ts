import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma.js'
import { createAccessToken } from '../src/modules/core/auth/jwt.js'
import { env } from '../src/config/env.js'
import { resolveFinancialResponsibleMemberId } from '../src/modules/core/members/domain.js'

const cpf = (base: string) => {
  const digits = base.slice(0, 9).split('').map(Number)
  const digit = (length: number) => { let sum = 0; for (let i = 0; i < length; i += 1) sum += digits[i] * (length + 1 - i); const rest = (sum * 10) % 11; return rest === 10 ? 0 : rest }
  digits.push(digit(9)); digits.push(digit(10)); return digits.join('')
}

const json = (body: unknown, token: string) => ({ headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, payload: body })

const main = async () => {
  const { buildApp } = await import('../src/app.js')
  const app = await buildApp()
  const admin = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'ADMIN' } } } }, include: { person: true } })
  const adminToken = createAccessToken(admin.id, env.jwtSecret)
  const category = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, isDependent: false, requiresHolder: false } })
  const dependentCategory = await prisma.memberCategory.findFirstOrThrow({ where: { active: true, isDependent: true } })
  const uniqueSeed = Number(String(Date.now()).slice(-9))
  const holderCpf = cpf(String(uniqueSeed).padStart(9, '0'))
  const dependentCpf = cpf(String(uniqueSeed + 1).padStart(9, '0'))
  const createdIds: { member?: string; person?: string; dependent?: string; dependentPerson?: string; announcements: string[]; reservations: string[] } = { announcements: [], reservations: [] }

  try {
    const holderResponse = await app.inject({ method: 'POST', url: '/api/members', ...json({ fullName: 'Smoke Holder', cpf: holderCpf, birthDate: '1990-01-02', admissionDate: '2026-01-01', categoryId: category.id, status: 'ACTIVE' }, adminToken) })
    assert.equal(holderResponse.statusCode, 201)
    const holder = holderResponse.json<any>(); createdIds.member = holder.id; createdIds.person = holder.person.id
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf: holderCpf, password: '02011990' } })
    assert.equal(login.statusCode, 200)
    const memberToken = login.json<any>().token

    const dependentResponse = await app.inject({ method: 'POST', url: '/api/members', ...json({ fullName: 'Smoke Dependent', cpf: dependentCpf, birthDate: '2015-03-04', admissionDate: '2026-01-01', categoryId: dependentCategory.id, titularMemberId: holder.id, relationship: 'Filho', status: 'ACTIVE' }, adminToken) })
    assert.equal(dependentResponse.statusCode, 201)
    const dependent = dependentResponse.json<any>(); createdIds.dependent = dependent.id; createdIds.dependentPerson = dependent.person.id
    assert.equal(dependent.financialResponsible.id, holder.id)
    assert.equal(await resolveFinancialResponsibleMemberId(dependent.id), holder.id)

    const missingHolder = await app.inject({ method: 'POST', url: '/api/members', ...json({ fullName: 'Invalid Dependent', cpf: cpf('111222333'), birthDate: '2015-03-04', admissionDate: '2026-01-01', categoryId: dependentCategory.id }, adminToken) })
    assert.equal(missingHolder.statusCode, 400)
    assert.equal((await app.inject({ method: 'GET', url: `/api/members/holders/search?q=Smoke%20Holder`, headers: { authorization: `Bearer ${adminToken}` } })).statusCode, 200)
    assert.equal((await app.inject({ method: 'GET', url: `/api/members/holders/search?q=${holderCpf}`, headers: { authorization: `Bearer ${adminToken}` } })).statusCode, 200)

    const reset = await app.inject({ method: 'POST', url: `/api/members/${holder.id}/access/reset-password`, headers: { authorization: `Bearer ${adminToken}` } })
    assert.equal(reset.statusCode, 200)
    const secretaria = await prisma.role.findUniqueOrThrow({ where: { name: 'SECRETARIA' }, include: { permissions: { include: { permission: true } } } })
    const secretariaKeys = secretaria.permissions.map((item) => item.permission.key)
    assert.ok(secretariaKeys.includes('members.manage')); assert.ok(secretariaKeys.includes('finance.manage'))

    const future = await app.inject({ method: 'POST', url: '/api/announcements', ...json({ title: 'Future smoke', content: 'Not yet', startDate: new Date(Date.now() + 86400000).toISOString() }, adminToken) })
    const expired = await app.inject({ method: 'POST', url: '/api/announcements', ...json({ title: 'Expired smoke', content: 'Gone', startDate: new Date(Date.now() - 172800000).toISOString(), endDate: new Date(Date.now() - 86400000).toISOString() }, adminToken) })
    assert.equal(future.statusCode, 201); assert.equal(expired.statusCode, 201); createdIds.announcements.push(future.json<any>().id, expired.json<any>().id)
    const announcements = await app.inject({ method: 'GET', url: '/api/member/me/announcements', headers: { authorization: `Bearer ${memberToken}` } })
    assert.equal(announcements.statusCode, 200); assert.ok(!announcements.json<any[]>().some((item) => item.title.includes('smoke')))

    const space = await prisma.reservableSpace.findFirstOrThrow({ where: { active: true } })
    const date = '2035-05-05'
    const first = await app.inject({ method: 'POST', url: '/api/reservations', ...json({ memberId: holder.id, spaceId: space.id, reservationDate: date, startTime: '10:00', endTime: '12:00', status: 'APPROVED' }, adminToken) })
    assert.equal(first.statusCode, 201); createdIds.reservations.push(first.json<any>().id)
    const conflict = await app.inject({ method: 'POST', url: '/api/reservations', ...json({ memberId: holder.id, spaceId: space.id, reservationDate: date, startTime: '11:00', endTime: '13:00' }, adminToken) })
    assert.equal(conflict.statusCode, 409)
    const accessStats = await app.inject({ method: 'GET', url: '/api/access/stats', headers: { authorization: `Bearer ${adminToken}` } })
    assert.equal(accessStats.statusCode, 200); assert.deepEqual(Object.keys(accessStats.json<any>()).filter((key) => ['today', 'last2Days', 'last7Days'].includes(key)).sort(), ['last2Days', 'last7Days', 'today'])
    console.log('Club module smoke validated.')
  } finally {
    if (createdIds.reservations.length) await prisma.reservation.deleteMany({ where: { id: { in: createdIds.reservations } } })
    if (createdIds.announcements.length) await prisma.announcement.deleteMany({ where: { id: { in: createdIds.announcements } } })
    const people = [createdIds.person, createdIds.dependentPerson].filter(Boolean) as string[]
    if (people.length) await prisma.user.deleteMany({ where: { personId: { in: people } } })
    const members = [createdIds.member, createdIds.dependent].filter(Boolean) as string[]
    if (members.length) await prisma.member.deleteMany({ where: { id: { in: members } } })
    if (people.length) await prisma.person.deleteMany({ where: { id: { in: people } } })
    await app.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
