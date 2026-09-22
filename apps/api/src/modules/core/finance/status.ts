export function effectiveFinancialStatus(charge: any, now = Date.now()) {
  const amount = Number(charge.amount)
  const paid = charge.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0
  const balance = Math.max(0, amount - paid)
  if (charge.status === 'CANCELLED' || balance <= 0) return charge.status === 'CANCELLED' ? 'CANCELLED' : 'PAID'
  const due = new Date(charge.dueDate)
  const overdueAt = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1)
  if (overdueAt <= now) return 'OVERDUE'
  if (paid > 0) return 'PARTIAL'
  if (charge.status !== 'PENDING') return charge.status
  return 'PENDING'
}
