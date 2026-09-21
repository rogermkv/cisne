// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
import { resolveFinancialResponsibleMemberId } from '../members/domain.js'

const serialize = (charge: any) => {
  const payments = charge.payments?.map((p: any) => ({ ...p, amount: Number(p.amount) })) ?? []
  const amount = Number(charge.amount)
  const paidAmount = payments.reduce((total: number, payment: any) => total + payment.amount, 0)
  return { ...charge, amount, paidAmount, balance: Math.max(0, amount - paidAmount), payments }
}
const effectiveStatus = (charge: any) => {
  if (charge.status !== 'PENDING') return charge.status
  const due = new Date(charge.dueDate)
  const overdueAt = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1)
  return overdueAt <= Date.now() ? 'OVERDUE' : 'PENDING'
}
const chargeInclude = { member: { include: { person: true, category: true, titular: { include: { person: true } } } }, responsibleMember: { include: { person: true } }, payments: { orderBy: { paidAt: 'desc' }, include: { registeredBy: { select: { id: true, person: { select: { fullName: true } } } } } } }

export const financeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/member/me/finance', { preHandler: app.authenticate }, async (request: any, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.authUser.id }, include: { person: { include: { member: true } } } })
    if (!user?.person.member) return reply.code(403).send({ message: 'Área disponível apenas para associados.' })
    const responsibleId = await resolveFinancialResponsibleMemberId(user.person.member.id)
    const charges = await prisma.financialCharge.findMany({ where: { responsibleMemberId: responsibleId ?? undefined }, include: { payments: true }, orderBy: { dueDate: 'desc' } })
    const rows = charges.map((c) => ({ ...serialize(c), status: effectiveStatus(c) }))
    const nextCharge = rows.filter((c) => ['PENDING', 'OVERDUE'].includes(c.status)).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0] ?? null
    return { responsible: user.person.member.titularMemberId ? { memberId: responsibleId } : { memberId: user.person.member.id }, status: rows.some((c) => c.status === 'OVERDUE') ? 'OVERDUE' : rows.some((c) => c.status === 'PENDING') ? 'PENDING' : 'PAID', nextCharge, history: rows }
  })
  app.get('/finance/charges', { preHandler: app.requirePermission('finance.view') }, async (request: any) => { const rows = await prisma.financialCharge.findMany({ include: chargeInclude, orderBy: { dueDate: 'desc' } }); const status = request.query?.status; return rows.map((c) => ({ ...serialize(c), status: effectiveStatus(c), member: { ...c.member, person: { ...c.member.person, cpfMasked: `${c.member.person.cpf.slice(0, 3)}.***.***-**` } } })).filter((c) => !status || c.status === status) })
  app.get('/finance/dashboard', { preHandler: app.requirePermission('finance.view') }, async (request: any) => {
    const from = request.query?.from ? new Date(request.query.from) : new Date(new Date().getFullYear(), 0, 1)
    const to = request.query?.to ? new Date(`${request.query.to}T23:59:59.999Z`) : new Date()
    const charges = await prisma.financialCharge.findMany({ include: { payments: true, responsibleMember: { include: { person: true } } } })
    const active = charges.filter((c) => c.status !== 'CANCELLED')
    const normalized = active.map((c) => ({ ...serialize(c), status: effectiveStatus(c), responsibleMemberId: c.responsibleMemberId }))
    const overdue = normalized.filter((c) => c.status === 'OVERDUE')
    const payments = active.flatMap((c) => c.payments).filter((p) => new Date(p.paidAt) >= from && new Date(p.paidAt) <= to)
    const pending = normalized.filter((c) => ['PENDING', 'OVERDUE'].includes(c.status))
    const byDay = new Map<string, number>()
    for (const p of payments) {
      const day = new Date(p.paidAt).toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) || 0) + Number(p.amount))
    }
    return { totalToReceive: pending.reduce((s, c) => s + c.balance, 0), totalReceived: payments.reduce((s, p) => s + Number(p.amount), 0), totalOverdue: overdue.reduce((s, c) => s + c.balance, 0), membersWithPending: new Set(pending.map((c) => c.responsibleMemberId)).size, receivedByDay: [...byDay].map(([date, total]) => ({ date, total })), nextDue: pending.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 10) }
  })
  app.post('/finance/charges', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => { const b = request.body ?? {}; const amount = Number(b.amount); const dueDate = typeof b.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? new Date(`${b.dueDate}T00:00:00.000Z`) : new Date('invalid'); const referenceYear = Number(b.referenceYear); const responsible = await resolveFinancialResponsibleMemberId(b.memberId); if (!responsible) return reply.code(400).send({ message: 'Associado inválido.' }); if (!b.description?.trim() || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueDate.getTime()) || !Number.isInteger(referenceYear) || referenceYear < 1900 || referenceYear > 9999) return reply.code(400).send({ message: 'Informe descrição, valor positivo, vencimento válido e ano de referência.' }); return reply.code(201).send(await prisma.financialCharge.create({ data: { memberId: b.memberId, responsibleMemberId: responsible, type: b.type || 'OTHER', description: b.description.trim(), referenceYear, amount, dueDate, status: 'PENDING' }, include: chargeInclude })) })
  app.post('/finance/charges/:id/payments', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => { const charge = await prisma.financialCharge.findUnique({ where: { id: request.params.id }, include: { payments: true } }); if (!charge) return reply.code(404).send({ message: 'Cobrança não encontrada.' }); if (charge.status === 'CANCELLED' || charge.status === 'PAID') return reply.code(400).send({ message: 'Esta cobrança não está disponível para pagamento.' }); const paid = charge.payments.reduce((s, p) => s + Number(p.amount), 0); const balance = Number(charge.amount) - paid; const amount = Number(request.body?.amount); const methods = ['PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']; if (!Number.isFinite(amount) || amount <= 0 || amount > balance + 0.001) return reply.code(400).send({ message: `O valor deve ser positivo e não pode ultrapassar o saldo de ${balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` }); if (!methods.includes(request.body?.method)) return reply.code(400).send({ message: 'Informe uma forma de pagamento válida.' }); const payment = await prisma.financialPayment.create({ data: { chargeId: charge.id, amount, paidAt: request.body?.paidAt ? new Date(request.body.paidAt) : new Date(), method: request.body.method, notes: request.body?.notes || null, registeredByUserId: request.authUser.id } }); const total = paid + amount; if (total >= Number(charge.amount) - 0.001) await prisma.financialCharge.update({ where: { id: charge.id }, data: { status: 'PAID', paidAt: payment.paidAt } }); return serialize(payment) })
}
