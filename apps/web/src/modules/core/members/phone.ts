/** Normaliza um telefone brasileiro para o formato aceito pelo wa.me. */
export function normalizeBrazilianWhatsAppNumber(phone?: string | null): string | null {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  if (digits.length === 12 || digits.length === 13) return digits.startsWith('55') ? digits : null
  return null
}

export function whatsappUrl(phone?: string | null): string | null {
  const number = normalizeBrazilianWhatsAppNumber(phone)
  return number ? 'https://wa.me/' + number : null
}
