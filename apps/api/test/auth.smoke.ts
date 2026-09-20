import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/core/auth/password.js'

const passwordHash = await hashPassword('senha-segura-de-teste')
const user = { id: 'user-1', active: true, mustChangePassword: false, passwordHash, personId: 'person-1', person: { id: 'person-1', fullName: 'Admin Teste', cpf: '52998224725', birthDate: null, email: 'admin@cisne.test', phone: null }, roles: [{ role: { name: 'ADMIN', permissions: [{ permission: { key: 'users.manage' } }] } }] }
;(prisma.person as any).findUnique = async ({ where }: any) => where.cpf === '52998224725' ? { ...user.person, user } : null
;(prisma.user as any).findUnique = async ({ where }: any) => where.id === 'user-1' ? user : null
;(prisma.user as any).update = async () => user

const { buildApp } = await import('../src/app.js')
const app = await buildApp()
const invalidLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf: '529.982.247-25', password: 'incorreta' } })
assert.equal(invalidLogin.statusCode, 401)
assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode, 401)
const validLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf: '52998224725', password: 'senha-segura-de-teste' } })
assert.equal(validLogin.statusCode, 200)
const { token } = validLogin.json<{ token: string }>()
assert.ok(token)
const authenticated = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } })
assert.equal(authenticated.statusCode, 200)
assert.equal(authenticated.json().user.name, 'Admin Teste')
assert.deepEqual(authenticated.json().user.permissions, ['users.manage'])
assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: 'Bearer token-invalido' } })).statusCode, 401)
await app.close()
console.log('Auth smoke validated.')
