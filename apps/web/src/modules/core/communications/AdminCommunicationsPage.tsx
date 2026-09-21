import { ArrowLeft, Edit3, Plus, Power, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { dateTimeLabel, localDateTime, money } from '../ui/format'
import { useAuth } from '../auth/AuthProvider'
import { hasPermission } from '../auth/permissions'
import './community.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const empty = { title: '', content: '', start: '', end: '', location: '', capacity: '', memberPrice: '', guestPrice: '', audience: 'ALL_MEMBERS' }
export function AdminCommunicationsPage({ kind, onBack }: { kind: 'announcements' | 'events'; onBack: () => void }) {
  const { user } = useAuth()
  const canManage = hasPermission(user, `${kind}.manage`)
  const [rows, setRows] = useState<any[]>([]), [filter, setFilter] = useState(''), [form, setForm] = useState(empty), [editing, setEditing] = useState<any>(null)
  const [show, setShow] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true)
  const isNotice = kind === 'announcements'
  const load = async () => {
    setLoading(true)
    try { setRows(await apiRequest<any[]>(`/api/${kind}${isNotice && filter ? `?filter=${filter}` : ''}`, auth())) }
    catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { setRows([]); setShow(false); setError(''); setMessage(''); void load() }, [kind, filter])
  const edit = (row: any) => {
    setError(''); setEditing(row)
    setForm({ title: row.title, content: isNotice ? row.content : row.description, start: localDateTime(row.startDate || row.startDateTime), end: localDateTime(row.endDate || row.endDateTime), location: row.location || '', capacity: row.capacity ?? '', memberPrice: row.memberPrice ?? '', guestPrice: row.guestPrice ?? '', audience: row.audience || 'ALL_MEMBERS' })
    setShow(true)
  }
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (form.end && new Date(form.end) < new Date(form.start)) { setError('O fim deve ser posterior ao início.'); return }
    const start = new Date(form.start).toISOString(), end = form.end ? new Date(form.end).toISOString() : null
    const body = isNotice
      ? { title: form.title.trim(), content: form.content.trim(), startDate: start, endDate: end, audience: form.audience, active: editing?.active !== false }
      : { title: form.title.trim(), description: form.content.trim(), startDateTime: start, endDateTime: end, location: form.location || null, capacity: form.capacity === '' ? null : Number(form.capacity), memberPrice: form.memberPrice === '' ? null : Number(form.memberPrice), guestPrice: form.guestPrice === '' ? null : Number(form.guestPrice), active: editing?.active !== false }
    setSaving(true)
    try {
      await apiRequest(editing ? `/api/${kind}/${editing.id}` : `/api/${kind}`, { method: editing ? 'PUT' : 'POST', ...auth(), body: JSON.stringify(body) })
      setShow(false); setEditing(null); setForm(empty); setMessage(editing ? 'Alteração salva.' : isNotice ? 'Aviso criado.' : 'Evento criado.'); await load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const toggle = async (row: any) => {
    setSaving(true); setError(''); setMessage('')
    try { await apiRequest(`/api/${kind}/${row.id}/toggle`, { method: 'POST', ...auth() }); setMessage(row.active ? 'Registro desativado.' : 'Registro ativado.'); await load() }
    catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  return <main className="community-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button><span className="eyebrow">Gestão administrativa</span><h1>{isNotice ? 'Avisos' : 'Eventos'}</h1>
    {!show && <Feedback error={error} message={message} />}
    <div className="section-heading"><h2>{isNotice ? 'Comunicados do clube' : 'Agenda do clube'}</h2>{canManage && <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(empty); setError(''); setShow(true) }}><Plus size={18} /> {isNotice ? 'Novo aviso' : 'Novo evento'}</button>}</div>
    {isNotice && <div className="filter-bar"><label>Publicação<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option><option value="future">Futuros</option><option value="published">Publicados</option><option value="expired">Expirados</option><option value="inactive">Inativos</option></select></label></div>}
    {loading ? <p role="status">Carregando registros…</p> : !rows.length && <p className="community-empty">Nenhum registro encontrado.</p>}
    <div className="management-list">{rows.map(row => <article className="management-card" key={row.id}>
      <div className="management-card-heading"><h2>{row.title}</h2><span className={`status-badge ${row.active ? 'ACTIVE' : 'INACTIVE'}`}>{row.active ? 'Ativo' : 'Inativo'}</span></div>
      <p>{isNotice ? row.content : row.description}</p><p className="muted">{dateTimeLabel(row.startDate || row.startDateTime)}{(row.endDate || row.endDateTime) && ` até ${dateTimeLabel(row.endDate || row.endDateTime)}`}</p>
      {isNotice ? <p className="muted">Público: {row.audience === 'HOLDERS_ONLY' ? 'Somente titulares' : 'Todos os sócios'}</p> : <p className="muted">{row.location || 'Local não informado'} · {row.capacity ? `Até ${row.capacity} pessoas` : 'Capacidade não informada'} · Sócio: {money(row.memberPrice)} · Visitante: {money(row.guestPrice)}</p>}
      {canManage && <div className="row-actions"><button className="btn btn-edit" onClick={() => edit(row)}><Edit3 size={16} /> Editar</button><button className={`btn ${row.active ? 'btn-secondary' : 'btn-positive'}`} disabled={saving} onClick={() => toggle(row)}><Power size={16} /> {row.active ? 'Desativar' : 'Ativar'}</button></div>}
    </article>)}</div>
    {show && <Modal title={editing ? isNotice ? 'Editar aviso' : 'Editar evento' : isNotice ? 'Novo aviso' : 'Novo evento'} onClose={() => !saving && setShow(false)}>
      <form className="ui-form" onSubmit={save}><Feedback error={error} />
        <label>Título<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>{isNotice ? 'Conteúdo' : 'Descrição'}<textarea required rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></label>
        <label>Início<input required type="datetime-local" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label>
        <label>Fim (opcional)<input type="datetime-local" min={form.start} value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
        {isNotice ? <label>Público<select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}><option value="ALL_MEMBERS">Todos os sócios</option><option value="HOLDERS_ONLY">Somente titulares</option></select></label> : <>
          <label>Local<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
          <label>Capacidade<input type="number" min="1" step="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></label>
          <label>Valor para sócio (R$)<input type="number" min="0" step="0.01" value={form.memberPrice} onChange={e => setForm({ ...form, memberPrice: e.target.value })} /></label>
          <label>Valor para visitante (R$)<input type="number" min="0" step="0.01" value={form.guestPrice} onChange={e => setForm({ ...form, guestPrice: e.target.value })} /></label>
        </>}
        <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShow(false)}>Cancelar</button><button className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}</button></div>
      </form>
    </Modal>}
  </main>
}
