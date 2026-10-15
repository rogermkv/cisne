import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { annualSeasons } from '../finance/seasons'
import { AnnualPlans, ReceivingInstructions } from '../finance/AnnualPlans'
import { ChargeDocuments } from '../finance/ChargeDocuments'
import { annualRequest, seasonPeriod } from '../finance/annual-api'
import { Feedback } from '../ui/Feedback'
import { chargeStatus, dateLabel, dateTimeLabel, financialStatus, money, paymentMethod } from '../ui/format'
import '../finance/finance.css'
import './member-finance.css'

export function FinancePage({ onBack }: { onBack: () => void }) {
  const [annual, setAnnual] = useState<any>(null), [finance, setFinance] = useState<any>(null), [error, setError] = useState('')
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const load = async () => {
    try {
      const [nextFinance, nextAnnual] = await Promise.all([annualRequest('/api/member/me/finance'), annualRequest('/api/member/me/annualities')])
      setFinance(nextFinance); setAnnual(nextAnnual); setError('')
    } catch (e: any) { setError(e.message) }
  }
  useEffect(() => { void load() }, [])
  const seasons = useMemo(() => annualSeasons(finance?.history || []), [finance])
  return <main className="finance-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button>
    <span className="eyebrow">Área do Sócio</span><h1>Meu Financeiro</h1><Feedback error={error} />
    {!finance ? !error && <p role="status">Carregando financeiro…</p> : <>
      <div className="finance-status"><span>Situação financeira</span><strong>{financialStatus[finance.status] || 'Não informado'}</strong></div>
      {annual && <AnnualPlans data={annual} onChange={load} />}
      <section className="finance-seasons" aria-label="Temporadas de anuidade">
        <div className="finance-section-heading"><div><span className="eyebrow">CONTA FAMILIAR</span><h2>Parcelas e pagamentos</h2></div><span>{seasons.length} temporadas</span></div>
        <p className="finance-section-intro">Abra uma temporada para consultar vencimentos, pagamentos, boletos e comprovantes.</p>
        {seasons.length ? <div className="finance-season-list">{seasons.map(season => <div className={`finance-season ${selectedSeason === season.year ? 'is-open' : ''}`} key={season.year}>
          <button className="finance-season-trigger" onClick={() => setSelectedSeason(current => current === season.year ? null : season.year)} aria-expanded={selectedSeason === season.year}>
            <span><strong>Temporada {Number(season.year) - 1}/{season.year}</strong><small>{seasonPeriod(Number(season.year))}</small></span>
            <span className="finance-season-summary"><b>{money(season.balance)}</b><em className={`status-badge ${season.status}`}>{chargeStatus[season.status] || 'Não informado'}</em><ChevronDown size={18} /></span>
          </button>
          {selectedSeason === season.year && <div className="finance-season-detail">
            <div className="finance-detail-total"><span>Total da temporada<strong>{money(season.total)}</strong></span><span>Pago<strong>{money(season.paid)}</strong></span><span>Saldo<strong>{money(season.balance)}</strong></span></div>
            <div className="finance-installment-list">{season.charges.map(charge => <article className="finance-installment" key={charge.id}>
              <div><strong>{charge.description}</strong><small>Vencimento: {dateLabel(charge.dueDate)}</small></div>
              <span>{money(charge.balance ?? charge.amount)}</span><em className={`status-badge ${charge.status}`}>{chargeStatus[charge.status] || 'Não informado'}</em>
              {charge.paymentHistoryIncomplete && <small className="finance-installment-payments">Quitação registrada{charge.paidAt ? ' em ' + dateLabel(charge.paidAt) : ''}. Sem detalhamento completo de recibos neste histórico.</small>}
              {charge.payments?.length > 0 && <div className="finance-installment-payments">{charge.payments.map((payment: any) => <small key={payment.id}>Pagamento de {money(payment.amount)} em {dateTimeLabel(payment.paidAt)} · {paymentMethod[payment.method] || 'Não informado'}</small>)}</div>}
              {annual && <ReceivingInstructions settings={annual.settings} row={charge} responsible={annual.responsible} />}
              <ChargeDocuments row={charge} member onChange={load} />
            </article>)}</div>
          </div>}
        </div>)}</div> : <p className="empty-member">Nenhuma cobrança encontrada.</p>}
      </section>
      <p className="demo-note">Pagamentos são confirmados pela secretaria após conferência. Enviar comprovante não quita a parcela.</p>
    </>}
  </main>
}
