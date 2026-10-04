import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma.js'
import { createAccessToken } from '../src/modules/core/auth/jwt.js'
import { env } from '../src/config/env.js'

const main = async () => {
  const { buildApp } = await import('../src/app.js')
  const app = await buildApp()
  const socio = await prisma.user.findFirstOrThrow({ where: { roles: { some: { role: { name: 'SOCIO' } } }, person: { member: { status: 'ACTIVE' } } }, include: { person: { include: { member: true } } } })
  const space = await prisma.reservableSpace.findFirstOrThrow({ where: { active: true } })
  const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const token = createAccessToken(socio.id, env.jwtSecret)
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  let reservationId = ''
  try {
    const created = await app.inject({ method: 'POST', url: '/api/member/me/reservations', headers, payload: { spaceId: space.id, reservationDate: date } })
    assert.equal(created.statusCode, 201); reservationId = created.json<any>().id; assert.equal(created.json<any>().status, 'REQUESTED')
    const mine = await app.inject({ method: 'GET', url: '/api/member/me/reservations', headers }); assert.equal(mine.statusCode, 200); assert.ok(mine.json<any[]>().some(item => item.id === reservationId))
    const conflict = await app.inject({ method: 'POST', url: '/api/member/me/reservations', headers, payload: { spaceId: space.id, reservationDate: date } }); assert.equal(conflict.statusCode, 409)
    const cancelled = await app.inject({ method: 'POST', url: `/api/member/me/reservations/${reservationId}/cancel`, headers: { authorization: `Bearer ${token}` } }); assert.equal(cancelled.statusCode, 200); assert.equal(cancelled.json<any>().status, 'CANCELLED')
    console.log('Member reservation smoke validated.')
  } finally {
    if (reservationId) await prisma.reservation.delete({ where: { id: reservationId } })
    await app.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
