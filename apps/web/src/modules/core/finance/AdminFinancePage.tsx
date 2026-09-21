import { ArrowLeft, CheckCircle, Eye, Plus } from 'lucide-react'
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
      await apiRequest(`/api/finance/charges/${payment.id}/payments`, { method: 'POST', ...auth(), body: JSON.stringify({ amount: Number(payment.paymentAmount), method: payment.paymentMethod }) })
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
        <td><strong>{row.member?.person?.fullName || 'Sócio'}</strong><small>{row.description}</small><small>Responsável: {row.responsibleMember?.person?.fullName || row.member?.person?.fullName || 'Não informado'}</small></td><td>{dateLabel(row.dueDate)}</td><td className="numeric"><strong>{money(row.balance ?? row.amount)}</strong><small>de {money(row.amount)}</small></td><td><span className={`status-badge ${row.status}`}>{chargeStatus[row.status] || 'Não informado'}</span></td>
        <td><div className="row-actions"><button className="btn btn-secondary" onClick={() => setHistory(row)}><Eye size={16} /> Visualizar</button>{canManage && ['PENDING', 'OVERDUE'].includes(row.status) && (row.balance ?? row.amount) > 0 && <button className="btn btn-positive" onClick={() => { setError(''); setPayment({ ...row, paymentAmount: row.balance ?? row.amount, paymentMethod: 'PIX' }) }}><CheckCircle size={16} /> Registrar pagamento</button>}</div></td>
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
    {payment && <Modal title="Registrar pagamento" onClose={() => !saving && setPayment(null)}><Feedback error={error} /><p>{payment.member?.person?.fullName}</p><p>{payment.description} · vencimento {dateLabel(payment.dueDate)}</p><p>Saldo em aberto: <strong>{money(payment.balance ?? payment.amount)}</strong></p><label>Valor pago<input type="number" min="0.01" max={payment.balance ?? payment.amount} step="0.01" value={payment.paymentAmount} onChange={e => setPayment({ ...payment, paymentAmount: e.target.value })} /></label><label>Forma de pagamento<select value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>{Object.entries(paymentMethod).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="form-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => setPayment(null)}>Cancelar</button><button className="btn btn-positive" disabled={saving || !Number(payment.paymentAmount)} onClick={pay}>{saving ? 'Registrando…' : 'Confirmar pagamento'}</button></div></Modal>}
    {history && <Modal title="Detalhes da cobrança" onClose={() => setHistory(null)}><h3>{history.description}</h3><p><strong>Associado:</strong> {history.member?.person?.fullName || 'Não informado'}</p><p><strong>Responsável financeiro:</strong> {history.responsibleMember?.person?.fullName || history.member?.person?.fullName || 'Não informado'}</p><p><strong>Vencimento:</strong> {dateLabel(history.dueDate)}</p><p><strong>Situação:</strong> {chargeStatus[history.status] || 'Não informado'}</p><p><strong>Valor:</strong> {money(history.amount)} · <strong>Saldo:</strong> {money(history.balance ?? history.amount)}</p><h4>Histórico de pagamentos</h4>{history.payments.length ? history.payments.map((p: any) => <article className="payment-entry" key={p.id}><strong>{money(p.amount)}</strong><p>{dateTimeLabel(p.paidAt)} · {paymentMethod[p.method] || 'Não informado'}</p><small>Registrado por {p.registeredBy?.person?.fullName || 'Sistema'}</small></article>) : <p>Nenhum pagamento registrado.</p>}</Modal>}
  </main>
}
