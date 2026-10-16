// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { annualChargeInclude } from '../annualities/routes.js'
import { recordPayment, fail, lockCharge } from '../annualities/payments.js'
import { prisma } from '../../../lib/prisma.js'
import { resolveFinancialResponsibleMemberId } from '../members/domain.js'
import { effectiveFinancialStatus, financialAmounts, summarizeFinancialPortfolio, summarizeOverdueAnnualInstallments } from './status.js'

const annualDescription = (charge: any) => {
  if (charge.type !== 'ANNUAL_FEE' || typeof charge.description !== 'string') return charge.description
  const year = charge.annualEnrollment?.season?.endYear || charge.referenceYear
  return year ? charge.description.replace(/(Anuidade\s+)\d{4}\/\d{4}/i, `$1${year}`) : charge.description
}
const serialize = (charge: any) => {
  const payments = charge.payments?.map((p: any) => ({ ...p, amount: Number(p.amount) })) ?? []
  return { ...charge, description: annualDescription(charge), ...financialAmounts({ ...charge, payments }), payments }
}
const effectiveStatus = effectiveFinancialStatus
const chargeInclude = { ...annualChargeInclude, member: { include: { person: true, category: true, titular: { include: { person: true } } } }, responsibleMember: { include: { person: true } }, payments: { orderBy: { paidAt: 'desc' }, include: { registeredBy: { select: { id: true, person: { select: { fullName: true } } } } } } }
const civilDate = (value: any) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null

