// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { promises as fs } from 'node:fs'
import crypto from 'node:crypto'
import { prisma } from '../../../lib/prisma.js'
import { hashPassword } from '../auth/password.js'
import { normalizeCpf, normalizePhone } from '../auth/normalization.js'
import { personPhotosDirectory, personPhotoPath } from '../../../config/storage.js'

const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED']
const date = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(value + 'T00:00:00.000Z')
  return parsed.toISOString().slice(0, 10) === value ? parsed : null
}
const maskCpf = (cpf: string) => cpf.slice(0, 3) + '.' + cpf.slice(3, 6) + '.' + cpf.slice(6, 9) + '-' + cpf.slice(9)
const errorFor = (field: string, message: string) => ({ field, message })
const initialPassword = (value: Date) => {
  const parts = value.toISOString().slice(0, 10).split('-')
  return parts[2] + parts[1] + parts[0]
}
const include = {
  person: { include: { user: { select: { id: true, active: true, lastLoginAt: true } }, accessEvents: { where: { type: 'ENTRY' }, orderBy: { occurredAt: 'desc' }, take: 1 } } },
  category: true,
  titular: { include: { person: true, category: true } },
  dependentes: { include: { person: { include: { accessEvents: { where: { type: 'ENTRY' }, orderBy: { occurredAt: 'desc' }, take: 1 } } }, category: true } },
  charges: { where: { status: { in: ['PENDING', 'OVERDUE'] } }, orderBy: { dueDate: 'asc' }, take: 1 },
}
const view = (member: any) => ({
  ...member,
  person: { ...member.person, cpf: maskCpf(member.person.cpf), birthDate: member.person.birthDate?.toISOString().slice(0, 10) ?? null },
  admissionDate: member.admissionDate.toISOString().slice(0, 10),
  access: member.person.user ? { active: member.person.user.active, lastLoginAt: member.person.user.lastLoginAt } : null,
  financialResponsible: member.category.isDependent || member.category.requiresHolder ? member.titular ? { id: member.titular.id, name: member.titular.person.fullName } : null : { id: member.id, name: member.person.fullName },
  dependents: (member.dependentes ?? []).map((item: any) => ({ ...item, person: { ...item.person, cpf: maskCpf(item.person.cpf), birthDate: item.person.birthDate?.toISOString().slice(0, 10) ?? null } })),
})
async function hierarchy(categoryId: string, holderId: string | null, relationship: string | null, currentId?: string) {
  const category = await prisma.memberCategory.findUnique({ where: { id: categoryId } })
  if (!category) return 'Selecione um tipo de sócio.'
  const dependent = category.isDependent || category.requiresHolder
  if (dependent && !holderId) return 'Selecione o sócio titular.'
  if (dependent && !relationship?.trim()) return 'Informe o parentesco.'
  if (!dependent && holderId) return 'Somente modalidades dependentes podem possuir titular.'
  if (!holderId) return null
  if (holderId === currentId) return 'Um associado não pode ser titular de si mesmo.'
  const holder = await prisma.member.findUnique({ where: { id: holderId }, include: { category: true } })
  return !holder || holder.category.isDependent || holder.category.requiresHolder ? 'O titular selecionado deve ser um associado titular.' : null
}
async function ensureUser(personId: string, birthDate: Date) {
  const user = await prisma.user.upsert({ where: { personId }, update: {}, create: { personId, passwordHash: await hashPassword(initialPassword(birthDate)), mustChangePassword: true } })
  const role = await prisma.role.findUnique({ where: { name: 'SOCIO' } })
  if (role) await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } })
  return user
}
async function photo(request: any, reply: any) {
  const member = await prisma.member.findUnique({ where: { id: request.params.id } })
  if (!member) return reply.code(404).send({ message: 'Associado não encontrado.' })
  const part = await request.file().catch(() => null)
  if (!part) return reply.code(400).send({ message: 'Arquivo de foto obrigatório.' })
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as any)[part.mimetype]
  if (!ext) return reply.code(400).send({ message: 'Formato inválido. Use JPG, PNG ou WEBP.' })
  const buffer = await part.toBuffer()
  if (buffer.length > 5 * 1024 * 1024) return reply.code(413).send({ message: 'A foto deve ter no máximo 5 MB.' })
  await fs.mkdir(personPhotosDirectory, { recursive: true })
  const file = crypto.randomUUID() + '.' + ext
  await fs.writeFile(personPhotoPath(file), buffer)
  await prisma.person.update({ where: { id: member.personId }, data: { photoPath: '/uploads/person-photos/' + file } })
  return view(await prisma.member.findUniqueOrThrow({ where: { id: member.id }, include }))
}

