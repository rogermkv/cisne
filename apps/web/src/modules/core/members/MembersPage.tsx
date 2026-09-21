import { memberStatus } from '../ui/format'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Users } from 'lucide-react'
import { ApiError, apiUrl } from '../../../api/client'
import { categories, createMember, listMembers, updateMember, uploadMemberPhoto, searchHolders, toggleMemberAccess, resetMemberPassword, type Member } from '../../../api/members'
import './photo.css'

const blank = { fullName: '', cpf: '', birthDate: '', categoryId: '', titularMemberId: '', relationship: '', admissionDate: new Date().toISOString().slice(0, 10), status: 'ACTIVE', phone: '', email: '', city: '', registrationNumber: '', notes: '' }
const dependent = (category: any) => Boolean(category?.isDependent || category?.requiresHolder)
const imageUrl = (path: string) => apiUrl + path
const money = (value: any) => value == null ? 'Não informado' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
type Errors = Record<string, string>

function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: ReactNode }) {
  return <label className={error ? 'field-invalid' : ''}>{label}{children}{error && <small className="field-error" id={name + '-error'}>{error}</small>}</label>
}

export function MembersPage({ onBack }: { onBack: () => void }) {
  const [members, setMembers] = useState<Member[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [selected, setSelected] = useState<Member | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<any>(blank)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<Errors>({})

  const reload = () => {
    setLoading(true)
    return listMembers(query ? '?q=' + encodeURIComponent(query) : '').then(setMembers).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { categories().then(setCats).catch((e) => setError(e.message)); reload() }, [query])
  const open = (member: Member | null) => {
    setError('')
    setValidationErrors({})
    setSelected(member)
    setCreating(!member)
    setForm(member ? { ...blank, ...member.person, categoryId: member.category.id, titularMemberId: member.titularMemberId || '', relationship: member.relationship || '', admissionDate: member.admissionDate, status: member.status, registrationNumber: member.registrationNumber || '' } : { ...blank })
  }
  const close = () => { setSelected(null); setCreating(false); setError('') }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setValidationErrors({})
    try {
      const result = selected ? await updateMember(selected.id, form) : await createMember(form)
      setSelected(result)
      setCreating(false)
      setForm({ ...form, ...result.person, categoryId: result.category.id, titularMemberId: result.titularMemberId || '', status: result.status })
      await reload()
    } catch (e: any) {
      if (e instanceof ApiError && e.field) setValidationErrors({ [e.field]: e.message })
      else setError(e.message || 'Não foi possível salvar o sócio.')
    } finally { setSaving(false) }
  }
  if (selected || creating) return <MemberRecord member={selected} cats={cats} form={form} setForm={setForm} onBack={close} onSave={save} saving={saving} error={error} fieldErrors={validationErrors} onUpdated={(member: Member) => { setSelected(member); setForm({ ...form, ...member.person, status: member.status }) }} />
  return <main className="members-page members-table-page">
    <header className="members-header"><button className="text-button" onClick={onBack}><ArrowLeft size={16} /> Voltar</button><div><span className="eyebrow">Gestão do clube</span><h1>Sócios</h1></div><button className="login-button" onClick={() => open(null)}>+ Novo sócio</button></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="members-toolbar"><input aria-label="Pesquisar sócios" placeholder="Pesquisar nome, CPF ou matrícula" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="members-table-wrap" role="region" aria-label="Lista de sócios" tabIndex={0}><table className="members-table"><thead><tr><th>Nome</th><th>Categoria</th><th>Status</th><th>Responsável financeiro</th><th>Ações</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} onClick={() => open(member)}><td><div className="member-name-cell">{member.person.photoPath ? <img src={imageUrl(member.person.photoPath)} alt="" /> : <span className="table-avatar"><Users size={16} /></span>}<div><strong>{member.person.fullName}</strong><small>{member.person.cpf}</small></div></div></td><td>{member.category.name}</td><td><span className={'status-badge ' + member.status}>{memberStatus[member.status] || 'Não informado'}</span></td><td>{member.financialResponsible?.name || '-'}</td><td><button className="member-row-action" onClick={(event) => { event.stopPropagation(); open(member) }}>Ver / editar</button></td></tr>)}</tbody></table>{loading && <p role="status">Carregando sócios…</p>}{!loading && !members.length && <p className="empty-state">Nenhum sócio encontrado.</p>}</div>
  </main>
}

