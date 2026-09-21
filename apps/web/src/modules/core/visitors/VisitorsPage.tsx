import { ArrowLeft, Ban, Edit3, Eye, Plus, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { dateLabel, invitationStatus } from '../ui/format'
import { useAuth } from '../auth/AuthProvider'
import { hasPermission } from '../auth/permissions'
import '../communications/community.css'
const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const empty = { fullName: '', cpf: '', phone: '', city: '', email: '', birthDate: '' }
export function VisitorsPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth(), canManage = hasPermission(user, 'visitors.manage')
  const [visitors, setVisitors] = useState<any[]>([]), [members, setMembers] = useState<any[]>([]), [show, setShow] = useState(false), [inviteFor, setInviteFor] = useState<any>(null)
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [query, setQuery] = useState('')
  const [form, setForm] = useState(empty), [invite, setInvite] = useState({ sponsorMemberId: '', scheduledDate: '' }), [history, setHistory] = useState<any>(null), [profile, setProfile] = useState<any>(null), [editing, setEditing] = useState<any>(null)
  const load = async () => { setLoading(true); try { setVisitors(await apiRequest<any[]>('/api/visitors', auth())) } catch (e: any) { setError(e.message) } finally { setLoading(false) } }
  useEffect(() => { void load(); if (canManage) apiRequest<any[]>('/api/members', auth()).then(setMembers).catch(e => setError(e.message)) }, [canManage])
  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true)
    try { await apiRequest(editing ? `/api/visitors/${editing.id}` : '/api/visitors', { method: editing ? 'PUT' : 'POST', ...auth(), body: JSON.stringify(form) }); setShow(false); setEditing(null); setForm(empty); setMessage(editing ? 'Visitante atualizado.' : 'Visitante cadastrado.'); await load() }
    catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const block = async (visitor: any) => {
    setSaving(true); setError(''); setMessage('')
    try { await apiRequest(`/api/visitors/${visitor.id}/block`, { method: 'POST', ...auth() }); setMessage(visitor.blocked ? 'Visitante desbloqueado.' : 'Visitante bloqueado.'); await load() }
    catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const createInvite = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try { await apiRequest('/api/invitations', { method: 'POST', ...auth(), body: JSON.stringify({ visitorId: inviteFor.id, ...invite }) }); setInviteFor(null); setInvite({ sponsorMemberId: '', scheduledDate: '' }); setMessage('Convite criado.'); await load() }
    catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const filtered = visitors.filter(v => `${v.person.fullName} ${v.person.cpf}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  return <main className="community-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button><span className="eyebrow">Gestão administrativa</span><h1>Visitantes e convites</h1>
    {!show && !inviteFor && <Feedback error={error} message={message} />}
    <div className="section-heading"><h2>Visitantes cadastrados</h2>{canManage && <button className="btn btn-primary" onClick={() => { setError(''); setShow(true) }}><Plus size={18} /> Novo visitante</button>}</div>
    <div className="filter-bar"><label>Pesquisar visitante<input placeholder="Nome ou CPF" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <div className="table-scroll" role="region" aria-label="Visitantes" tabIndex={0}><table className="data-table"><thead><tr><th>Visitante</th><th>Contato</th><th>Situação</th><th className="numeric">Visitas no ano</th><th className="actions-column">Ações</th></tr></thead><tbody>{filtered.map(v => <tr key={v.id}>
      <td><strong>{v.person.fullName}</strong><small>{v.person.cpf}</small></td><td>{v.person.phone || 'Sem telefone'}<small>{v.person.city || 'Sem cidade'}</small></td>
      <td><span className={`status-badge ${v.blocked ? 'SUSPENDED' : v.active ? 'ACTIVE' : 'INACTIVE'}`}>{v.blocked ? 'Bloqueado' : v.active ? 'Ativo' : 'Inativo'}</span></td><td className="numeric">{v.visitsThisYear}</td>
      <td><div className="row-actions"><button className="btn btn-secondary" onClick={() => setProfile(v)}><Eye size={16} /> Ver perfil</button>{canManage && <><button className="btn btn-edit" onClick={() => { setEditing(v); setForm({ fullName: v.person.fullName, cpf: v.person.cpf, phone: v.person.phone || '', city: v.person.city || '', email: v.person.email || '', birthDate: v.person.birthDate ? v.person.birthDate.slice(0, 10) : '' }); setError(''); setShow(true) }}><Edit3 size={16} /> Editar</button><button className={`btn ${v.blocked ? 'btn-positive' : 'btn-secondary'}`} disabled={saving} onClick={() => block(v)}><Ban size={16} /> {v.blocked ? 'Desbloquear' : 'Bloquear'}</button><button className="btn btn-primary" disabled={v.blocked || !v.active} onClick={() => { setError(''); setInviteFor(v) }}>Criar convite</button></>}<button className="btn btn-secondary" onClick={() => setHistory(v)}>Convites</button></div></td>
    </tr>)}</tbody></table>{loading ? <p className="empty-state" role="status">Carregando visitantes…</p> : !filtered.length && <p className="empty-state">Nenhum visitante encontrado.</p>}</div>
    {show && <Modal title={editing ? 'Editar visitante' : 'Novo visitante'} onClose={() => !saving && (setShow(false), setEditing(null))}><form className="ui-form" onSubmit={create}><Feedback error={error} />
      {(['fullName', 'cpf', 'phone', 'city', 'email', 'birthDate'] as const).map(field => <label key={field}>{{ fullName: 'Nome completo', cpf: 'CPF', phone: 'Telefone', city: 'Cidade', email: 'E-mail (opcional)', birthDate: 'Nascimento (opcional)' }[field]}<input required={['fullName', 'cpf', 'phone', 'city'].includes(field)} type={field === 'birthDate' ? 'date' : field === 'email' ? 'email' : 'text'} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} /></label>)}
      <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setShow(false); setEditing(null) }}>Cancelar</button><button className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar'}</button></div>
    </form></Modal>}
    {inviteFor && <Modal title="Criar convite" onClose={() => !saving && setInviteFor(null)}><p>{inviteFor.person.fullName}</p><form className="ui-form" onSubmit={createInvite}><Feedback error={error} />
      <label>Sócio responsável<select required value={invite.sponsorMemberId} onChange={e => setInvite({ ...invite, sponsorMemberId: e.target.value })}><option value="">Selecione</option>{members.filter(m => m.status === 'ACTIVE').map(m => <option key={m.id} value={m.id}>{m.person.fullName}</option>)}</select></label>
      <label>Data do convite<input required type="date" value={invite.scheduledDate} onChange={e => setInvite({ ...invite, scheduledDate: e.target.value })} /></label>
      <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setInviteFor(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar convite'}</button></div>
    </form></Modal>}
    {history && <Modal title="Convites do visitante" onClose={() => setHistory(null)}><h3>{history.person.fullName}</h3>{history.invitations?.length ? history.invitations.map((item: any) => <article className="payment-entry" key={item.id}><strong>{dateLabel(item.scheduledDate)} · {invitationStatus[item.status] || 'Não informado'}</strong><p>Responsável: {item.sponsorMember?.person?.fullName || 'Não informado'}</p></article>) : <p>Nenhum convite cadastrado.</p>}</Modal>}
    {profile && <Modal title="Perfil do visitante" onClose={() => setProfile(null)}><section className="profile-summary"><h3>{profile.person.fullName}</h3><p>CPF: {profile.person.cpf}</p><p>Telefone: {profile.person.phone || '—'} · Cidade: {profile.person.city || '—'}</p><p>E-mail: {profile.person.email || '—'} · Nascimento: {dateLabel(profile.person.birthDate)}</p><p>Situação: {profile.blocked ? 'Bloqueado' : profile.active ? 'Ativo' : 'Inativo'}</p><p><strong>{profile.visitsThisYear}</strong> visita(s) utilizada(s) neste ano.</p></section></Modal>}
  </main>
}

