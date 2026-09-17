import type { FastifyPluginAsync } from 'fastify'
import { env } from '../../../config/env.js'
import { prisma } from '../../../lib/prisma.js'
import { createAccessToken } from './jwt.js'
import { hashPassword, verifyPassword } from './password.js'
import { normalizeCpf } from './normalization.js'
import type { ChangePasswordBody, LoginBody } from './types.js'

const dummyPasswordHash = hashPassword('invalid-login-placeholder')

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const { cpf: rawCpf, password } = request.body ?? {}
    const cpf = normalizeCpf(rawCpf)
    if (!cpf || typeof password !== 'string' || !password) return reply.code(400).send({ message: 'CPF e senha são obrigatórios.' })
    const person = await prisma.person.findUnique({ where: { cpf }, include: { user: true } })
    const user = person?.user
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash))
    if (!user?.active || !passwordMatches) return reply.code(401).send({ message: 'CPF ou senha inválidos.' })
    return { token: createAccessToken(user.id, env.jwtSecret), expiresIn: 8 * 60 * 60 }
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => ({ user: request.authUser }))

  app.post<{ Body: ChangePasswordBody }>('/auth/password', { preHandler: app.authenticate }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body ?? {}
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12) return reply.code(400).send({ message: 'Informe a senha atual e uma nova senha com pelo menos 12 caracteres.' })
    const user = await prisma.user.findUnique({ where: { id: request.authUser!.id } })
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return reply.code(401).send({ message: 'Senha atual inválida.' })
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false } })
    return { ok: true }
  })
}
