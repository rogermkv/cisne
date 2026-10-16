/** Preserve an explicit recorded settlement even when older receipts are absent. */
export function financialAmounts(charge: any) {
  const amount = Number(charge.amount)
  const recordedPaymentsTotal = (charge.payments?.filter((payment: any) => !payment.reversedAt).reduce((sum: number, payment: any) => sum + Math.round(Number(payment.amount) * 100), 0) || 0) / 100
  const paymentHistoryIncomplete = charge.status === 'PAID' && recordedPaymentsTotal < amount
  const paidAmount = charge.status === 'PAID' ? Math.max(amount, recordedPaymentsTotal) : recordedPaymentsTotal
  return { amount, paidAmount, recordedPaymentsTotal, balance: charge.status === 'CANCELLED' ? 0 : Math.max(0, amount - paidAmount), paymentHistoryIncomplete }
}

export function effectiveFinancialStatus(charge: any, now = Date.now()) {
  const { balance, paidAmount } = financialAmounts(charge)
  if (charge.status === 'CANCELLED') return 'CANCELLED'
  if (charge.status === 'PAID' || balance <= 0) return 'PAID'
  const due = new Date(charge.dueDate)
  const overdueAt = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1)
  const dueBoundary = charge.annualEnrollmentId ? overdueAt + 3 * 60 * 60 * 1000 : overdueAt
  if (dueBoundary <= now) return 'OVERDUE'
  if (paidAmount > 0) return 'PARTIAL'
  if (charge.status !== 'PENDING') return charge.status
  return 'PENDING'
}

/** A parcel of an annual payment plan is overdue only after its own due date
 * and while it still has an open balance. One-off annual fees are deliberately
 * excluded so they do not appear as installment defaults. */
export function isOverdueAnnualInstallment(charge: any, now = Date.now()) {
  return Boolean(charge.annualEnrollmentId && charge.installmentNumber != null && effectiveFinancialStatus(charge, now) === 'OVERDUE')
}

export function summarizeOverdueAnnualInstallments(charges: any[], now = Date.now()) {
  const accounts = new Map<string, any>()
  for (const charge of charges) {
    if (!isOverdueAnnualInstallment(charge, now) || !charge.responsibleMemberId) continue
    const current = accounts.get(charge.responsibleMemberId) || {
      responsibleMemberId: charge.responsibleMemberId,
      responsibleMember: charge.responsibleMember,
      installments: [],
      overdueCount: 0,
      overdueTotal: 0,
      oldestDueDate: charge.dueDate,
    }
    current.installments.push({
      chargeId: charge.id,
      installmentNumber: charge.installmentNumber,
      description: charge.description,
      dueDate: charge.dueDate,
      balance: financialAmounts(charge).balance,
      referenceYear: charge.referenceYear,
    })
    current.overdueCount += 1
    current.overdueTotal += financialAmounts(charge).balance
    if (new Date(charge.dueDate) < new Date(current.oldestDueDate)) current.oldestDueDate = charge.dueDate
    accounts.set(charge.responsibleMemberId, current)
  }
  return [...accounts.values()]
    .map((account) => ({ ...account, installments: account.installments.sort((a: any, b: any) => +new Date(a.dueDate) - +new Date(b.dueDate)) }))
    .sort((a, b) => String(a.responsibleMember?.person?.fullName || '').localeCompare(String(b.responsibleMember?.person?.fullName || ''), 'pt-BR'))
}

export function summarizeFinancialPortfolio(charges: any[]) {
  const active = charges.filter((charge) => charge.status !== 'CANCELLED')
  const annualities = active.filter((charge) => charge.type === 'ANNUAL_FEE')
  const groupIds = new Set(annualities.map((charge) => charge.responsibleMemberId).filter(Boolean))
  const overdueGroupIds = new Set(annualities.filter((charge) => charge.status === 'OVERDUE').map((charge) => charge.responsibleMemberId).filter(Boolean))
  return {
    annualityCount: annualities.length,
    annualitiesPaid: annualities.filter((charge) => charge.status === 'PAID').length,
    annualitiesOverdue: annualities.filter((charge) => charge.status === 'OVERDUE').length,
    financialGroupCount: groupIds.size,
    groupsInDefault: overdueGroupIds.size,
    groupsInGoodStanding: Math.max(0, groupIds.size - overdueGroupIds.size),
  }
}
