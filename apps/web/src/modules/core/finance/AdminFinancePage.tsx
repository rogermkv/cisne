import { ArrowLeft, ChevronDown, CheckCircle, MoreVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { useAuth } from '../auth/AuthProvider'
import { hasPermission } from '../auth/permissions'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { chargeStatus, dateLabel, money, paymentMethod } from '../ui/format'
import { whatsappUrl } from '../members/phone'
import { chargeSeasons } from './seasons'
import { PaymentHistory } from './PaymentHistory'
import { SecretaryAnnualPlans } from './SecretaryAnnualPlans'
import { ChargeDocuments } from './ChargeDocuments'
import { FinanceWorkspace } from './FinanceWorkspace'
import type { Member } from '../../../api/members'
import './finance.css'
import '../member-area/member-finance.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const today = () => new Date().toISOString().slice(0, 10)
const monthValue = () => today().slice(0, 7)
const emptyCharge = { memberId: '', description: '', amount: '', dueDate: '', referenceYear: String(new Date().getFullYear()), type: 'ANNUAL_FEE' }
const typeLabels: Record<string, string> = { ANNUAL_FEE: 'Anuidade', RESERVATION: 'Reserva', EVENT: 'Evento', OTHER: 'Outro' }
const statusOptions = ['PENDING', 'OVERDUE', 'PARTIAL', 'PAID', 'CANCELLED']
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
  const canPay = (row: any) => canManage && (row.type !== 'ANNUAL_FEE' || Boolean(row.annualEnrollmentId)) && (!row.annualEnrollmentId || user?.activeRole === 'SECRETARIA') && !row.documents?.some((doc: any) => doc.kind === 'PROOF' && doc.status === 'PENDING')
  const [rows, setRows] = useState<any[]>([]), [members, setMembers] = useState<any[]>([]), [annualSeasons, setAnnualSeasons] = useState<any[]>([]), [overdueInstallments, setOverdueInstallments] = useState<any[]>([])
  const [seasonFilter, setSeasonFilter] = useState('')
  const seasons = useMemo(() => [...new Set([...chargeSeasons(rows).map(group => group.year), ...annualSeasons.map(season => String(season.endYear))])].sort().reverse().map(year => ({ year })), [rows, annualSeasons])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState(''), [type, setType] = useState('')
  const period = monthValue()
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [payment, setPayment] = useState<any>(null), [detail, setDetail] = useState<any>(null), [editor, setEditor] = useState<any>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const requests: Promise<any>[] = [apiRequest<any[]>('/api/finance/charges' + (member ? '?memberId=' + encodeURIComponent(member.id) : ''), auth()), apiRequest<any>('/api/annualities', auth())]
      if (!member) requests.push(apiRequest<any>('/api/finance/overdue-installments', auth()))
      const [charges, annual, overdue] = await Promise.all(requests)
      setRows(charges); setAnnualSeasons(annual.seasons.filter((season: any) => season.enrollmentOpen)); if (!member) setOverdueInstallments(overdue.accounts || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [member?.id])
  useEffect(() => { if (member) { setMembers([member]); return } if (canManage) apiRequest<any[]>('/api/members', auth()).then(setMembers).catch(e => setError(e.message)) }, [canManage, member?.id])

  const types = useMemo(() => [...new Set([...Object.keys(typeLabels), ...rows.map(row => row.type).filter(Boolean)])], [rows])
  const filtered = useMemo(() => rows.filter(row => (!seasonFilter || String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()) === seasonFilter) && (!status || row.status === status) && (!type || row.type === type)), [rows, seasonFilter, status, type])
  const groups = useMemo(() => { const current = chargeSeasons(filtered); if (!status && (!type || type === 'ANNUAL_FEE')) for (const season of annualSeasons) if ((!seasonFilter || seasonFilter === String(season.endYear)) && !current.some(group => group.year === String(season.endYear))) current.push({ year: String(season.endYear), charges: [], total: 0, paid: 0, balance: 0, status: 'PENDING' }); return current.sort((a, b) => Number(b.year) - Number(a.year)) }, [filtered, annualSeasons, status, type, seasonFilter])
  const account = useMemo(() => { const active = rows.filter(row => row.status !== 'CANCELLED'); return { open: active.filter(isOpen).reduce((sum, row) => sum + Number(row.balance ?? row.amount), 0), overdue: active.filter(row => row.status === 'OVERDUE').reduce((sum, row) => sum + Number(row.balance ?? row.amount), 0), paid: active.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0) } }, [rows])

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
        {expanded.has(group.year) && <div className="family-season-body" id={'family-season-' + group.year}><SecretaryAnnualPlans memberId={member.id} responsibleName={member.financialResponsible?.name || member.titular?.person.fullName || member.person.fullName} referenceYear={Number(group.year)} charges={rows.filter(row => String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()) === group.year)} secretary={user?.activeRole === 'SECRETARIA'} seasonAvailable={annualSeasons.some(season => season.endYear === Number(group.year))} onChange={load} />{group.charges.some(row => row.annualEnrollmentId) && <h4>2. Recebimentos</h4>}<div className="family-season-totals"><span>Total: <strong>{money(group.total)}</strong></span><span>Pago: <strong>{money(group.paid)}</strong></span><span>Saldo: <strong>{money(group.balance)}</strong></span></div>{group.charges.map(row => <article className="family-charge" key={row.id} aria-label={row.description}>
          <div className="family-charge-heading"><div><h4>{row.description}</h4><p>{typeLabels[row.type] || row.type} · Vencimento: {dateLabel(row.dueDate)}</p>{row.memberId !== member.id && <p>Associado: {row.member?.person?.fullName}</p>}</div><span className={'status-badge ' + row.status}>{chargeStatus[row.status]}</span></div>
          <dl className="family-charge-values"><div><dt>Valor original</dt><dd>{money(row.amount)}</dd></div><div><dt>Pago</dt><dd>{money(row.paidAmount)}</dd></div><div><dt>Saldo em aberto</dt><dd>{money(row.status === 'CANCELLED' ? 0 : row.balance ?? row.amount)}</dd></div></dl>
          <div className="family-charge-actions">{canPay(row) && isOpen(row) && <button className="btn btn-positive btn-compact" disabled={saving || loading} onClick={() => openPayment(row)}><CheckCircle size={15} /> Confirmar recebimento</button>}<details className="finance-action-menu"><summary aria-label="Mais ações"><MoreVertical size={18} /></summary><div><button disabled={saving || loading} onClick={() => setDetail(row)}>Detalhes da cobrança</button>{canManage && !row.annualEnrollmentId && isOpen(row) && !row.payments?.length && <><button disabled={saving || loading} onClick={() => setEditor({ id: row.id, form: { memberId: row.memberId, description: row.description, amount: String(row.amount), dueDate: String(row.dueDate).slice(0, 10), referenceYear: String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()), type: row.type } })}>Editar cobrança</button><button disabled={saving || loading} onClick={() => cancelCharge(row)}>Cancelar cobrança</button></>}{contact(row) && isOpen(row) && <a href={contact(row)!} target="_blank" rel="noopener noreferrer">Cobrar via WhatsApp</a>}</div></details></div>
          <PaymentHistory row={row} secretary={user?.activeRole === 'SECRETARIA'} onChange={async () => { setMessage('Correção de pagamento registrada.'); await load() }} />
          <ChargeDocuments row={row} secretary={user?.activeRole === 'SECRETARIA'} onChange={load} />
        </article>)}</div>}
      </section>)}</div>{!groups.length && <p className="empty-state">Nenhuma cobrança encontrada para os filtros selecionados.</p>}</>}
    </div>}
    {!member && <FinanceWorkspace annualSeasons={annualSeasons} rows={rows} overdueInstallments={overdueInstallments} season={seasonFilter} onSeason={setSeasonFilter} loading={loading} saving={saving} canManage={canManage} canPay={canPay} secretary={user?.activeRole === 'SECRETARIA'} onRefresh={load} contact={contact} onPayment={openPayment} onDetail={setDetail} onCancel={cancelCharge} onNew={() => { setError(''); setEditor({ form: { ...emptyCharge, referenceYear: seasonFilter || period.slice(0, 4), dueDate: `${seasonFilter || period.slice(0, 4)}-${period.slice(5)}-01` } }) }} onEdit={row => { setError(''); setEditor({ id: row.id, form: { memberId: row.memberId, description: row.description, amount: String(row.amount), dueDate: String(row.dueDate).slice(0, 10), referenceYear: String(row.referenceYear || new Date(row.dueDate).getUTCFullYear()), type: row.type } }) }} />}
    {editor && <Modal title={editor.id ? 'Editar cobrança' : 'Nova cobrança'} onClose={() => !saving && setEditor(null)}><form className="ui-form" onSubmit={createOrEdit}><Feedback error={error} /><label>Sócio<select aria-label="Sócio" required disabled={Boolean(editor.id || member)} value={editor.form.memberId} onChange={e => setEditor({ ...editor, form: { ...editor.form, memberId: e.target.value } })}><option value="">Selecione</option>{members.map(m => <option key={m.id} value={m.id}>{m.person.fullName} · {m.category?.name || 'Categoria'}</option>)}</select></label><label>Descrição<input required value={editor.form.description} onChange={e => setEditor({ ...editor, form: { ...editor.form, description: e.target.value } })} /></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={editor.form.amount} onChange={e => setEditor({ ...editor, form: { ...editor.form, amount: e.target.value } })} /></label><label>Vencimento<input required type="date" value={editor.form.dueDate} onChange={e => setEditor({ ...editor, form: { ...editor.form, dueDate: e.target.value } })} /></label><label>Tipo<select value={editor.form.type} onChange={e => setEditor({ ...editor, form: { ...editor.form, type: e.target.value } })}>{types.map(key => <option key={key} value={key}>{typeLabels[key] || key}</option>)}</select></label><label>Ano de referência<input required type="number" min="1900" max="9999" value={editor.form.referenceYear} onChange={e => setEditor({ ...editor, form: { ...editor.form, referenceYear: e.target.value } })} /></label><div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditor(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : editor.id ? 'Salvar alterações' : 'Criar cobrança'}</button></div></form></Modal>}
    {payment && <Modal title="Confirmar recebimento" onClose={() => !saving && setPayment(null)}><Feedback error={error} /><div className="finance-payment-summary"><strong>{payment.description}</strong><span>{payment.member?.person?.fullName}</span><span>Valor original: {money(payment.amount)}</span><span>Já pago: {money(payment.paidAmount)}</span><span>Saldo: <b>{money(payment.balance ?? payment.amount)}</b></span></div><p>Use após conferir o pagamento. Esta ação confirma um valor recebido e não altera o parcelamento.</p><div className="ui-form finance-receipt-form"><label>Valor recebido<input type="number" min="0.01" max={payment.balance ?? payment.amount} step="0.01" value={payment.paymentAmount} onChange={e => setPayment({ ...payment, paymentAmount: e.target.value })} /></label><label>Data do pagamento<input type="date" required value={payment.paidAt} onChange={e => setPayment({ ...payment, paidAt: e.target.value })} /></label><label>Meio de recebimento<select value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>{Object.entries(paymentMethod).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Observação<textarea rows={3} value={payment.notes} onChange={e => setPayment({ ...payment, notes: e.target.value })} /></label></div><div className="form-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => setPayment(null)}>Cancelar</button><button className="btn btn-positive" disabled={saving} onClick={registerPayment}>{saving ? 'Registrando…' : 'Confirmar recebimento'}</button></div></Modal>}
    {detail && <Modal title="Detalhes da cobrança" onClose={() => setDetail(null)}><h3>{detail.description}</h3><p><strong>Associado:</strong> {detail.member?.person?.fullName || 'Não informado'}</p>{detail.member?.category?.name && <p><strong>Categoria:</strong> {detail.member.category.name}</p>}<p><strong>CPF:</strong> {detail.member?.person?.cpfMasked || 'Não informado'}</p><p><strong>Responsável financeiro:</strong> {detail.responsibleMember?.id === detail.member?.id ? 'O próprio associado' : detail.responsibleMember?.person?.fullName || 'Não informado'}</p><p><strong>Vencimento:</strong> {dateLabel(detail.dueDate)}</p><p><strong>Situação:</strong> {chargeStatus[detail.status] || 'Não informado'}</p><p><strong>Valor original:</strong> {money(detail.amount)} · <strong>Saldo:</strong> {money(detail.balance ?? detail.amount)}</p><PaymentHistory row={detail} secretary={user?.activeRole === 'SECRETARIA'} onChange={async () => { setDetail(null); setMessage('Correção de pagamento registrada.'); await load() }} /></Modal>}
  </section>
}
