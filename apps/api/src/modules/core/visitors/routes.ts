// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
import { normalizeCpf, normalizePhone } from '../auth/normalization.js'
import { getMemberInvitationQuota, invitationEligibilityMessage, monthBounds, parseCivilDate, quotaLockKey } from './quotas.js'

const mask = (v: string) => `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
const view = { person: true, invitations: { include: { sponsorMember: { include: { person: true, category: true } }, accessEvents: true }, orderBy: { scheduledDate: 'desc' } } }
const invitationView = { visitor: { include: { person: true } }, sponsorMember: { include: { person: true, category: true } } }
const displayVisitor = (v: any) => ({ ...v, person: { ...v.person, cpf: mask(v.person.cpf) }, visitsThisYear: v.invitations.filter((i: any) => i.status === 'USED' && i.usedAt && new Date(i.usedAt).getUTCFullYear() === new Date().getUTCFullYear()).length })
const date = (value: any) => parseCivilDate(value)
const memberForInvite = (id: string, db: any = prisma) => db.member.findUnique({ where: { id }, include: { person: true, category: true } })

async function createInvitation(input: any, db: any = prisma) {
  const scheduledDate = date(input.scheduledDate)
  if (!scheduledDate) { const error: any = new Error('Informe uma data de visita válida.'); error.statusCode = 400; throw error }
  const member = await memberForInvite(input.sponsorMemberId, db); const eligibility = invitationEligibilityMessage(member)
  if (eligibility) { const error: any = new Error(eligibility); error.statusCode = 400; throw error }
  const visitor = await db.visitor.findUnique({ where: { id: input.visitorId } })
  if (!visitor || !visitor.active) { const error: any = new Error('Visitante não encontrado ou inativo.'); error.statusCode = 400; throw error }
  if (visitor.blocked) { const error: any = new Error('Este visitante está bloqueado e não pode receber novos convites.'); error.statusCode = 400; throw error }
  const key = quotaLockKey(member.id, scheduledDate)
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`
  const quota = await getMemberInvitationQuota(member.id, scheduledDate, db)
  if (quota.used >= quota.limit) { const error: any = new Error('Limite mensal atingido. Este sócio já utilizou os 10 convites disponíveis neste mês.'); error.statusCode = 409; throw error }
  const duplicate = await db.visitorInvitation.findFirst({ where: { visitorId: visitor.id, sponsorMemberId: member.id, scheduledDate, status: { in: ['SCHEDULED', 'USED'] } } })
  if (duplicate) { const error: any = new Error('Este visitante já possui convite deste sócio para esta data.'); error.statusCode = 409; throw error }
  return db.visitorInvitation.create({ data: { visitorId: visitor.id, sponsorMemberId: member.id, scheduledDate, notes: input.notes?.trim() || null }, include: invitationView })
}

