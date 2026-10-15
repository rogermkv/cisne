import { apiRequest, apiUrl } from '../../../api/client'
export const annualAuth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` })
export const annualRequest = <T = any>(path: string, method = 'GET', body?: unknown) => apiRequest<T>(path, { method, headers: annualAuth(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
export async function downloadFinancialDocument(id: string) {
  const response = await fetch(apiUrl + `/api/annualities/documents/${id}/file`, { headers: annualAuth() })
  if (!response.ok) throw new Error('Não foi possível abrir o documento. Confira seu acesso e tente novamente.')
  const blob = await response.blob(), url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = `documento-${id}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export const annualModeNames: Record<string, string> = { ADVANCE_12: 'Adiantamento em 12x', CREDIT_CARD: 'Cartão em até 10x', PIX_ONCE: 'À vista no PIX', INSTALLMENTS_4: 'PIX ou boleto em 4x' }
export const seasonPeriod = (year: number) => `01/11/${year - 1} a 31/10/${year}`
export const brasiliaToday = () => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get = (key: string) => parts.find(part => part.type === key)!.value; return `${get('year')}-${get('month')}-${get('day')}` }
