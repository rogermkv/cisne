export function normalizeCpf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^[\d.\-\s]+$/.test(value)) return null
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return null

  let sum = 0
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index)
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== Number(cpf[9])) return null

  sum = 0
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index)
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  return digit === Number(cpf[10]) ? cpf : null
}

export function normalizePhone(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  if (!/^[\d()\-+\s]+$/.test(value)) return null
  const phone = value.replace(/\D/g, '')
  return phone.length >= 10 && phone.length <= 13 ? phone : null
}
