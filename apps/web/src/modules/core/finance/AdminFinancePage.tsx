import { ArrowLeft, CheckCircle, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { useAuth } from '../auth/AuthProvider'
import { hasPermission } from '../auth/permissions'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { chargeStatus, dateLabel, dateTimeLabel, money, paymentMethod } from '../ui/format'
import './finance.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const empty = { memberId: '', description: '', amount: '', dueDate: '', referenceYear: String(new Date().getFullYear()), type: 'ANNUAL_FEE' }
export function AdminFinancePage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'finance.manage')
  const [rows, setRows] = useState<any[]>([]), [members, setMembers] = useState<any[]>([]), [dashboard, setDashboard] = useState<any>()
  const [showCreate, setShowCreate] = useState(false), [payment, setPayment] = useState<any>(null), [history, setHistory] = useState<any>(null)
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [form, setForm] = useState(empty), [query, setQuery] = useState(''), [status, setStatus] = useState('')
  const load = async () => {
    setLoading(true)
    try {
      const [charges, totals] = await Promise.all([apiRequest<any[]>('/api/finance/charges', auth()), apiRequest('/api/finance/dashboard', auth())])
      setRows(charges); setDashboard(totals)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { void load(); if (canManage) apiRequest<any[]>('/api/members', auth()).then(setMembers).catch(e => setError(e.message)) }, [canManage])
  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      await apiRequest('/api/finance/charges', { method: 'POST', ...auth(), body: JSON.stringify({ ...form, amount: Number(form.amount), referenceYear: Number(form.referenceYear) }) })
      setShowCreate(false); setForm(empty); setMessage('Cobrança criada.'); await load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const pay = async () => {
    setError(''); setSaving(true)
    try {
      await apiRequest(`/api/finance/charges/${payment.id}/payments`, { method: 'POST', ...auth(), body: JSON.stringify({ amount: payment.balance, method: 'OTHER' }) })
      setPayment(null); setMessage('Pagamento registrado.'); await load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const filtered = rows.filter(row => (!status || row.status === status) && `${row.member?.person?.fullName} ${row.description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  return <main className="finance-admin-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button>
    <span className="eyebrow">Gestão administrativa</span><h1>Financeiro</h1>
    {!showCreate && !payment && <Feedback error={error} message={message} />}
    <div className="finance-admin-stats">
      <div><span>Total a receber</span><strong>{money(dashboard?.totalToReceive)}</strong></div>
      <div><span>Recebido no período</span><strong>{money(dashboard?.totalReceived)}</strong></div>
      <div><span>Em atraso</span><strong>{money(dashboard?.totalOverdue)}</strong></div>
      <div><span>Sócios pendentes</span><strong>{dashboard?.membersWithPending ?? 0}</strong></div>
    </div>
    <div className="section-heading"><h2>Cobranças e pagamentos</h2>{canManage && <button className="btn btn-primary" onClick={() => { setError(''); setShowCreate(true) }}><Plus size={18} /> Nova cobrança</button>}</div>
    <div className="filter-bar"><label>Pesquisar<input placeholder="Sócio ou descrição" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Situação<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{Object.entries(chargeStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    <div className="table-scroll" role="region" aria-label="Cobranças e pagamentos" tabIndex={0}>
      <table className="data-table finance-table"><thead><tr><th>Sócio / cobrança</th><th>Vencimento</th><th className="numeric">Valor</th><th>Situação</th><th className="actions-column">Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>
        <td><strong>{row.member?.person?.fullName || 'Sócio'}</strong><small>{row.description}</small></td><td>{dateLabel(row.dueDate)}</td><td className="numeric">{money(row.amount)}</td><td><span className={`status-badge ${row.status}`}>{chargeStatus[row.status] || 'Não informado'}</span></td>
        <td><div className="row-actions">{canManage && ['PENDING', 'OVERDUE'].includes(row.status) && <button className="btn btn-positive" onClick={() => { setError(''); setPayment({ ...row, balance: row.balance ?? Number(row.amount) - row.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0) }) }}><CheckCircle size={16} /> Registrar pagamento</button>}<button className="btn btn-secondary" onClick={() => setHistory(row)}>Histórico</button></div></td>
      </tr>)}</tbody></table>
      {loading ? <p className="empty-state" role="status">Carregando cobranças…</p> : !filtered.length && <p className="empty-state">Nenhuma cobrança encontrada.</p>}
    </div>
    {showCreate && <Modal title="Nova cobrança" onClose={() => !saving && setShowCreate(false)}><form className="ui-form" onSubmit={create}>
      <Feedback error={error} />
      <label>Sócio<select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}><option value="">Selecione</option>{members.map(m => <option key={m.id} value={m.id}>{m.person.fullName}</option>)}</select></label>
      <label>Descrição<input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <label>Vencimento<input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
      <label>Tipo<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="ANNUAL_FEE">Anuidade</option><option value="RESERVATION">Reserva</option><option value="EVENT">Evento</option><option value="OTHER">Outro</option></select></label>
      <label>Ano de referência<input required type="number" min="1900" max="9999" value={form.referenceYear} onChange={e => setForm({ ...form, referenceYear: e.target.value })} /></label>
      <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowCreate(false)}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Criar cobrança'}</button></div>
    </form></Modal>}
    {payment && <Modal title="Registrar pagamento" onClose={() => !saving && setPayment(null)}><Feedback error={error} /><p>{payment.member?.person?.fullName}</p><p>{payment.description}</p><p>Confirmar o pagamento integral do saldo de <strong>{money(payment.balance)}</strong>?</p><div className="form-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => setPayment(null)}>Cancelar</button><button className="btn btn-positive" disabled={saving} onClick={pay}>{saving ? 'Registrando…' : 'Confirmar pagamento'}</button></div></Modal>}
    {history && <Modal title="Histórico de pagamentos" onClose={() => setHistory(null)}><h3>{history.description}</h3><p>{chargeStatus[history.status]} · {money(history.amount)}</p>{history.payments.length ? history.payments.map((p: any) => <article className="payment-entry" key={p.id}><strong>{money(p.amount)}</strong><p>{dateTimeLabel(p.paidAt)} · {paymentMethod[p.method] || 'Não informado'}</p><small>Registrado por {p.registeredBy?.person?.fullName || 'Sistema'}</small></article>) : <p>Nenhum pagamento registrado.</p>}</Modal>}
  </main>
}
