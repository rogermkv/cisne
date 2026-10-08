import { ArrowLeft, ChevronDown, CreditCard, Copy, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../../api/client'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { chargeStatus, dateLabel, dateTimeLabel, financialStatus, money, paymentMethod } from '../ui/format'
import '../finance/finance.css'
import './member-finance.css'

const seasonKey = (charge: any) => String(charge.referenceYear || new Date(charge.dueDate).getUTCFullYear())
const monthLabel = (value: string) => new Date(value).toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, letter => letter.toUpperCase())

export function FinancePage({ onBack }: { onBack: () => void }) {
  const [finance, setFinance] = useState<any>(null), [error, setError] = useState(''), [copied, setCopied] = useState(false)
  const [demo, setDemo] = useState<'pix' | 'card' | 'monthly' | null>(null), [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  useEffect(() => { apiRequest('/api/member/me/finance', { headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } }).then(setFinance).catch(e => setError(e.message)) }, [])

  const seasons = useMemo(() => {
    const grouped = new Map<string, any[]>()
    for (const charge of finance?.history?.filter((item: any) => item.type === 'ANNUAL_FEE') || []) {
      const key = seasonKey(charge)
      grouped.set(key, [...(grouped.get(key) || []), charge])
    }
    return [...grouped.entries()].sort(([a], [b]) => Number(b) - Number(a)).map(([year, charges]) => {
      const total = charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
      const paid = charges.reduce((sum, charge) => sum + Number(charge.paidAmount || 0), 0)
      const status = charges.some(charge => charge.status === 'OVERDUE') ? 'OVERDUE' : charges.every(charge => charge.status === 'PAID') ? 'PAID' : charges.some(charge => charge.status === 'PARTIAL') ? 'PARTIAL' : 'PENDING'
      return { year, charges: charges.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)), total, paid, balance: Math.max(0, total - paid), status }
    })
  }, [finance])

  const selected = seasons.find(season => season.year === selectedSeason) || null
  const selectedNext = selected?.charges.filter(charge => ['PENDING', 'OVERDUE', 'PARTIAL'].includes(charge.status)).sort((a: any, b: any) => +new Date(a.dueDate) - +new Date(b.dueDate))[0] || null
  const selectedAmount = Number(selectedNext?.balance ?? selectedNext?.amount ?? 0)

  return <main className="finance-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button><span className="eyebrow">Área do Sócio</span><h1>Meu Financeiro</h1><Feedback error={error} />
    {!finance ? !error && <p role="status">Carregando financeiro…</p> : <>
      <div className="finance-status"><span>Situação financeira</span><strong>{financialStatus[finance.status] || 'Não informado'}</strong></div>
      <section className="finance-seasons" aria-label="Temporadas de anuidade"><div className="finance-section-heading"><div><span className="eyebrow">CONTA FAMILIAR</span><h2>Temporadas</h2></div><span>{seasons.length} {seasons.length === 1 ? 'registro' : 'registros'}</span></div><p className="finance-section-intro">Consulte uma temporada para ver valores, pagamentos e parcelas.</p>{seasons.length ? <div className="finance-season-list">{seasons.map(season => <div className={`finance-season ${selectedSeason === season.year ? 'is-open' : ''}`} key={season.year}><button className="finance-season-trigger" onClick={() => setSelectedSeason(current => current === season.year ? null : season.year)} aria-expanded={selectedSeason === season.year}><span><strong>Temporada {season.year}</strong><small>{season.charges.length > 1 ? `${season.charges.length} cobranças mensais` : 'Anuidade'}</small></span><span className="finance-season-summary"><b>{money(season.balance)}</b><em className={`status-badge ${season.status}`}>{chargeStatus[season.status] || 'Não informado'}</em><ChevronDown size={18} /></span></button>{selectedSeason === season.year && <div className="finance-season-detail"><div className="finance-detail-total"><span>Total da temporada<strong>{money(season.total)}</strong></span><span>Pago<strong>{money(season.paid)}</strong></span><span>Saldo<strong>{money(season.balance)}</strong></span></div><div className="finance-installment-list">{season.charges.map(charge => <div className="finance-installment" key={charge.id}><div><strong>{season.charges.length > 1 ? monthLabel(charge.dueDate) : charge.description}</strong><small>Vencimento: {dateLabel(charge.dueDate)}</small></div><span>{money(charge.balance ?? charge.amount)}</span><em className={`status-badge ${charge.status}`}>{chargeStatus[charge.status] || 'Não informado'}</em>{charge.payments?.length > 0 && <div className="finance-installment-payments">{charge.payments.map((payment: any) => <small key={payment.id}>Pagamento de {money(payment.amount)} em {dateTimeLabel(payment.paidAt)} · {paymentMethod[payment.method] || 'Não informado'}</small>)}</div>}</div>)}</div>{selectedNext && <div className="finance-detail-actions"><span>Próxima cobrança: <strong>{selectedNext.description}</strong> · {dateLabel(selectedNext.dueDate)}</span><div><button onClick={() => { setCopied(false); setDemo('pix') }}><QrCode /> Pix</button><button onClick={() => setDemo('card')}><CreditCard /> Cartão</button><button className="monthly-demo" onClick={() => { setCopied(false); setDemo('monthly') }}>Ver Pix mensal · 12x de {money(selectedAmount / 12)}</button></div></div>}</div>}</div>)}</div> : <p className="empty-member">Nenhuma temporada encontrada.</p>}</section>
      <p className="demo-note">Pagamento demonstrativo · Nenhuma cobrança real será realizada.</p>
    </>}
    {demo && <Modal title={demo === 'card' ? 'Simulação de parcelamento' : demo === 'monthly' ? 'Pix mensal demonstrativo' : 'Pix demonstrativo'} onClose={() => setDemo(null)}>{demo === 'card' ? <><p>Parcelamento de {money(selectedAmount)}</p><div className="installments">{[1, 2, 4, 6, 10, 12].map(n => <div key={n}>{n}x de <strong>{money(selectedAmount / n)}</strong></div>)}</div></> : <><div className="demo-qr"><QrCode size={72} /></div><p>Pagamento demonstrativo. Nenhuma cobrança real será realizada.</p><button className="btn btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText('CISNE-DEMO-PIX'); setCopied(true) } catch { setError('Não foi possível copiar o código.') } }}><Copy size={16} /> {copied ? 'Código copiado' : 'Copiar código Pix'}</button></>}</Modal>}
  </main>
}
