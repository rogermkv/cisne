import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../../../config/env.js'
import { prisma } from '../../../lib/prisma.js'
import { verifyAccessToken } from './jwt.js'
import type { AuthenticatedUser } from './types.js'

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>
    requirePermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>
  }
}

const unauthorized = (reply: FastifyReply) =>
  reply.code(401).send({ message: 'Autenticação necessária.' })

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('authUser', null)

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) return unauthorized(reply)

    const payload = verifyAccessToken(authorization.slice(7), env.jwtSecret)

    if (!payload) return unauthorized(reply)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        person: { select: { fullName: true, cpf: true, birthDate: true, email: true, phone: true } },
        mustChangePassword: true,
        active: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    })

    if (!user?.active) return unauthorized(reply)

    request.authUser = {
      id: user.id,
      name: user.person.fullName,
      cpf: user.person.cpf,
      birthDate: user.person.birthDate?.toISOString() ?? null,
      email: user.person.email,
      phone: user.person.phone,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map(({ role }) => role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.key),
          ),
        ),
      ],
    }
  })

  app.decorate('requirePermission', (permission: string) => async (request, reply) => {
    await app.authenticate(request, reply)

    if (reply.sent) return

    if (request.authUser?.mustChangePassword) {
      return reply.code(403).send({ message: 'Altere sua senha antes de continuar.' })
    }

    if (!request.authUser?.permissions.includes(permission)) {
      return reply.code(403).send({ message: 'Você não tem permissão para esta operação.' })
    }
  })
}