export const visitorRoutes: FastifyPluginAsync = async app => {
  app.get('/visitors', { preHandler: app.requirePermission('visitors.view') }, async (req: any) => {
    const q = String(req.query?.q || '').trim(); const status = String(req.query?.status || '')
    const digits = q.replace(/\D/g, '')
    const where: any = { ...(status === 'BLOCKED' ? { blocked: true } : status === 'ACTIVE' ? { blocked: false, active: true } : status === 'INACTIVE' ? { active: false } : {}), ...(q ? { OR: [{ person: { fullName: { contains: q, mode: 'insensitive' } } }, ...(digits ? [{ person: { cpf: { contains: digits } } }, { person: { phone: { contains: digits } } }] : [])] } : {}) }
    const rows = await prisma.visitor.findMany({ where, include: view, orderBy: { person: { fullName: 'asc' } } }); return rows.map(displayVisitor)
  })
  app.get('/visitors/:id', { preHandler: app.requirePermission('visitors.view') }, async (req: any, reply) => { const row = await prisma.visitor.findUnique({ where: { id: req.params.id }, include: view }); if (!row) return reply.code(404).send({ message: 'Visitante não encontrado.' }); return displayVisitor(row) })
  app.post('/visitors', { preHandler: app.requirePermission('visitors.manage') }, async (req: any, reply) => {
    const b = req.body || {}; const cpf = normalizeCpf(b.cpf); if (!b.fullName?.trim() || !cpf || !b.phone?.trim() || !b.city?.trim()) return reply.code(400).send({ message: 'Nome, CPF, telefone e cidade são obrigatórios.' })
    try {
      const existing = await prisma.person.findUnique({ where: { cpf }, include: { visitor: true } }); if (existing) return reply.code(409).send({ message: existing.visitor ? 'Já existe um visitante cadastrado com este CPF.' : 'Já existe uma pessoa cadastrada com este CPF.' })
      const person = await prisma.person.create({ data: { fullName: b.fullName.trim(), cpf, phone: normalizePhone(b.phone), city: b.city.trim(), email: b.email?.trim().toLowerCase() || null, birthDate: b.birthDate ? date(b.birthDate) : null } })
      return reply.code(201).send(await prisma.visitor.create({ data: { personId: person.id, notes: b.notes?.trim() || null }, include: { person: true } }))
    } catch (e: any) { if (e.code === 'P2002') return reply.code(409).send({ message: 'CPF ou e-mail já cadastrado.' }); throw e }
  })
  app.put('/visitors/:id', { preHandler: app.requirePermission('visitors.manage') }, async (req: any, reply) => {
    const v = await prisma.visitor.findUnique({ where: { id: req.params.id } }); const b = req.body || {}; const cpf = normalizeCpf(b.cpf); if (!v) return reply.code(404).send({ message: 'Visitante não encontrado.' }); if (!b.fullName?.trim() || !cpf || !b.phone?.trim() || !b.city?.trim()) return reply.code(400).send({ message: 'Nome, CPF, telefone e cidade são obrigatórios.' })
    const owner = await prisma.person.findUnique({ where: { cpf } }); if (owner && owner.id !== v.personId) return reply.code(409).send({ message: 'Este CPF já está cadastrado para outra pessoa.' })
    try { const person = await prisma.person.update({ where: { id: v.personId }, data: { fullName: b.fullName.trim(), cpf, phone: normalizePhone(b.phone), city: b.city.trim(), email: b.email?.trim().toLowerCase() || null, birthDate: b.birthDate ? date(b.birthDate) : null } }); return prisma.visitor.update({ where: { id: v.id }, data: { notes: b.notes?.trim() || null }, include: { person } }) } catch (e: any) { if (e.code === 'P2002') return reply.code(409).send({ message: 'CPF ou e-mail já cadastrado.' }); throw e }
  })
  app.post('/visitors/:id/block', { preHandler: app.requirePermission('visitors.manage') }, async (req: any, reply) => { const v = await prisma.visitor.findUnique({ where: { id: req.params.id } }); if (!v) return reply.code(404).send({ message: 'Visitante não encontrado.' }); return prisma.visitor.update({ where: { id: v.id }, data: { blocked: !v.blocked } }) })
  app.get('/invitations', { preHandler: app.requirePermission('visitors.view') }, async (req: any) => {
    const month = String(req.query?.month || ''); const from = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00.000Z`) : null; const bounds = from ? monthBounds(from) : null; const where: any = { ...(bounds ? { scheduledDate: { gte: bounds.start, lt: bounds.end } } : {}), ...(req.query?.status ? { status: req.query.status } : {}), ...(req.query?.sponsorMemberId ? { sponsorMemberId: req.query.sponsorMemberId } : {}), ...(req.query?.visitorId ? { visitorId: req.query.visitorId } : {}) }
    const q = String(req.query?.q || '').trim(); if (q) { const digits = q.replace(/\D/g, ''); where.OR = [{ visitor: { person: { fullName: { contains: q, mode: 'insensitive' } } } }, { sponsorMember: { person: { fullName: { contains: q, mode: 'insensitive' } } } }, ...(digits ? [{ visitor: { person: { cpf: { contains: digits } } } }] : [])] }
    const rows = await prisma.visitorInvitation.findMany({ where, include: invitationView, orderBy: { scheduledDate: 'desc' } }); const summary = { total: rows.length, used: rows.filter(i => i.status === 'USED').length, pending: rows.filter(i => i.status === 'SCHEDULED').length, cancelled: rows.filter(i => i.status === 'CANCELLED').length }; return { rows, summary }
  })
  app.get('/members/:id/invitations/quota', { preHandler: app.requirePermission('visitors.view') }, async (req: any) => getMemberInvitationQuota(req.params.id, parseCivilDate(`${req.query?.year || new Date().getUTCFullYear()}-${String(req.query?.month || new Date().getUTCMonth() + 1).padStart(2, '0')}-01`) || new Date()))
  app.get('/members/:id/invitations', { preHandler: app.requirePermission('visitors.view') }, async (req: any) => prisma.visitorInvitation.findMany({ where: { sponsorMemberId: req.params.id }, include: invitationView, orderBy: { scheduledDate: 'desc' } }))
  app.post('/invitations', { preHandler: app.requirePermission('visitors.manage') }, async (req: any, reply) => { try { return reply.code(201).send(await prisma.$transaction(tx => createInvitation(req.body || {}, tx))) } catch (e: any) { return reply.code(e.statusCode || 500).send({ message: e.message || 'Não foi possível criar o convite.' }) } })
  app.post('/invitations/:id/cancel', { preHandler: app.requirePermission('visitors.manage') }, async (req: any, reply) => { const i = await prisma.visitorInvitation.findUnique({ where: { id: req.params.id } }); if (!i) return reply.code(404).send({ message: 'Convite não encontrado.' }); if (i.status === 'USED') return reply.code(409).send({ message: 'Convite já utilizado não pode ser cancelado.' }); if (i.status === 'CANCELLED') return i; return prisma.visitorInvitation.update({ where: { id: i.id }, data: { status: 'CANCELLED' }, include: invitationView }) })
}

export { createInvitation }
