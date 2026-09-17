import assert from 'node:assert/strict'

import { prisma } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/core/auth/password.js'

const password = 'senha-segura-de-teste'
const passwordHash = await hashPassword(password)

const userModel = prisma.user as unknown as {
  findUnique: (args: { where: { id?: string; cpf?: string } }) => Promise<unknown>
}

userModel.findUnique = async ({ where }) => {
  if (where.cpf) {
    return where.cpf === '52998224725'
      ? { id: 'user-1', name: 'Admin Teste', cpf: where.cpf, birthDate: null, email: 'admin@cisne.test', phone: null, mustChangePassword: false, active: true, passwordHash }
      : null
  }

  return where.id === 'user-1'
    ? {
        id: 'user-1',
        name: 'Admin Teste',
        email: 'admin@cisne.test',
        active: true,
        roles: [
          {
            role: {
              name: 'ADMIN',
              permissions: [{ permission: { key: 'users.manage' } }],
            },
          },
        ],
      }
    : null
}

const { buildApp } = await import('../src/app.js')
const app = await buildApp()

const invalidLogin = await app.inject({
  method: 'POST',
  url: '/api/auth/login',
  payload: { cpf: '529.982.247-25', password: 'incorreta' },
})
assert.equal(invalidLogin.statusCode, 401)

const noToken = await app.inject({ method: 'GET', url: '/api/auth/me' })
assert.equal(noToken.statusCode, 401)

const validLogin = await app.inject({
  method: 'POST',
  url: '/api/auth/login',
  payload: { cpf: '52998224725', password },
})
assert.equal(validLogin.statusCode, 200)
const { token } = validLogin.json<{ token: string }>()
assert.ok(token)

const authenticated = await app.inject({
  method: 'GET',
  url: '/api/auth/me',
  headers: { authorization: `Bearer ${token}` },
})
assert.equal(authenticated.statusCode, 200)
assert.equal(authenticated.json().user.name, 'Admin Teste')
assert.deepEqual(authenticated.json().user.permissions, ['users.manage'])

const invalidToken = await app.inject({
  method: 'GET',
  url: '/api/auth/me',
  headers: { authorization: 'Bearer token-invalido' },
})
assert.equal(invalidToken.statusCode, 401)

await app.close()
console.log('Autenticação validada: login válido/inválido, token ausente/válido/inválido e /api/auth/me.')
