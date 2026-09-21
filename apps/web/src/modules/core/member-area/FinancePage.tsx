import { ArrowLeft, CreditCard, Copy, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../../api/client'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { chargeStatus, dateLabel, dateTimeLabel, financialStatus, money, paymentMethod } from '../ui/format'
import '../finance/finance.css'

export function FinancePage({ onBack }: { onBack: () => void }) {
  const [finance, setFinance] = useState<any>(null), [error, setError] = useState(''), [copied, setCopied] = useState(false)
  const [demo, setDemo] = useState<'pix' | 'card' | 'monthly' | null>(null)
  useEffect(() => { apiRequest('/api/member/me/finance', { headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } }).then(setFinance).catch(e => setError(e.message)) }, [])
  const next = finance?.nextCharge, amount = Number(next?.balance ?? next?.amount ?? 0)
  return <main className="finance-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button><span className="eyebrow">Área do Sócio</span><h1>Meu Financeiro</h1><Feedback error={error} />
    {!finance ? !error && <p role="status">Carregando financeiro…</p> : <>
      <div className="finance-status"><span>Situação financeira</span><strong>{financialStatus[finance.status] || 'Não informado'}</strong></div>
      <section className="next-charge"><span>PRÓXIMA COBRANÇA</span><h2>{next?.description || 'Nenhuma pendência'}</h2>{next && <><strong>{money(amount)}</strong><p>Vencimento: {dateLabel(next.dueDate)}</p>
        <div className="finance-actions"><button onClick={() => { setCopied(false); setDemo('pix') }}><QrCode /> Pagar com Pix <small>SIMULAÇÃO</small></button><button onClick={() => setDemo('card')}><CreditCard /> Pagar com cartão <small>SIMULAÇÃO</small></button></div><button className="monthly-demo" onClick={() => { setCopied(false); setDemo('monthly') }}>Ver Pix mensal · 12x de {money(amount / 12)}</button>
      </>}</section>
      <section className="finance-history"><h2>Histórico</h2>{finance.history.length ? finance.history.map((c: any) => <article className="payment-entry" key={c.id}><div className="finance-history-row"><div><strong>{c.description}</strong><span>Vencimento: {dateLabel(c.dueDate)}</span></div><b>{money(c.amount)}</b><span className={`status-badge ${c.status}`}>{chargeStatus[c.status] || 'Não informado'}</span></div>{c.payments.map((p: any) => <p className="muted" key={p.id}>Pagamento de {money(p.amount)} em {dateTimeLabel(p.paidAt)} · {paymentMethod[p.method] || 'Não informado'}</p>)}</article>) : <p>Nenhuma cobrança encontrada.</p>}</section>
      <p className="demo-note">Pagamento demonstrativo · Nenhuma cobrança real será realizada.</p>
    </>}
    {demo && <Modal title={demo === 'card' ? 'Simulação de parcelamento' : demo === 'monthly' ? 'Pix mensal demonstrativo' : 'Pix demonstrativo'} onClose={() => setDemo(null)}>
      {demo === 'card' ? <><p>Parcelamento de {money(amount)}</p><div className="installments">{[1, 2, 4, 6, 10, 12].map(n => <div key={n}>{n}x de <strong>{money(amount / n)}</strong></div>)}</div></> : <><div className="demo-qr"><QrCode size={72} /></div><p>Pagamento demonstrativo. Nenhuma cobrança real será realizada.</p><button className="btn btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText('CISNE-DEMO-PIX'); setCopied(true) } catch { setError('Não foi possível copiar o código.') } }}><Copy size={16} /> {copied ? 'Código copiado' : 'Copiar código Pix'}</button></>}
    </Modal>}
  </main>
}
