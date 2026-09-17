import { ArrowLeft, CreditCard, Copy, QrCode, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../../api/client'
import '../finance/finance.css'

export function FinancePage({ onBack }: { onBack: () => void }) {
  const [finance, setFinance] = useState<any>(null)
  const [demo, setDemo] = useState<'pix' | 'card' | 'monthly' | null>(null)
  useEffect(() => { apiRequest('/api/member/me/finance', { headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } }).then(setFinance) }, [])
  if (!finance) return <div className="auth-loading">Carregando financeiro…</div>
  const amount = Number(finance.settings?.annualFeeAmount || 1600)
  const next = finance.nextCharge
  const money = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
  return <main className="finance-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button><span className="eyebrow">Área do Sócio</span><h1>Meu Financeiro</h1>
    <div className="finance-status"><span>Situação financeira</span><strong>{finance.status === 'PAID' ? 'EM DIA' : finance.status}</strong></div>
    <section className="next-charge"><span>PRÓXIMA ANUIDADE</span><h2>{next?.description || 'Nenhuma pendência'}</h2><strong>{money(Number(next?.amount || amount))}</strong><p>Vencimento: {next ? new Date(next.dueDate).toLocaleDateString('pt-BR') : '—'}</p>
      <div className="finance-actions"><button onClick={() => setDemo('pix')}><QrCode /> Pagar com PIX <small>DEMO</small></button><button onClick={() => setDemo('card')}><CreditCard /> Pagar com cartão <small>SIMULAÇÃO</small></button></div><button className="monthly-demo" onClick={() => setDemo('monthly')}>Ver PIX mensal · 12x de {money(amount / 12)}</button>
    </section>
    <section className="finance-history"><h2>Histórico</h2>{finance.history.map((c: any) => <div className="finance-history-row" key={c.id}><div><strong>{c.description}</strong><span>{new Date(c.dueDate).toLocaleDateString('pt-BR')}</span></div><b>{money(Number(c.amount))}</b><em className={c.status}>{c.status === 'PAID' ? 'PAGO' : c.status === 'PENDING' ? 'PENDENTE' : c.status}</em></div>)}</section><p className="demo-note">Pagamento demonstrativo · Nenhuma cobrança real será realizada.</p>
    {demo && <div className="finance-modal" role="dialog"><div className="finance-modal-card"><button className="modal-close" onClick={() => setDemo(null)}><X /></button>{demo === 'card' ? <><h2>Simulação para demonstração</h2><p>Parcelamento da anuidade de {money(amount)}</p><div className="installments">{[1, 2, 4, 6, 10, 12].map(n => <div key={n}>{n}x de <strong>{money(amount / n)}</strong></div>)}</div></> : <><QrCode size={32} /><h2>{demo === 'monthly' ? 'PIX mensal DEMO' : 'Pagar com PIX DEMO'}</h2><div className="demo-qr"><QrCode size={72} /></div><p>Pagamento demonstrativo. Nenhuma cobrança real será realizada.</p><button className="copy-demo" onClick={() => navigator.clipboard?.writeText('CISNE-DEMO-PIX')}><Copy size={16} /> Copiar código PIX</button></>}</div></div>}
  </main>
}
