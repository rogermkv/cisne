import { ArrowLeft, CalendarRange, CircleDollarSign, Info, Layers3 } from 'lucide-react'
import { money } from '../ui/format'
import './annualities.css'

const demoSeasons = [
  {
    name: 'Temporada 2027',
    status: 'Futura · demonstração',
    period: '01/11/2026 a 31/10/2027',
    amount: 1620,
    plans: [
      { name: 'Pagamento antecipado', detail: '12 parcelas de R$ 135,00', methods: 'Boleto ou PIX' },
      { name: 'Pagamento no início', detail: 'Entrada + 3 parcelas de R$ 405,00', methods: 'Boleto' },
      { name: 'À vista', detail: 'Pagamento único de R$ 1.620,00', methods: 'PIX ou espécie' },
    ],
  },
]

export function AnnualitiesPage({ onBack }: { onBack: () => void }) {
  return <main className="finance-admin-page annualities-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button>
    <header className="annualities-header"><div><span className="eyebrow">Administração financeira</span><h1>Temporadas e anuidades</h1><p>Preparação da estrutura comercial para anuidades familiares.</p></div><span className="phase-badge">FASE 1 · DEMONSTRAÇÃO</span></header>
    <div className="annualities-notice"><Info size={19} /><p>Esta tela é demonstrativa. Ainda não cria temporadas, parcelas ou cobranças reais. Os valores e calendários abaixo servem para validar a experiência antes da modelagem persistente.</p></div>
    <div className="finance-admin-stats finance-admin-stats-enhanced"><div><span>Temporadas cadastradas</span><strong>{demoSeasons.length}</strong><small>Interface preparada</small></div><div><span>Planos disponíveis</span><strong>{demoSeasons.reduce((total, season) => total + season.plans.length, 0)}</strong><small>Por temporada</small></div><div><span>Valor de referência</span><strong>{money(demoSeasons[0].amount)}</strong><small>Temporada 2027</small></div></div>
    <section className="annuality-season-list">{demoSeasons.map((season) => <article className="annuality-season-card" key={season.name}><div className="annuality-season-card__header"><div><span className="eyebrow"><CalendarRange size={15} /> Temporada</span><h2>{season.name}</h2><p>{season.period}</p></div><span className="status-badge PENDING">{season.status}</span></div><div className="annuality-season-card__value"><CircleDollarSign size={20} /><div><span>Valor da anuidade</span><strong>{money(season.amount)}</strong></div></div><div className="annuality-plan-grid">{season.plans.map((plan) => <article className="annuality-plan-card" key={plan.name}><Layers3 size={19} /><h3>{plan.name}</h3><strong>{plan.detail}</strong><span>{plan.methods}</span><small>Configuração futura</small></article>)}</div></article>)}</section>
    <section className="record-card annualities-next-steps"><span className="eyebrow">Próxima fase</span><h2>Persistência e motor financeiro</h2><p>A próxima fase deverá criar temporadas, planos, anuidades, parcelas, pagamentos e auditoria com histórico preservado. O grupo financeiro continuará sendo compartilhado pelo titular e seus dependentes.</p></section>
  </main>
}