function HolderPicker({ initial, onChange, error }: any) {
  const [query, setQuery] = useState(initial || '')
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => { if (query.length < 2) { setRows([]); return }; const timer = window.setTimeout(() => searchHolders(query).then(setRows).catch(() => setRows([])), 300); return () => window.clearTimeout(timer) }, [query])
  return <div className="holder-picker"><input required value={query} aria-invalid={Boolean(error)} onChange={(e) => { setQuery(e.target.value); onChange('') }} />{rows.length > 0 && <div className="holder-results">{rows.map((row) => <button type="button" key={row.id} onClick={() => { onChange(row.id); setQuery(row.name + ' - ' + row.cpf); setRows([]) }}>{row.name} - {row.cpf}</button>)}</div>}{error && <small className="field-error">{error}</small>}</div>
}

function MemberRecord({ member, cats, form, setForm, onBack, onSave, saving, error, fieldErrors: externalFieldErrors, onUpdated }: any) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [recordError, setRecordError] = useState('')
  const [localFieldErrors, setLocalFieldErrors] = useState<Errors>({})
  const fieldErrors = { ...(externalFieldErrors || {}), ...localFieldErrors }
  const category = cats.find((item: any) => item.id === form.categoryId)
  const isDependent = dependent(category)
  const set = (name: string, value: any) => { setForm({ ...form, [name]: value }); setLocalFieldErrors({ ...localFieldErrors, [name]: '' }) }
  const upload = async (event: any) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file || !member) return
    setPhotoError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setPhotoError('Formato inválido. Use JPG, JPEG, PNG ou WEBP.')
    if (file.size > 5 * 1024 * 1024) return setPhotoError('A foto deve ter no máximo 5 MB.')
    const preview = URL.createObjectURL(file)
    setPhotoPreview(preview)
    try { const updated = await uploadMemberPhoto(member.id, file); onUpdated(updated) } catch (e: any) { setPhotoError(e.message || 'Não foi possível enviar a foto.') } finally { URL.revokeObjectURL(preview); setPhotoPreview(null) }
  }
  const saveWithErrors = async (event: FormEvent) => {
    setLocalFieldErrors({})
    try { await onSave(event) } catch (e) { /* onSave handles the request */ }
  }
  const actionStatus = async (status: 'ACTIVE' | 'INACTIVE') => {
    if (!member) return
    const message = status === 'INACTIVE' ? 'Tem certeza de que deseja inativar este sócio? O acesso ao aplicativo será desativado.' : 'Deseja reativar este sócio? O acesso ao aplicativo continuará dependendo da ação explícita no cartão de acesso.'
    if (!window.confirm(message)) return
    try {
      const response = await fetch(apiUrl + '/api/members/' + member.id + '/status', { method: 'POST', headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('cisne.accessToken') || ''), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const body = await response.json()
      if (!response.ok) { if (body.field) setLocalFieldErrors({ [body.field]: body.message }); else setRecordError(body.message); return }
      onUpdated(body)
    } catch { setRecordError('Não foi possível alterar a situação do sócio.') }
  }
  const remove = async () => {
    if (!member || !window.confirm('Tem certeza de que deseja excluir este sócio? Esta ação não poderá ser desfeita.')) return
    try {
      const response = await fetch(apiUrl + '/api/members/' + member.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('cisne.accessToken') || '') } })
      const body = await response.json()
      if (!response.ok) { setRecordError(body.message || 'Não foi possível excluir o sócio.'); return }
      onBack()
    } catch { setRecordError('Não foi possível excluir o sócio.') }
  }
  return <main className="members-page member-record-page">
    <button className="text-button record-back" onClick={onBack}><ArrowLeft size={17} /> Voltar aos sócios</button>
    <header className="record-header"><span className="eyebrow">Ficha do sócio</span><h1>{member?.person?.fullName || 'Novo sócio'}</h1>{member && <span className="record-subtitle">{member.category.name} · <span className={'status-badge ' + member.status}>{memberStatus[member.status]}</span></span>}</header>
    <section className="record-grid"><form className="member-form record-card" onSubmit={saveWithErrors}><h2>Dados cadastrais</h2>{(error || recordError) && <p className="form-error" role="alert">{error || recordError}</p>}
      {!isDependent && <section className="member-photo-admin"><strong>Foto do sócio</strong><div className="member-photo-preview">{photoPreview || member?.person?.photoPath ? <img src={photoPreview || imageUrl(member.person.photoPath)} alt="Sócio" /> : <div className="photo-placeholder"><Users size={38} /><span>Sem foto</span></div>}</div>{member && <label className="photo-upload-button">Enviar / alterar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>}{photoError && <small className="photo-error">{photoError}</small>}</section>}
      <Field name="fullName" label="Nome completo" error={fieldErrors.fullName}><input required value={form.fullName || ''} onChange={(e) => set('fullName', e.target.value)} aria-invalid={Boolean(fieldErrors.fullName)} /></Field>
      <Field name="cpf" label="CPF" error={fieldErrors.cpf}><input required value={form.cpf || ''} onChange={(e) => set('cpf', e.target.value)} aria-invalid={Boolean(fieldErrors.cpf)} /></Field>
      <Field name="birthDate" label="Data de nascimento" error={fieldErrors.birthDate}><input required type="date" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} aria-invalid={Boolean(fieldErrors.birthDate)} /></Field>
      <Field name="phone" label="Telefone" error={fieldErrors.phone}><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field name="email" label="E-mail" error={fieldErrors.email}><input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field name="city" label="Cidade"><input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
      <Field name="registrationNumber" label="Matrícula" error={fieldErrors.registrationNumber}><input value={form.registrationNumber || ''} onChange={(e) => set('registrationNumber', e.target.value)} /></Field>
      <Field name="categoryId" label="Categoria" error={fieldErrors.categoryId}><select required value={form.categoryId || ''} onChange={(e) => { const next = cats.find((item: any) => item.id === e.target.value); setForm({ ...form, categoryId: e.target.value, titularMemberId: dependent(next) ? form.titularMemberId : '', relationship: dependent(next) ? form.relationship : '' }); setLocalFieldErrors({ ...localFieldErrors, categoryId: '' }) }}><option value="">Selecione</option>{cats.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {isDependent && <><Field name="titularMemberId" label="Sócio titular" error={fieldErrors.titularMemberId}><HolderPicker initial={member?.titular?.person?.fullName} value={form.titularMemberId} onChange={(value: string) => set('titularMemberId', value)} error={fieldErrors.titularMemberId} /></Field><Field name="relationship" label="Parentesco" error={fieldErrors.relationship}><input required value={form.relationship || ''} onChange={(e) => set('relationship', e.target.value)} /></Field></>}
      <Field name="status" label="Status" error={fieldErrors.status}><select value={form.status || 'ACTIVE'} onChange={(e) => set('status', e.target.value)}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option><option value="SUSPENDED">Suspenso</option><option value="TERMINATED">Desligado</option></select></Field>
      <Field name="admissionDate" label="Data de ingresso" error={fieldErrors.admissionDate}><input required type="date" value={form.admissionDate || ''} onChange={(e) => set('admissionDate', e.target.value)} aria-invalid={Boolean(fieldErrors.admissionDate)} /></Field>
      <Field name="notes" label="Observações"><textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} /></Field>
      <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={onBack}>Cancelar</button><button className="login-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button></div>
    </form>
    {member && <aside className="record-side">
      <section className="record-card"><h2>Acesso ao aplicativo</h2><p>Login: <strong>{member.person.cpf}</strong></p><p>Status: {member.access?.active === false ? 'Inativo' : 'Ativo'}</p><p>Último acesso: {member.access?.lastLoginAt ? new Date(member.access.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</p><button className="member-row-action" onClick={async () => { if (window.confirm('Redefinir a senha para a data de nascimento?')) { await resetMemberPassword(member.id); window.alert('Senha redefinida.') } }}>Redefinir senha</button><button className="member-row-action" onClick={async () => { await toggleMemberAccess(member.id, member.access?.active === false); onUpdated({ ...member, access: { ...(member.access || {}), active: member.access?.active === false } }) }}>{member.access?.active === false ? 'Ativar acesso' : 'Desativar acesso'}</button></section>
      <section className="record-card"><h2>Situação do sócio</h2><p>Status: <strong>{memberStatus[member.status] || member.status}</strong></p>{fieldErrors.status && <p className="form-error">{fieldErrors.status}</p>}{member.status === 'ACTIVE' ? <button className="btn btn-secondary" onClick={() => actionStatus('INACTIVE')}>Inativar sócio</button> : <button className="btn btn-positive" onClick={() => actionStatus('ACTIVE')}>Reativar sócio</button>}<button className="danger-link member-delete-button" onClick={remove}>Excluir sócio</button></section>
      <section className="record-card"><h2>Resumo financeiro</h2><p>{member.category.isDependent ? 'Responsável financeiro: ' + (member.financialResponsible?.name || 'titular') : 'Responsável financeiro: este sócio'}</p>{member.charges?.length ? member.charges.map((charge: any) => <div className="member-finance-summary" key={charge.id}><strong>{charge.description}</strong><span>{money(charge.amount)}</span><em className="status-badge">{charge.status === 'OVERDUE' ? 'Em atraso' : 'Pendente'}</em></div>) : <p className="muted">Nenhuma cobrança pendente ou em atraso.</p>}</section>
      <section className="record-card"><h2>Dependentes</h2>{member.dependents?.length ? member.dependents.map((item: any) => <div className="member-dependent-summary" key={item.id}><strong>{item.person.fullName}</strong><span>{item.relationship || 'Parentesco não informado'} · {item.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span></div>) : <p className="muted">Nenhum dependente cadastrado.</p>}</section>
    </aside>}</section>
  </main>
}