export const financeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/member/me/finance', { preHandler: app.authenticate }, async (request: any, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.authUser.id }, include: { person: { include: { member: true } } } })
    if (!user?.person.member) return reply.code(403).send({ message: 'Área disponível apenas para associados.' })
    const responsibleId = await resolveFinancialResponsibleMemberId(user.person.member.id)
    const charges = await prisma.financialCharge.findMany({ where: { responsibleMemberId: responsibleId ?? undefined }, include: { payments: true, ...annualChargeInclude }, orderBy: { dueDate: 'desc' } })
    const rows = charges.map((c) => ({ ...serialize(c), status: effectiveStatus(c) }))
    const nextCharge = rows.filter((c) => ['PENDING', 'OVERDUE', 'PARTIAL'].includes(c.status)).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0] ?? null
    return { responsible: user.person.member.titularMemberId ? { memberId: responsibleId } : { memberId: user.person.member.id }, status: rows.some((c) => c.status === 'OVERDUE') ? 'OVERDUE' : rows.some((c) => ['PENDING', 'PARTIAL'].includes(c.status)) ? 'PENDING' : 'PAID', nextCharge, history: rows }
  })
  app.get('/finance/charges', { preHandler: app.requirePermission('finance.view') }, async (request: any, reply) => {
    const memberId = request.query?.memberId
    let responsibleMemberId: string | undefined
    if (memberId !== undefined) {
      if (typeof memberId !== 'string' || !memberId.trim()) return reply.code(400).send({ message: 'Informe um associado válido.' })
      responsibleMemberId = await resolveFinancialResponsibleMemberId(memberId)
      if (!responsibleMemberId) return reply.code(404).send({ message: 'Associado ou responsável financeiro não encontrado.' })
    }
    const rows = await prisma.financialCharge.findMany({ where: responsibleMemberId ? { responsibleMemberId } : {}, include: chargeInclude, orderBy: [{ dueDate: 'desc' }, { id: 'asc' }] }); const status = request.query?.status; return rows.map((c) => ({ ...serialize(c), status: effectiveStatus(c), member: { ...c.member, person: { ...c.member.person, cpfMasked: `${c.member.person.cpf.slice(0, 3)}.***.***-**` } } })).filter((c) => !status || c.status === status) })
  app.get('/finance/dashboard', { preHandler: app.requirePermission('finance.view') }, async (request: any) => {
    const from = request.query?.from ? new Date(request.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = request.query?.to ? new Date(`${request.query.to}T23:59:59.999Z`) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999)
    const charges = await prisma.financialCharge.findMany({ include: { payments: true, responsibleMember: { include: { person: true } } } })
    const active = charges.filter((c) => c.status !== 'CANCELLED')
    const normalized = active.map((c) => ({ ...serialize(c), status: effectiveStatus(c), responsibleMemberId: c.responsibleMemberId }))
    const overdue = normalized.filter((c) => c.status === 'OVERDUE')
    const payments = active.flatMap((c) => c.payments).filter((p) => !p.reversedAt && new Date(p.paidAt) >= from && new Date(p.paidAt) <= to)
    const pending = normalized.filter((c) => ['PENDING', 'OVERDUE', 'PARTIAL'].includes(c.status))
    const byDay = new Map<string, number>()
    for (const p of payments) {
      const day = new Date(p.paidAt).toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) || 0) + Number(p.amount))
    }
    const today = new Date(); const startToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); const end30 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 30, 23, 59, 59, 999)); const dueSoon = pending.filter(c => new Date(c.dueDate) >= startToday && new Date(c.dueDate) <= end30)
    const overdueInstallmentAccounts = summarizeOverdueAnnualInstallments(normalized)
    return { totalToReceive: pending.reduce((s, c) => s + c.balance, 0), openCount: pending.length, totalReceived: payments.reduce((s, p) => s + Number(p.amount), 0), receivedCount: payments.length, totalOverdue: overdue.reduce((s, c) => s + c.balance, 0), overdueCount: overdue.length, dueSoon: dueSoon.reduce((s, c) => s + c.balance, 0), dueSoonCount: dueSoon.length, membersWithPending: new Set(pending.map((c) => c.responsibleMemberId)).size, receivedByDay: [...byDay].map(([date, total]) => ({ date, total })), nextDue: pending.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 10), overdueInstallmentAccounts, overdueInstallmentCount: overdueInstallmentAccounts.reduce((sum, item) => sum + item.overdueCount, 0), ...summarizeFinancialPortfolio(normalized) }
  })
  app.get('/finance/overdue-installments', { preHandler: app.requirePermission('finance.view') }, async () => {
    const charges = await prisma.financialCharge.findMany({
      where: { type: 'ANNUAL_FEE', annualEnrollmentId: { not: null }, installmentNumber: { not: null }, status: { not: 'CANCELLED' } },
      include: { payments: true, responsibleMember: { include: { person: true } } },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    })
    const accounts = summarizeOverdueAnnualInstallments(charges)
    return { accounts, installmentCount: accounts.reduce((sum, item) => sum + item.overdueCount, 0), total: accounts.reduce((sum, item) => sum + item.overdueTotal, 0) }
  })
  app.post('/finance/charges', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => { const b = request.body ?? {}; const amount = Number(b.amount); const dueDate = typeof b.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? new Date(`${b.dueDate}T00:00:00.000Z`) : new Date('invalid'); const referenceYear = Number(b.referenceYear); const responsible = await resolveFinancialResponsibleMemberId(b.memberId); if (!responsible) return reply.code(400).send({ message: 'Associado inválido.' }); if (!b.description?.trim() || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueDate.getTime()) || !Number.isInteger(referenceYear) || referenceYear < 1900 || referenceYear > 9999) return reply.code(400).send({ message: 'Informe descrição, valor positivo, vencimento válido e ano de referência.' }); return prisma.$transaction(async () => { await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`annual:${responsible}:${referenceYear}`}))`; if ((b.type || 'OTHER') === 'ANNUAL_FEE' && await prisma.annualEnrollment.findFirst({ where: { responsibleMemberId: responsible, season: { endYear: referenceYear } } })) fail(409, 'Esta conta já possui uma anuidade parcelada nesta temporada.'); return reply.code(201).send(await prisma.financialCharge.create({ data: { memberId: b.memberId, responsibleMemberId: responsible, type: b.type || 'OTHER', description: b.description.trim(), referenceYear, amount, dueDate, status: 'PENDING' }, include: chargeInclude })) }) })
  app.post('/finance/charges/:id/payments', { preHandler: app.requirePermission('finance.manage') }, async (request: any) => prisma.$transaction(() => recordPayment(request.params.id, request.body || {}, request.authUser)))
  const secretary = async (request: any, reply: any) => {
    await app.authenticate(request, reply)
    if (!reply.sent && request.authUser.activeRole !== 'SECRETARIA') return reply.code(403).send({ message: 'Somente a Secretaria pode corrigir pagamentos.' })
  }
  const reversalReason = (body: any) => {
    if (typeof body?.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) fail(400, 'Informe o motivo do estorno, com até 1000 caracteres.')
    return body.reason.trim()
  }
  app.post('/finance/charges/:id/payments/:paymentId/reverse', { preHandler: secretary }, async (request: any) => prisma.$transaction(async () => {
    const reason = reversalReason(request.body)
    const charge = await lockCharge(request.params.id)
    const payment = charge.payments.find((row: any) => row.id === request.params.paymentId)
    if (!payment) fail(404, 'Pagamento não encontrado nesta cobrança.')
    if (payment.reversedAt) fail(409, 'Este pagamento já foi estornado. Atualize o financeiro.')
    if (charge.status === 'CANCELLED') fail(409, 'Uma cobrança cancelada não pode ter pagamentos alterados.')
    if (financialAmounts(charge).paymentHistoryIncomplete) fail(409, 'Desfaça primeiro a quitação antiga sem recibo completo; os recebimentos individuais serão preservados.')
    await prisma.financialPayment.update({ where: { id: payment.id }, data: { reversedAt: new Date(), reversedByUserId: request.authUser.id, reversalReason: reason } })
    const remaining = charge.payments.filter((row: any) => row.id !== payment.id && !row.reversedAt)
    const paid = remaining.reduce((sum: number, row: any) => sum + Math.round(Number(row.amount) * 100), 0)
    await prisma.financialCharge.update({ where: { id: charge.id }, data: { status: paid >= Math.round(Number(charge.amount) * 100) ? 'PAID' : 'PENDING', paidAt: paid >= Math.round(Number(charge.amount) * 100) ? remaining.sort((a: any,b: any) => +b.paidAt - +a.paidAt)[0]?.paidAt : null } })
    await prisma.financialDocument.updateMany({ where: { chargeId: charge.id, paymentId: payment.id, kind: 'PROOF', status: 'APPROVED' }, data: { status: 'REJECTED', rejectionReason: 'Pagamento estornado: ' + reason, reviewedAt: new Date(), reviewedByUserId: request.authUser.id } })
    return { reversed: true }
  }))
  app.post('/finance/charges/:id/reopen-settlement', { preHandler: secretary }, async (request: any) => prisma.$transaction(async () => {
    const reason = reversalReason(request.body)
    const charge = await lockCharge(request.params.id)
    if (charge.status !== 'PAID' || !financialAmounts(charge).paymentHistoryIncomplete) fail(409, 'Esta cobrança não possui quitação antiga sem recibo para desfazer.')
    return prisma.financialCharge.update({ where: { id: charge.id }, data: { status: 'PENDING', paidAt: null, settlementReversedAt: new Date(), settlementReversedByUserId: request.authUser.id, settlementReversalReason: reason } })
  }))
  app.put('/finance/charges/:id', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => { const charge = await lockCharge(request.params.id); if (!charge) return reply.code(404).send({ message: 'Cobrança não encontrada.' }); if (charge.annualEnrollmentId) fail(409, 'Parcelas de anuidade não podem ser editadas individualmente.'); if (charge.payments.length || charge.status === 'PAID' || charge.status === 'CANCELLED') return reply.code(409).send({ message: 'Esta cobrança não pode mais ser editada.' }); const b = request.body || {}; const amount = Number(b.amount); const referenceYear = Number(b.referenceYear); const dueDate = civilDate(b.dueDate); if (!b.description?.trim() || !Number.isFinite(amount) || amount <= 0 || !dueDate || !Number.isInteger(referenceYear) || referenceYear < 1900 || referenceYear > 9999) return reply.code(400).send({ message: 'Informe descrição, valor, vencimento e ano de referência válidos.' }); return prisma.financialCharge.update({ where: { id: charge.id }, data: { description: b.description.trim(), amount, dueDate, referenceYear }, include: chargeInclude }) })
  app.post('/finance/charges/:id/cancel', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => { const charge = await lockCharge(request.params.id); if (!charge) return reply.code(404).send({ message: 'Cobrança não encontrada.' }); if (charge.annualEnrollmentId) fail(409, 'Parcelas de anuidade não podem ser canceladas individualmente.'); if (charge.payments.length) return reply.code(409).send({ message: 'Cobranças com pagamentos não podem ser canceladas.' }); if (charge.status === 'PAID') return reply.code(409).send({ message: 'Cobrança já paga não pode ser cancelada.' }); return prisma.financialCharge.update({ where: { id: charge.id }, data: { status: 'CANCELLED' }, include: chargeInclude }) })
}