export const memberRoutes: FastifyPluginAsync = async (app) => {
  app.get('/members/categories', { preHandler: app.requirePermission('members.view') }, async () => prisma.memberCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }))
  app.get('/member-categories', { preHandler: app.requirePermission('members.view') }, async () => prisma.memberCategory.findMany({ orderBy: { name: 'asc' } }))
  app.post('/member-categories', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const b = request.body ?? {}
    if (!b.name?.trim()) return reply.code(400).send(errorFor('name', 'Informe o nome do tipo de sócio.'))
    try { return reply.code(201).send(await prisma.memberCategory.create({ data: { name: b.name.trim(), description: b.description?.trim() || null, active: b.active !== false, isDependent: Boolean(b.isDependent), requiresHolder: Boolean(b.requiresHolder ?? b.isDependent), annualFeeAmount: b.annualFeeAmount ?? null } })) }
    catch (e: any) { if (e.code === 'P2002') return reply.code(409).send(errorFor('name', 'Este tipo de sócio já está cadastrado.')); throw e }
  })
  app.put('/member-categories/:id', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    try { return await prisma.memberCategory.update({ where: { id: request.params.id }, data: { name: request.body?.name?.trim(), description: request.body?.description?.trim() || null, active: request.body?.active !== false, isDependent: Boolean(request.body?.isDependent), requiresHolder: Boolean(request.body?.requiresHolder ?? request.body?.isDependent), annualFeeAmount: request.body?.annualFeeAmount ?? null } }) }
    catch { return reply.code(404).send({ message: 'Tipo de sócio não encontrado.' }) }
  })
  app.delete('/member-categories/:id', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    if (await prisma.member.count({ where: { categoryId: request.params.id } })) return reply.code(409).send({ message: 'Tipo de sócio utilizado; desative-o em vez de excluir.' })
    try { await prisma.memberCategory.delete({ where: { id: request.params.id } }); return { ok: true } } catch { return reply.code(404).send({ message: 'Tipo de sócio não encontrado.' }) }
  })
  app.get('/members/holders/search', { preHandler: app.requirePermission('members.view') }, async (request: any) => {
    const q = String(request.query?.q ?? '').trim()
    if (q.length < 2) return []
    const cpf = q.replace(/\D/g, '')
    const rows = await prisma.member.findMany({ where: { status: 'ACTIVE', category: { isDependent: false, requiresHolder: false }, OR: [{ person: { fullName: { contains: q, mode: 'insensitive' } } }, ...(cpf ? [{ person: { cpf: { contains: cpf } } }] : [])] }, include: { person: true }, orderBy: { person: { fullName: 'asc' } }, take: 8 })
    return rows.map((item: any) => ({ id: item.id, name: item.person.fullName, cpf: maskCpf(item.person.cpf) }))
  })
  app.post('/members/:id/photo', { preHandler: app.requirePermission('members.manage') }, photo)
  app.delete('/members/:id/photo', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findUnique({ where: { id: request.params.id } })
    if (!member) return reply.code(404).send({ message: 'Associado não encontrado.' })
    return prisma.person.update({ where: { id: member.personId }, data: { photoPath: null } })
  })
  app.get('/members', { preHandler: app.requirePermission('members.view') }, async (request: any) => {
    const q = request.query?.q?.trim()
    const cpf = q?.replace(/\D/g, '')
    const rows = await prisma.member.findMany({ where: { ...(request.query?.categoryId ? { categoryId: request.query.categoryId } : {}), ...(statuses.includes(request.query?.status) ? { status: request.query.status } : {}), ...(q ? { OR: [{ person: { fullName: { contains: q, mode: 'insensitive' } } }, ...(cpf ? [{ person: { cpf: { contains: cpf } } }] : []), { registrationNumber: { contains: q, mode: 'insensitive' } }] } : {}) }, include, orderBy: { person: { fullName: 'asc' } } })
    return rows.map(view)
  })
  app.get('/members/:id', { preHandler: app.requirePermission('members.view') }, async (request: any, reply) => {
    const row = await prisma.member.findUnique({ where: { id: request.params.id }, include })
    if (!row) return reply.code(404).send({ message: 'Associado não encontrado.' })
    return view(row)
  })
  app.post('/members', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const b = request.body ?? {}
    if (!b.fullName?.trim()) return reply.code(400).send(errorFor('fullName', 'Informe o nome completo.'))
    const cpf = normalizeCpf(b.cpf)
    if (!cpf) return reply.code(400).send(errorFor('cpf', 'Informe um CPF válido.'))
    const birthDate = date(b.birthDate)
    if (!birthDate) return reply.code(400).send(errorFor('birthDate', 'Informe uma data de nascimento válida.'))
    if (!b.categoryId) return reply.code(400).send(errorFor('categoryId', 'Selecione um tipo de sócio.'))
    const admissionDate = date(b.admissionDate)
    if (!admissionDate) return reply.code(400).send(errorFor('admissionDate', 'Informe uma data de ingresso válida.'))
    const hierarchyError = await hierarchy(b.categoryId, b.titularMemberId || null, b.relationship)
    if (hierarchyError) return reply.code(400).send(errorFor('titularMemberId', hierarchyError))
    if (await prisma.person.findUnique({ where: { cpf }, select: { id: true } })) return reply.code(409).send(errorFor('cpf', 'Este CPF já está cadastrado para outro sócio.'))
    try {
      const member = await prisma.$transaction(async (tx) => {
        const person = await tx.person.create({ data: { fullName: b.fullName.trim(), cpf, birthDate, phone: normalizePhone(b.phone), email: b.email?.trim().toLowerCase() || null, city: b.city?.trim() || null } })
        return tx.member.create({ data: { personId: person.id, categoryId: b.categoryId, titularMemberId: b.titularMemberId || null, relationship: b.relationship?.trim() || null, registrationNumber: b.registrationNumber?.trim() || null, admissionDate, status: b.status || 'ACTIVE', notes: b.notes?.trim() || null } })
      })
      await ensureUser(member.personId, birthDate)
      return reply.code(201).send(view(await prisma.member.findUniqueOrThrow({ where: { id: member.id }, include })))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(errorFor('cpf', 'CPF, e-mail ou matrícula já cadastrado.'))
      throw e
    }
  })
  app.put('/members/:id', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const b = request.body ?? {}
    const current = await prisma.member.findUnique({ where: { id: request.params.id }, include: { person: true } })
    if (!current) return reply.code(404).send({ message: 'Associado não encontrado.' })
    if (!b.fullName?.trim()) return reply.code(400).send(errorFor('fullName', 'Informe o nome completo.'))
    const cpf = normalizeCpf(b.cpf)
    if (!cpf) return reply.code(400).send(errorFor('cpf', 'Informe um CPF válido.'))
    const birthDate = date(b.birthDate)
    if (!birthDate) return reply.code(400).send(errorFor('birthDate', 'Informe uma data de nascimento válida.'))
    if (!b.categoryId) return reply.code(400).send(errorFor('categoryId', 'Selecione um tipo de sócio.'))
    const admissionDate = date(b.admissionDate)
    if (!admissionDate) return reply.code(400).send(errorFor('admissionDate', 'Informe uma data de ingresso válida.'))
    const hierarchyError = await hierarchy(b.categoryId, b.titularMemberId || null, b.relationship, current.id)
    if (hierarchyError) return reply.code(400).send(errorFor(hierarchyError.includes('titular') || hierarchyError.includes('parentesco') ? 'titularMemberId' : 'categoryId', hierarchyError))
    const owner = await prisma.person.findFirst({ where: { cpf, NOT: { id: current.personId } }, select: { member: { select: { id: true } } } })
    if (owner?.member) return reply.code(409).send(errorFor('cpf', 'Este CPF já está cadastrado para outro sócio.'))
    if (owner) return reply.code(409).send(errorFor('cpf', 'Este CPF já está cadastrado para outra pessoa.'))
    try {
      await prisma.$transaction([
        prisma.person.update({ where: { id: current.personId }, data: { fullName: b.fullName.trim(), cpf, birthDate, phone: normalizePhone(b.phone), email: b.email?.trim().toLowerCase() || null, city: b.city?.trim() || null } }),
        prisma.member.update({ where: { id: current.id }, data: { categoryId: b.categoryId, titularMemberId: b.titularMemberId || null, relationship: b.relationship?.trim() || null, registrationNumber: b.registrationNumber?.trim() || null, admissionDate, status: b.status, notes: b.notes?.trim() || null } }),
      ])
      await ensureUser(current.personId, birthDate)
      return view(await prisma.member.findUniqueOrThrow({ where: { id: current.id }, include }))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(errorFor('cpf', 'Este CPF, e-mail ou matrícula já está cadastrado.'))
      throw e
    }
  })
  app.post('/members/:id/status', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const status = request.body?.status
    if (!['ACTIVE', 'INACTIVE'].includes(status)) return reply.code(400).send(errorFor('status', 'Informe uma situação válida.'))
    const member = await prisma.member.findUnique({ where: { id: request.params.id }, include: { dependentes: { where: { status: { not: 'TERMINATED' } }, select: { id: true } }, person: { include: { user: { select: { id: true } } } } } })
    if (!member) return reply.code(404).send({ message: 'Associado não encontrado.' })
    if (status === 'INACTIVE' && member.dependentes.length) return reply.code(409).send(errorFor('status', 'Este sócio possui ' + member.dependentes.length + ' dependente(s). Resolva os vínculos antes da inativação.'))
    await prisma.$transaction([
      prisma.member.update({ where: { id: member.id }, data: { status } }),
      ...(status === 'INACTIVE' && member.person.user ? [prisma.user.update({ where: { id: member.person.user.id }, data: { active: false } })] : []),
    ])
    return view(await prisma.member.findUniqueOrThrow({ where: { id: member.id }, include }))
  })
  app.delete('/members/:id', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findUnique({ where: { id: request.params.id }, include: { dependentes: { select: { id: true } }, invitations: { select: { id: true } }, charges: { select: { id: true } }, responsibleCharges: { select: { id: true } }, reservations: { select: { id: true } }, person: { include: { accessEvents: { select: { id: true } }, user: { include: { _count: { select: { approvedReservations: true, announcements: true, events: true, accessEvents: true, paymentRegistrations: true } } } } } } } })
    if (!member) return reply.code(404).send({ message: 'Associado não encontrado.' })
    const history = member.dependentes.length + member.invitations.length + member.charges.length + member.responsibleCharges.length + member.reservations.length + member.person.accessEvents.length
    const userHistory = member.person.user?._count ? Object.values(member.person.user._count).reduce((sum: number, value: any) => sum + value, 0) : 0
    if (member.dependentes.length) return reply.code(409).send({ message: 'Este sócio possui ' + member.dependentes.length + ' dependente(s). Resolva os vínculos antes da exclusão.' })
    if (history || userHistory) return reply.code(409).send({ message: 'Este sócio possui histórico ou vínculos que precisam ser preservados. Use “Inativar sócio”.' })
    await prisma.$transaction(async (tx) => {
      if (member.person.user) {
        await tx.userRole.deleteMany({ where: { userId: member.person.user.id } })
        await tx.user.delete({ where: { id: member.person.user.id } })
      }
      await tx.member.delete({ where: { id: member.id } })
      await tx.person.delete({ where: { id: member.personId } })
    })
    return { ok: true }
  })
  app.post('/members/:id/access/toggle', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findUnique({ where: { id: request.params.id }, include: { person: true } })
    if (!member) return reply.code(404).send({ message: 'Associado não encontrado.' })
    const user = await ensureUser(member.personId, member.person.birthDate!)
    return prisma.user.update({ where: { id: user.id }, data: { active: request.body?.active !== false } })
  })
  app.post('/members/:id/access/reset-password', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findUnique({ where: { id: request.params.id }, include: { person: true } })
    if (!member?.person.birthDate) return reply.code(404).send({ message: 'Associado ou nascimento não encontrado.' })
    const user = await ensureUser(member.personId, member.person.birthDate)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(initialPassword(member.person.birthDate)), mustChangePassword: true, active: true } })
    return { ok: true, message: 'Senha redefinida para a data de nascimento.' }
  })
  app.get('/members/:id/dependents', { preHandler: app.requirePermission('members.view') }, async (request: any, reply) => {
    const row = await prisma.member.findUnique({ where: { id: request.params.id }, include })
    if (!row) return reply.code(404).send({ message: 'Associado não encontrado.' })
    return view(row).dependents
  })
  app.post('/members/:id/dependents', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const holder = await prisma.member.findUnique({ where: { id: request.params.id } })
    const category = await prisma.memberCategory.findFirst({ where: { isDependent: true } })
    const b = request.body ?? {}
    const birthDate = date(b.birthDate)
    const cpf = normalizeCpf(b.cpf)
    if (!holder || !category) return reply.code(404).send({ message: 'Titular ou tipo dependente não encontrado.' })
    if (!b.fullName?.trim()) return reply.code(400).send(errorFor('fullName', 'Informe o nome completo.'))
    if (!cpf) return reply.code(400).send(errorFor('cpf', 'Informe um CPF válido.'))
    if (!birthDate) return reply.code(400).send(errorFor('birthDate', 'Informe uma data de nascimento válida.'))
    if (!b.relationship?.trim()) return reply.code(400).send(errorFor('relationship', 'Informe o parentesco.'))
    const person = await prisma.person.create({ data: { fullName: b.fullName.trim(), cpf, birthDate, phone: normalizePhone(b.phone), city: b.city || null } })
    const member = await prisma.member.create({ data: { personId: person.id, categoryId: category.id, titularMemberId: holder.id, relationship: b.relationship.trim(), admissionDate: birthDate, status: b.active === false ? 'INACTIVE' : 'ACTIVE' } })
    await ensureUser(person.id, birthDate)
    return view(await prisma.member.findUniqueOrThrow({ where: { id: member.id }, include }))
  })
  app.put('/members/:id/dependents/:dependentId', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findFirst({ where: { id: request.params.dependentId, titularMemberId: request.params.id }, include: { person: true } })
    if (!member) return reply.code(404).send({ message: 'Dependente não encontrado.' })
    const b = request.body ?? {}
    const birthDate = date(b.birthDate)
    const cpf = normalizeCpf(b.cpf)
    if (!b.fullName?.trim()) return reply.code(400).send(errorFor('fullName', 'Informe o nome completo.'))
    if (!cpf) return reply.code(400).send(errorFor('cpf', 'Informe um CPF válido.'))
    if (!birthDate) return reply.code(400).send(errorFor('birthDate', 'Informe uma data de nascimento válida.'))
    await prisma.$transaction([
      prisma.person.update({ where: { id: member.personId }, data: { fullName: b.fullName.trim(), cpf, birthDate, phone: normalizePhone(b.phone), city: b.city || null } }),
      prisma.member.update({ where: { id: member.id }, data: { relationship: b.relationship, status: b.active === false ? 'INACTIVE' : 'ACTIVE' } }),
    ])
    return view(await prisma.member.findUniqueOrThrow({ where: { id: member.id }, include }))
  })
  app.delete('/members/:id/dependents/:dependentId', { preHandler: app.requirePermission('members.manage') }, async (request: any, reply) => {
    const member = await prisma.member.findFirst({ where: { id: request.params.dependentId, titularMemberId: request.params.id } })
    if (!member) return reply.code(404).send({ message: 'Dependente não encontrado.' })
    return prisma.member.update({ where: { id: member.id }, data: { status: 'INACTIVE' } })
  })
}
