import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

const roleNames = ['ADMIN', 'SECRETARIA', 'FUNCIONARIO', 'SOCIO']
const failure = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode })
export const administrationRoutes: FastifyPluginAsync = async app => {
  const admin = async (request: any, reply: any) => {
    await app.authenticate(request, reply)
    if (reply.sent) return
    if (request.authUser?.mustChangePassword || request.authUser?.activeRole !== 'ADMIN') return reply.code(403).send({ message: 'Esta área exige o papel Administrador ativo.' })
  }
  app.get('/administration/roles', { preHandler: admin }, async () => {
    const roles = await prisma.role.findMany({ where: { name: { in: roleNames } }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: 'asc' } })
    return roles.map(r => ({ name: r.name, users: r._count.users, permissions: r.permissions.map(p => p.permission.key).sort() }))
  })
  app.get<{ Querystring: { q?: string; role?: string; page?: string } }>('/administration/users', { preHandler: admin }, async (request, reply) => {
    const q = (request.query.q || '').trim().slice(0,100)
    const role = request.query.role
    if (role && !roleNames.includes(role)) return reply.code(400).send({ message: 'Papel inválido.' })
    const page = Math.max(1, Math.min(100000, Number.parseInt(request.query.page || '1', 10) || 1))
    const where = { ...(role ? { roles: { some: { role: { name: role } } } } : {}), ...(q ? { person: { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { member: { registrationNumber: { contains: q } } }] } } : {}) }
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, skip: (page-1)*25, take: 25, orderBy: [{ person: { fullName: 'asc' } }, { id: 'asc' }], select: { id: true, active: true, lastLoginAt: true, mustChangePassword: true, roles: { select: { role: { select: { name: true } } } }, person: { select: { fullName: true, member: { select: { registrationNumber: true } } } } } }),
    ])
    return { total, page, pageSize: 25, users: users.map(u => ({ id: u.id, name: u.person.fullName, registrationNumber: u.person.member?.registrationNumber || null, isMember: !!u.person.member, active: u.active, mustChangePassword: u.mustChangePassword, lastLoginAt: u.lastLoginAt, roles: u.roles.map(r => r.role.name).sort() })) }
  })
  app.put<{ Params: { id: string }; Body: { roles?: unknown; active?: unknown } }>('/administration/users/:id', { preHandler: admin }, async (request, reply) => {
    const roles = request.body?.roles
    const active = request.body?.active
    if (!Array.isArray(roles) || !roles.length || roles.some(r => typeof r !== 'string' || !roleNames.includes(r)) || new Set(roles).size !== roles.length || typeof active !== 'boolean') return reply.code(400).send({ message: 'Selecione pelo menos um papel válido e informe a situação da conta.' })
    try {
      return await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(715102026)`
        const actor = await tx.user.findFirst({ where: { id: request.authUser!.id, active: true, roles: { some: { role: { name: 'ADMIN' } } } } })
        if (!actor) throw failure(403, 'Seu acesso administrativo foi revogado.')
        const user = await tx.user.findUnique({ where: { id: request.params.id }, include: { roles: { include: { role: true } }, person: { select: { member: { select: { id: true } } } } } })
        if (!user) throw failure(404, 'Usuário não encontrado.')
        if (roles.includes('SOCIO') && !user.person.member) throw failure(400, 'O papel Sócio exige um cadastro de associado vinculado.')
        if (user.active && user.roles.some(r => r.role.name === 'ADMIN') && (!active || !roles.includes('ADMIN'))) {
          const others = await tx.user.count({ where: { id: { not: user.id }, active: true, roles: { some: { role: { name: 'ADMIN' } } } } })
          if (!others) throw failure(409, 'Mantenha pelo menos um administrador ativo.')
        }
        const before = { active: user.active, roles: user.roles.map(r => r.role.name).sort() }
        const after = { active, roles: [...roles].sort() as string[] }
        if (JSON.stringify(before) === JSON.stringify(after)) return { ok: true, changed: false }
        const selected = await tx.role.findMany({ where: { name: { in: roles as string[] } } })
        if (selected.length !== roles.length) throw failure(409, 'Papel indisponível no cadastro do sistema.')
        // Keep retained assignments: deleting and recreating ADMIN would trip the last-admin invariant.
        await tx.userRole.deleteMany({ where: { userId: user.id, roleId: { notIn: selected.map(r => r.id) } } })
        await tx.userRole.createMany({ data: selected.map(r => ({ userId: user.id, roleId: r.id })), skipDuplicates: true })
        await tx.user.update({ where: { id: user.id }, data: { active } })
        await tx.accessAudit.create({ data: { actorId: request.authUser!.id, targetUserId: user.id, action: 'ACCESS_UPDATED', before, after } })
        return { ok: true, changed: true }
      })
    } catch (error: any) {
      if (error.statusCode) return reply.code(error.statusCode).send({ message: error.message })
      throw error
    }
  })
  app.get<{ Querystring: { page?: string } }>('/administration/audit', { preHandler: admin }, async request => {
    const page = Math.max(1, Math.min(100000, Number.parseInt(request.query.page || '1',10) || 1))
    const [total, records] = await prisma.$transaction([prisma.accessAudit.count(), prisma.accessAudit.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page-1)*25, take: 25 })])
    const ids = [...new Set(records.flatMap(r => [r.actorId, r.targetUserId]))]
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, person: { select: { fullName: true } } } })
    const names = new Map(users.map(u => [u.id,u.person.fullName]))
    return { total, page, pageSize: 25, records: records.map(r => ({ ...r, actorName: names.get(r.actorId) || 'Conta removida', targetName: names.get(r.targetUserId) || 'Conta removida' })) }
  })
}
