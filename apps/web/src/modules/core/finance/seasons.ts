/** Shared annual-season grouping for the member and administrative family account. */
export function chargeSeasons(history: any[]) {
  const grouped = new Map<string, any[]>()
  for (const charge of history) {
    const year = String(charge.referenceYear || new Date(charge.dueDate).getUTCFullYear())
    grouped.set(year, [...(grouped.get(year) || []), charge])
  }
  return [...grouped.entries()].sort(([a], [b]) => Number(b) - Number(a)).map(([year, charges]) => {
    const active = charges.filter(charge => charge.status !== 'CANCELLED')
    const total = active.reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
    const paid = active.reduce((sum, charge) => sum + Number(charge.paidAmount || 0), 0)
    const status = !active.length ? 'CANCELLED' : active.some(charge => charge.status === 'OVERDUE') ? 'OVERDUE' : active.every(charge => charge.status === 'PAID') ? 'PAID' : active.some(charge => charge.status === 'PARTIAL') ? 'PARTIAL' : 'PENDING'
    return { year, charges: charges.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)), total, paid, balance: Math.max(0, total - paid), status }
  })
}

export function annualSeasons(history: any[]) {
  return chargeSeasons(history.filter(item => item.type === 'ANNUAL_FEE'))
}
