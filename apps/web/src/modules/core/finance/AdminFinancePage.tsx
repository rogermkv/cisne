import { ArrowLeft, ChevronDown, CheckCircle, Eye, MessageCircle, MoreVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { useAuth } from '../auth/AuthProvider'
import { hasPermission } from '../auth/permissions'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { chargeStatus, dateLabel, dateTimeLabel, money, paymentMethod } from '../ui/format'
import { whatsappUrl } from '../members/phone'
import { chargeSeasons } from './seasons'
import type { Member } from '../../../api/members'
import './finance.css'
import '../member-area/member-finance.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const today = () => new Date().toISOString().slice(0, 10)
const monthValue = () => today().slice(0, 7)
const emptyCharge = { memberId: '', description: '', amount: '', dueDate: '', referenceYear: String(new Date().getFullYear()), type: 'ANNUAL_FEE' }
const typeLabels: Record<string, string> = { ANNUAL_FEE: 'Anuidade', RESERVATION: 'Reserva', EVENT: 'Evento', OTHER: 'Outro' }
const statusOptions = ['PENDING', 'OVERDUE', 'PARTIAL', 'PAID', 'CANCELLED']
const dateFor = (value: string) => new Date(`${value}T00:00:00`)
const isOpen = (row: any) => !['PAID', 'CANCELLED'].includes(row.status) && Number(row.balance ?? row.amount) > 0
const phoneFor = (row: any) => row.responsibleMember?.person?.phone || row.member?.person?.phone
const chargeMessage = (row: any) => {
  const name = row.responsibleMember?.person?.fullName || row.member?.person?.fullName || 'Sócio'
  const verb = row.status === 'OVERDUE' ? 'vencida em' : 'com vencimento em'
  return `Olá, ${name}. Consta em nosso sistema a cobrança ${row.description}, ${verb} ${dateLabel(row.dueDate)}, com saldo de ${money(row.balance ?? row.amount)}.`
}
export function AdminFinancePage({ onBack, member }: { onBack?: () => void; member?: Member }) {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'finance.manage')
  const [rows, setRows] = useState<any[]>([]), [members, setMembers] = useState<any[]>([]), [dashboard, setDashboard] = useState<any>()
  const [seasonFilter, setSeasonFilter] = useState('')
  const seasons = useMemo(() => chargeSeasons(rows), [rows])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [dueFilter, setDueFilter] = useState(''), [type, setType] = useState(''), [period, setPeriod] = useState(monthValue()), [sort, setSort] = useState('due')
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [payment, setPayment] = useState<any>(null), [detail, setDetail] = useState<any>(null), [editor, setEditor] = useState<any>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [charges, totals] = await Promise.all([
        apiRequest<any[]>('/api/finance/charges' + (member ? '?memberId=' + encodeURIComponent(member.id) : ''), auth()),
        member ? Promise.resolve(null) : apiRequest(`/api/finance/dashboard?from=${period}-01&to=${period}-31`, auth()),
      ])
      setRows(charges); setDashboard(totals)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [period, member?.id])
  useEffect(() => { if (member) { setMembers([member]); return } if (canManage) apiRequest<any[]>('/api/members', auth()).then(setMembers).catch(e => setError(e.message)) }, [canManage, member?.id])

  const types = useMemo(() => [...new Set([...Object.keys(typeLabels), ...rows.map(row => row.type).filter(Boolean)])], [rows])
  const filtered = useMemo(() => {
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const next7 = new Date(start); next7.setDate(next7.getDate() + 7); const next30 = new Date(start); next30.setDate(next30.getDate() + 30)
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    const result = rows.filter(row => {
      const text = `${row.member?.person?.fullName || ''} ${row.member?.person?.cpf || ''} ${row.member?.registrationNumber || ''} ${row.description || ''}`.toLocaleLowerCase('pt-BR')
      const due = dateFor(String(row.dueDate).slice(0, 10))
      const matchDue = !dueFilter || (dueFilter === 'overdue' && row.status === 'OVERDUE') || (dueFilter === 'today' && due.getTime() === start.getTime()) || (dueFilter === 'next7' && due >= start && due <= next7) || (dueFilter === 'next30' && due >= start && due <= next30) || (dueFilter === 'month' && String(row.dueDate).slice(0, 7) === period) || (dueFilter === 'paidMonth' && row.payments?.some((payment: any) => String(payment.paidAt).slice(0, 7) === period)) || (dueFilter === 'nextMonth' && (() => { const d = new Date(`${period}-01T00:00:00`); d.setMonth(d.getMonth() + 1); return String(row.dueDate).slice(0, 7) === d.toISOString().slice(0, 7) })())
      return (!seasonFilter || String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()) === seasonFilter) && (!needle || text.includes(needle)) && (!status || row.status === status) && (!type || row.type === type) && matchDue
    })
    return result.sort((a, b) => {
      if (sort === 'member') return (a.member?.person?.fullName || '').localeCompare(b.member?.person?.fullName || '', 'pt-BR')
      if (sort === 'amount') return Number(a.amount) - Number(b.amount)
      if (sort === 'balance') return Number(a.balance) - Number(b.balance)
      if (sort === 'status') return (chargeStatus[a.status] || '').localeCompare(chargeStatus[b.status] || '', 'pt-BR')
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [rows, query, status, dueFilter, type, period, sort, seasonFilter])
  const groups = useMemo(() => chargeSeasons(filtered), [filtered])
  const account = useMemo(() => { const active = rows.filter(row => row.status !== 'CANCELLED'); return { open: active.filter(isOpen).reduce((sum, row) => sum + Number(row.balance ?? row.amount), 0), overdue: active.filter(row => row.status === 'OVERDUE').reduce((sum, row) => sum + Number(row.balance ?? row.amount), 0), paid: active.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0) } }, [rows])
  const filteredOpen = filtered.filter(isOpen).reduce((total, row) => total + Number(row.balance ?? row.amount), 0)
  const periodLabel = new Date(`${period}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const createOrEdit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const body = { ...editor.form, amount: Number(editor.form.amount), referenceYear: Number(editor.form.referenceYear) }
      await apiRequest(editor.id ? `/api/finance/charges/${editor.id}` : '/api/finance/charges', { method: editor.id ? 'PUT' : 'POST', headers: auth().headers, body: JSON.stringify(body) })
      setEditor(null); if (!editor.id && member) { setSeasonFilter(''); setStatus(''); setType('') } setMessage(editor.id ? 'Cobrança atualizada com sucesso.' : 'Cobrança criada com sucesso.'); await load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const registerPayment = async () => {
    setError(''); const value = Number(payment.paymentAmount); const balance = Number(payment.balance ?? payment.amount)
    if (!Number.isFinite(value) || value <= 0 || value > balance) return setError(`Informe um valor entre R$ 0,01 e ${money(balance)}.`)
    setSaving(true)
    try {
      await apiRequest(`/api/finance/charges/${payment.id}/payments`, { method: 'POST', headers: auth().headers, body: JSON.stringify({ amount: value, method: payment.paymentMethod, paidAt: payment.paidAt, notes: payment.notes || null }) })
      setPayment(null); setMessage('Pagamento registrado com sucesso.'); await load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const cancelCharge = async (row: any) => {
    if (!window.confirm('Tem certeza de que deseja cancelar esta cobrança?')) return
    setSaving(true); setError('')
    try { await apiRequest(`/api/finance/charges/${row.id}/cancel`, { method: 'POST', headers: auth().headers }); setMessage('Cobrança cancelada.'); await load() } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const openPayment = (row: any) => { setError(''); setPayment({ ...row, paymentAmount: row.balance ?? row.amount, paymentMethod: 'PIX', paidAt: today(), notes: '' }) }
  const contact = (row: any) => { const url = whatsappUrl(phoneFor(row)); return url ? `${url}?text=${encodeURIComponent(chargeMessage(row))}` : null }

  return <section className={member ? "finance-admin-page finance-member-panel" : "finance-admin-page"}>
    {!member && <><button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button>
    <span className="eyebrow">Gestão administrativa</span><h1>Financeiro</h1></>}
    <Feedback error={error} message={message} />
    {member && <div className="family-finance">
      <header className="family-finance-heading"><div><h2>Financeiro</h2><p>Responsável: <strong>{member.financialResponsible?.name || member.titular?.person.fullName || member.person.fullName}</strong></p></div>{canManage && <button className="btn btn-primary" disabled={loading || saving} onClick={() => { setError(''); setEditor({ form: { ...emptyCharge, memberId: member.id, referenceYear: seasonFilter || period.slice(0, 4), dueDate: `${seasonFilter || period.slice(0, 4)}-${period.slice(5)}-01` } }) }}><Plus size={16} /> Nova cobrança</button>}</header>
      <div className="family-finance-totals" role="group" aria-label="Totais da conta familiar"><div><span>Total em aberto</span><strong>{loading ? '—' : money(account.open)}</strong></div><div><span>Em atraso</span><strong>{loading ? '—' : money(account.overdue)}</strong></div><div><span>Total pago</span><strong>{loading ? '—' : money(account.paid)}</strong></div></div>
      <div className="family-finance-filters"><label>Temporada<select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}><option value="">Todas</option>{seasons.map(season => <option key={season.year} value={season.year}>{season.year}</option>)}</select></label><label>Situação<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{statusOptions.map(value => <option key={value} value={value}>{chargeStatus[value]}</option>)}</select></label><label>Tipo<select value={type} onChange={e => setType(e.target.value)}><option value="">Todos</option>{types.map(value => <option key={value} value={value}>{typeLabels[value] || value}</option>)}</select></label>{(seasonFilter || status || type) && <button className="btn btn-secondary" onClick={() => { setSeasonFilter(''); setStatus(''); setType('') }}>Limpar filtros</button>}</div>
      {loading ? <p role="status">Carregando financeiro…</p> : <><p className="family-finance-count">{groups.length} temporadas · {filtered.length} cobranças</p><div className="family-finance-seasons">{groups.map(group => <section className="family-finance-season" key={group.year}>
        <h3><button className="family-season-trigger" aria-expanded={expanded.has(group.year)} aria-controls={'family-season-' + group.year} onClick={() => setExpanded(current => { const next = new Set(current); if (next.has(group.year)) next.delete(group.year); else next.add(group.year); return next })}><span><strong>Temporada {group.year}</strong><small>{group.charges.length} {group.charges.length === 1 ? 'cobrança' : 'cobranças'}</small></span><span className="family-season-balance"><small>Saldo em aberto</small><strong>{money(group.balance)}</strong></span><span className={'status-badge ' + group.status}>{chargeStatus[group.status]}</span><ChevronDown size={18} className={expanded.has(group.year) ? 'is-expanded' : ''} /></button></h3>
        {expanded.has(group.year) && <div className="family-season-body" id={'family-season-' + group.year}><div className="family-season-totals"><span>Total: <strong>{money(group.total)}</strong></span><span>Pago: <strong>{money(group.paid)}</strong></span><span>Saldo: <strong>{money(group.balance)}</strong></span></div>{group.charges.map(row => <article className="family-charge" key={row.id} aria-label={row.description}>
          <div className="family-charge-heading"><div><h4>{row.description}</h4><p>{typeLabels[row.type] || row.type} · Vencimento: {dateLabel(row.dueDate)}</p>{row.memberId !== member.id && <p>Associado: {row.member?.person?.fullName}</p>}</div><span className={'status-badge ' + row.status}>{chargeStatus[row.status]}</span></div>
          <dl className="family-charge-values"><div><dt>Valor original</dt><dd>{money(row.amount)}</dd></div><div><dt>Pago</dt><dd>{money(row.paidAmount)}</dd></div><div><dt>Saldo em aberto</dt><dd>{money(row.status === 'CANCELLED' ? 0 : row.balance ?? row.amount)}</dd></div></dl>
          <div className="family-charge-actions">{canManage && isOpen(row) && <button className="btn btn-positive btn-compact" disabled={saving || loading} onClick={() => openPayment(row)}><CheckCircle size={15} /> Registrar pagamento</button>}<details className="finance-action-menu"><summary aria-label="Mais ações"><MoreVertical size={18} /></summary><div><button disabled={saving || loading} onClick={() => setDetail(row)}>Detalhes da cobrança</button>{canManage && isOpen(row) && !row.payments?.length && <><button disabled={saving || loading} onClick={() => setEditor({ id: row.id, form: { memberId: row.memberId, description: row.description, amount: String(row.amount), dueDate: String(row.dueDate).slice(0, 10), referenceYear: String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()), type: row.type } })}>Editar cobrança</button><button disabled={saving || loading} onClick={() => cancelCharge(row)}>Cancelar cobrança</button></>}{contact(row) && isOpen(row) && <a href={contact(row)!} target="_blank" rel="noopener noreferrer">Cobrar via WhatsApp</a>}</div></details></div>
          {(row.payments?.length > 0 || row.paymentHistoryIncomplete) && <div className="family-charge-payments"><h5>Pagamentos</h5>{row.paymentHistoryIncomplete && <p>Quitação já registrada{row.paidAt ? ' em ' + dateLabel(row.paidAt) : ''}. O histórico não contém todos os recibos individuais.</p>}{row.payments.map((entry: any) => <p key={entry.id}>{money(entry.amount)} · {dateTimeLabel(entry.paidAt)} · {paymentMethod[entry.method] || entry.method}{entry.registeredBy?.person?.fullName ? ' · Registrado por ' + entry.registeredBy.person.fullName : ''}</p>)}</div>}
        </article>)}</div>}
      </section>)}</div>{!groups.length && <p className="empty-state">Nenhuma cobrança encontrada para os filtros selecionados.</p>}</>}
    </div>}
    {!member && <>    <section className="finance-period-bar"><label>Período de referência<input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></label><span>{periodLabel}</span></section>
    <div className="finance-admin-stats finance-admin-stats-enhanced">
      <div><span>A receber</span><strong>{money(dashboard?.totalToReceive)}</strong><small>{dashboard?.openCount ?? 0} cobranças abertas</small></div>
      <div><span>Recebido em {periodLabel}</span><strong>{money(dashboard?.totalReceived)}</strong><small>{dashboard?.receivedCount ?? 0} pagamentos</small></div>
      <div><span>Em atraso</span><strong>{money(dashboard?.totalOverdue)}</strong><small>{dashboard?.overdueCount ?? 0} cobranças</small></div>
      <div><span>Vencendo em 30 dias</span><strong>{money(dashboard?.dueSoon)}</strong><small>{dashboard?.dueSoonCount ?? 0} cobranças</small></div>
      <div><span>Anuidades</span><strong>{dashboard?.annualityCount ?? 0}</strong><small>{dashboard?.annualitiesPaid ?? 0} quitadas</small></div>
      <div><span>Grupos em dia</span><strong>{dashboard?.groupsInGoodStanding ?? 0}</strong><small>{dashboard?.financialGroupCount ?? 0} grupos financeiros</small></div>
      <div><span>Grupos inadimplentes</span><strong>{dashboard?.groupsInDefault ?? 0}</strong><small>Dependentes não são duplicados</small></div>
    </div>
</>}
    {!member && <>
    <div className="section-heading"><div><span className="eyebrow">Central de trabalho</span><h2>Cobranças e pagamentos</h2></div>{canManage && <button className="btn btn-primary" disabled={saving || loading} onClick={() => { setError(''); setEditor({ form: { ...emptyCharge, memberId: '', referenceYear: seasonFilter || period.slice(0, 4), dueDate: `${seasonFilter || period.slice(0, 4)}-${period.slice(5)}-01` } }) }}><Plus size={18} /> Nova cobrança</button>}</div>
    <div className="finance-quick-filters"><button className={!status && !dueFilter ? 'active' : ''} onClick={() => { setStatus(''); setDueFilter('') }}>Todas</button><button className={dueFilter === 'overdue' ? 'active' : ''} onClick={() => { setStatus(''); setDueFilter('overdue') }}>Em atraso</button><button className={dueFilter === 'next30' ? 'active' : ''} onClick={() => { setStatus(''); setDueFilter('next30') }}>Vencendo em 30 dias</button><button className={dueFilter === 'paidMonth' ? 'active' : ''} onClick={() => { setStatus('PAID'); setDueFilter('paidMonth') }}>Pagas no mês</button></div>
    <div className="filter-bar finance-filters"><label>Pesquisar<input placeholder="Nome, CPF, matrícula ou descrição" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Situação<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{statusOptions.map(key => <option key={key} value={key}>{chargeStatus[key]}</option>)}</select></label><label>Vencimento<select value={dueFilter} onChange={e => setDueFilter(e.target.value)}><option value="">Todos</option><option value="overdue">Vencidas</option><option value="today">Hoje</option><option value="next7">Próximos 7 dias</option><option value="next30">Próximos 30 dias</option><option value="month">Este mês</option><option value="nextMonth">Próximo mês</option></select></label><label>Tipo<select value={type} onChange={e => setType(e.target.value)}><option value="">Todos</option>{types.map(key => <option key={key} value={key}>{typeLabels[key] || key}</option>)}</select></label><label>Ordenar<select value={sort} onChange={e => setSort(e.target.value)}><option value="due">Vencimento</option><option value="member">Sócio</option><option value="amount">Valor</option><option value="balance">Saldo</option><option value="status">Situação</option></select></label></div>
    <p className="finance-result-summary"><strong>{filtered.length} {filtered.length === 1 ? 'cobrança' : 'cobranças'}</strong> · {money(filteredOpen)} em aberto</p>
    <div className="table-scroll finance-table-scroll" role="region" aria-label="Cobranças e pagamentos" tabIndex={0}><table className="data-table finance-table"><thead><tr><th>Sócio / cobrança</th><th>Vencimento</th><th>Valor / saldo</th><th>Situação</th><th>Contato</th><th className="actions-column">Ações</th></tr></thead><tbody>{filtered.map(row => { const contactUrl = contact(row); const sameResponsible = row.responsibleMember?.id === row.member?.id; return <tr key={row.id}><td><strong>{row.member?.person?.fullName || 'Sócio'}</strong><small>{row.description}</small>{!sameResponsible && row.responsibleMember?.person?.fullName && <small>Responsável: {row.responsibleMember.person.fullName}</small>}</td><td>{dateLabel(row.dueDate)}{row.status === 'OVERDUE' && <small className="finance-overdue">Vencida</small>}</td><td><strong>{money(row.amount)}</strong><small>Saldo: {money(row.balance ?? row.amount)}</small></td><td><span className={`status-badge ${row.status}`}>{chargeStatus[row.status] || 'Não informado'}</span></td><td>{contactUrl ? <a className="whatsapp-link" href={contactUrl} target="_blank" rel="noopener noreferrer" aria-label={`Cobrar ${row.member?.person?.fullName || 'sócio'} via WhatsApp`}><MessageCircle size={16} /> WhatsApp</a> : '—'}</td><td><div className="row-actions finance-row-actions"><button className="btn btn-secondary btn-compact" disabled={saving || loading} onClick={() => setDetail(row)}><Eye size={15} /> Ver</button>{canManage && isOpen(row) && <button className="btn btn-positive btn-compact" disabled={saving || loading} onClick={() => openPayment(row)}><CheckCircle size={15} /> Registrar pagamento</button>}<details className="finance-action-menu"><summary aria-label="Mais ações"><MoreVertical size={18} /></summary><div><button disabled={saving || loading} onClick={() => setDetail(row)}>Detalhes</button>{canManage && isOpen(row) && !row.payments?.length && <button disabled={saving || loading} onClick={() => setEditor({ id: row.id, form: { memberId: row.memberId, description: row.description, amount: String(row.amount), dueDate: String(row.dueDate).slice(0, 10), referenceYear: String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()), type: row.type } })}>Editar cobrança</button>}{canManage && isOpen(row) && !row.payments?.length && <button disabled={saving || loading} onClick={() => cancelCharge(row)}>Cancelar cobrança</button>}{contactUrl && isOpen(row) && <a href={contactUrl} target="_blank" rel="noopener noreferrer">Cobrar via WhatsApp</a>}</div></details></div></td></tr> })}</tbody></table>{loading ? <p className="empty-state">Carregando cobranças…</p> : !filtered.length && <p className="empty-state">Nenhuma cobrança encontrada.</p>}</div>
    </>}
    {editor && <Modal title={editor.id ? 'Editar cobrança' : 'Nova cobrança'} onClose={() => !saving && setEditor(null)}><form className="ui-form" onSubmit={createOrEdit}><Feedback error={error} /><label>Sócio<select required disabled={Boolean(editor.id || member)} value={editor.form.memberId} onChange={e => setEditor({ ...editor, form: { ...editor.form, memberId: e.target.value } })}><option value="">Selecione</option>{members.map(m => <option key={m.id} value={m.id}>{m.person.fullName} · {m.category?.name || 'Categoria'}</option>)}</select></label><label>Descrição<input required value={editor.form.description} onChange={e => setEditor({ ...editor, form: { ...editor.form, description: e.target.value } })} /></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={editor.form.amount} onChange={e => setEditor({ ...editor, form: { ...editor.form, amount: e.target.value } })} /></label><label>Vencimento<input required type="date" value={editor.form.dueDate} onChange={e => setEditor({ ...editor, form: { ...editor.form, dueDate: e.target.value } })} /></label><label>Tipo<select value={editor.form.type} onChange={e => setEditor({ ...editor, form: { ...editor.form, type: e.target.value } })}>{types.map(key => <option key={key} value={key}>{typeLabels[key] || key}</option>)}</select></label><label>Ano de referência<input required type="number" min="1900" max="9999" value={editor.form.referenceYear} onChange={e => setEditor({ ...editor, form: { ...editor.form, referenceYear: e.target.value } })} /></label><div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditor(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : editor.id ? 'Salvar alterações' : 'Criar cobrança'}</button></div></form></Modal>}
    {payment && <Modal title="Registrar pagamento" onClose={() => !saving && setPayment(null)}><Feedback error={error} /><div className="finance-payment-summary"><strong>{payment.description}</strong><span>{payment.member?.person?.fullName}</span><span>Valor original: {money(payment.amount)}</span><span>Já pago: {money(payment.paidAmount)}</span><span>Saldo: <b>{money(payment.balance ?? payment.amount)}</b></span></div><div className="ui-form finance-receipt-form"><label>Valor recebido<input type="number" min="0.01" max={payment.balance ?? payment.amount} step="0.01" value={payment.paymentAmount} onChange={e => setPayment({ ...payment, paymentAmount: e.target.value })} /></label><label>Data do pagamento<input type="date" required value={payment.paidAt} onChange={e => setPayment({ ...payment, paidAt: e.target.value })} /></label><label>Forma de pagamento<select value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>{Object.entries(paymentMethod).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Observação<textarea rows={3} value={payment.notes} onChange={e => setPayment({ ...payment, notes: e.target.value })} /></label></div><div className="form-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => setPayment(null)}>Cancelar</button><button className="btn btn-positive" disabled={saving} onClick={registerPayment}>{saving ? 'Registrando…' : 'Confirmar pagamento'}</button></div></Modal>}
    {detail && <Modal title="Detalhes da cobrança" onClose={() => setDetail(null)}><h3>{detail.description}</h3><p><strong>Associado:</strong> {detail.member?.person?.fullName || 'Não informado'}</p>{detail.member?.category?.name && <p><strong>Categoria:</strong> {detail.member.category.name}</p>}<p><strong>CPF:</strong> {detail.member?.person?.cpfMasked || 'Não informado'}</p><p><strong>Responsável financeiro:</strong> {detail.responsibleMember?.id === detail.member?.id ? 'O próprio associado' : detail.responsibleMember?.person?.fullName || 'Não informado'}</p><p><strong>Vencimento:</strong> {dateLabel(detail.dueDate)}</p><p><strong>Situação:</strong> {chargeStatus[detail.status] || 'Não informado'}</p><p><strong>Valor original:</strong> {money(detail.amount)} · <strong>Saldo:</strong> {money(detail.balance ?? detail.amount)}</p><h4>Histórico de pagamentos</h4>{detail.paymentHistoryIncomplete && <p>Quitação já registrada{detail.paidAt ? ' em ' + dateLabel(detail.paidAt) : ''}. O histórico não contém todos os recibos individuais; nenhum novo recebimento foi gerado.</p>}{detail.payments?.length ? detail.payments.map((p: any) => <article className="payment-entry" key={p.id}><strong>{money(p.amount)}</strong><p>{dateTimeLabel(p.paidAt)} · {paymentMethod[p.method] || 'Não informado'}</p>{p.notes && <small>{p.notes}</small>}<small>Registrado por {p.registeredBy?.person?.fullName || 'Sistema'}</small></article>) : !detail.paymentHistoryIncomplete && <p>Nenhum pagamento registrado.</p>}</Modal>}
  </section>
}
