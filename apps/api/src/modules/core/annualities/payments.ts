// @ts-nocheck
import { brasiliaDay } from './domain.js'
import { prisma } from '../../../lib/prisma.js'
import { effectiveFinancialStatus, financialAmounts } from '../finance/status.js'
export function fail(statusCode: number, message: string): never { throw Object.assign(new Error(message), { statusCode }) }
export async function lockCharge(id: string) {
  let charge = await prisma.financialCharge.findUnique({ where: { id } })
  if (!charge) fail(404, 'Cobrança não encontrada.')
  await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`annual:${charge.responsibleMemberId}:${charge.referenceYear}`}))`
  await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`charge:${id}`}))`
  charge = await prisma.financialCharge.findUnique({ where: { id }, include: { payments: true, annualEnrollment: { include: { season: true } } } })
  return charge
}
export async function recordPayment(id: string, body: any, actor: any, proofId?: string) {
  const charge = await lockCharge(id)
  if ((charge.type === 'ANNUAL_FEE' || charge.annualEnrollmentId) && actor.activeRole !== 'SECRETARIA') fail(403, 'Somente a Secretaria pode confirmar o pagamento desta anuidade.')
  if (charge.status === 'CANCELLED') fail(400, 'Esta cobrança foi cancelada e não pode receber pagamentos.')
  if (effectiveFinancialStatus(charge) === 'PAID') fail(400, 'Esta cobrança já está quitada. Atualize o financeiro para consultar o registro.')
  if (charge.type === 'ANNUAL_FEE' && !charge.annualEnrollmentId) fail(409, 'Escolha primeiro a forma de pagamento da anuidade nesta temporada. As cobranças serão geradas antes da confirmação dos recebimentos.')
  const pending = await prisma.financialDocument.findFirst({ where: { chargeId: id, kind: 'PROOF', status: 'PENDING' } })
  if (pending && pending.id !== proofId) fail(409, 'Confira o comprovante pendente antes de registrar este pagamento.')
  const { paidAmount, balance } = financialAmounts(charge)
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || amount > balance + 0.001) fail(400, 'Informe um valor positivo em centavos, sem ultrapassar o saldo da cobrança.')
  const methods = ['PIX', 'BOLETO', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']
  const paidAt = body.paidAt === undefined ? brasiliaDay() : body.paidAt
  const date = typeof paidAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paidAt) ? new Date(paidAt + 'T00:00:00.000Z') : null
  if (!date || !Number.isFinite(+date) || date.toISOString().slice(0,10) !== paidAt || !methods.includes(body.method) || (body.notes && (typeof body.notes !== 'string' || body.notes.length > 2000))) fail(400, 'Informe data, forma de pagamento e observação válidas.')
  const payment = await prisma.financialPayment.create({ data: { chargeId: id, amount, paidAt: date, method: body.method, notes: body.notes || null, registeredByUserId: actor.id } })
  if (paidAmount + amount >= Number(charge.amount) - 0.001) await prisma.financialCharge.update({ where: { id }, data: { status: 'PAID', paidAt: date } })
  return payment
}
