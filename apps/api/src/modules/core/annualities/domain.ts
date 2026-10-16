export const planModes = ['ADVANCE_12', 'CREDIT_CARD', 'PIX_ONCE', 'INSTALLMENTS_4'] as const
export type PlanMode = typeof planModes[number]
export const planNames: Record<PlanMode, string> = { ADVANCE_12: 'Adiantamento em 12x', CREDIT_CARD: 'Cartão em até 10x', PIX_ONCE: 'À vista no PIX', INSTALLMENTS_4: 'PIX ou boleto em 4x' }
export function installmentSchedule(endYear: number, mode: PlanMode, amount: number) {
  if (!Number.isInteger(endYear) || endYear < 1901 || endYear > 9999 || !planModes.includes(mode) || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) throw Object.assign(new Error('Temporada, modalidade ou valor inválido.'), { statusCode: 400 })
  const count = mode === 'ADVANCE_12' ? 12 : mode === 'INSTALLMENTS_4' ? 4 : 1
  const total = Math.round(amount * 100)
  if (total < count) throw Object.assign(new Error('O valor precisa permitir parcelas de pelo menos R$ 0,01.'), { statusCode: 400 })
  const base = Math.floor(total / count)
  const firstMonth = mode === 'ADVANCE_12' ? 3 : 10
  return Array.from({ length: count }, (_, index) => ({ installmentNumber: index + 1, amount: (base + (index === count - 1 ? total - base * count : 0)) / 100, dueDate: new Date(Date.UTC(endYear - 1, firstMonth + index, 10)) }))
}
/** Seasons are identified by the year in which they end: Anuidade 2027
 * means 01/11/2026 through 31/10/2027. */
export const seasonLabel = (year: number) => String(year)
export function brasiliaDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (key: string) => parts.find(part => part.type === key)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
