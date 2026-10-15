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
        person: { select: { id: true, fullName: true, cpf: true, birthDate: true, email: true, phone: true } },
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

    const assignedRoles = user.roles.map(({ role }) => role.name)
    // Legacy tokens with multiple roles must choose; never combine permissions.
    const activeRole = payload.activeRole
      ? assignedRoles.includes(payload.activeRole) ? payload.activeRole : null
      : assignedRoles.length === 1 ? assignedRoles[0] : null
    const effectiveRoles = user.roles.filter(({ role }) => role.name === activeRole)
    request.authUser = {
      id: user.id,
      personId: user.person.id,
      name: user.person.fullName,
      cpf: user.person.cpf,
      birthDate: user.person.birthDate?.toISOString() ?? null,
      email: user.person.email,
      phone: user.person.phone,
      mustChangePassword: user.mustChangePassword,
      assignedRoles,
      activeRole,
      roles: activeRole ? [activeRole] : [],
      permissions: [
        ...new Set(
          effectiveRoles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.key),
          ),
        ),
      ],
    }
    const path = request.url.split('?')[0]
    if (!['/api/auth/me', '/api/auth/password', '/api/auth/role', '/api/auth/logout'].includes(path)) {
      if (user.mustChangePassword) return reply.code(403).send({ message: 'Altere sua senha antes de continuar.' })
      if (!activeRole) return reply.code(403).send({ message: 'Selecione um papel para continuar.' })
      if (path.startsWith('/api/member/') && activeRole !== 'SOCIO') return reply.code(403).send({ message: 'Selecione o papel Sócio para acessar esta área.' })
    }
  })

  app.decorate('requirePermission', (permission: string) => async (request, reply) => {
    await app.authenticate(request, reply)

    if (reply.sent) return

    if (request.authUser?.mustChangePassword) {
      return reply.code(403).send({ message: 'Altere sua senha antes de continuar.' })
    }

    if (permission === 'members.manage' && request.method !== 'GET' && request.authUser?.activeRole !== 'ADMIN') {
      const id = (request.params as { id?: string })?.id
      if (id && request.url.startsWith('/api/members/')) {
        const managed = await prisma.member.findUnique({ where: { id }, select: { person: { select: { user: { select: { roles: { select: { role: { select: { name: true } } } } } } } } } })
        if (managed?.person.user?.roles.some(r => r.role.name !== 'SOCIO')) return reply.code(403).send({ message: 'Somente o Administrador pode alterar uma conta com papel administrativo.' })
      }
    }
    if (request.authUser?.activeRole === 'SOCIO' || !request.authUser?.permissions.includes(permission)) {
      return reply.code(403).send({ message: 'Você não tem permissão para esta operação.' })
    }
  })
}
