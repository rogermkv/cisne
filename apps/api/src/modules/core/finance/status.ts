/** Preserve an explicit recorded settlement even when older receipts are absent. */
export function financialAmounts(charge: any) {
  const amount = Number(charge.amount)
  const recordedPaymentsTotal = charge.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0
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
  if (overdueAt <= now) return 'OVERDUE'
  if (paidAmount > 0) return 'PARTIAL'
  if (charge.status !== 'PENDING') return charge.status
  return 'PENDING'
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
