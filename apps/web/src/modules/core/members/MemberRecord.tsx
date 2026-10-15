import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Pencil, UserRound } from 'lucide-react'
import { deleteMember, resetMemberPassword, searchHolders, setMemberStatus, toggleMemberAccess, type Member } from '../../../api/members'
import { usePrivateMemberPhoto } from '../../../components/PrivateMemberPhoto'
import { useAuth } from '../auth/AuthProvider'
import { dateLabel, dateTimeLabel, memberStatus } from '../ui/format'
import { AdminFinancePage } from '../finance/AdminFinancePage'
import { VisitorsPage } from '../visitors/VisitorsPage'
import { AdminReservationsPage } from '../reservations/AdminReservationsPage'
import { MemberHistoryTabs } from './MemberHistoryTabs'
import { MemberPhotoEditor } from './MemberPhotoEditor'
import './member-record.css'

type Errors = Record<string, string>
type Tab = 'registration' | 'dependents' | 'finance' | 'invitations' | 'reservations' | 'entries' | 'access'
const isDependent = (category: any) => Boolean(category?.isDependent || category?.requiresHolder)
function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: ReactNode }) { return <label data-field={name} className={error ? 'field-invalid' : ''}>{label}{children}{error && <small className="field-error">{error}</small>}</label> }
function Data({ label, children }: { label: string; children?: ReactNode }) { return <div className="record-data"><dt>{label}</dt><dd>{children || 'Não informado'}</dd></div> }

export function MemberRecord({ member, returnTo, dependentParent, cats, form, setForm, onBack, onSave, saving, error, fieldErrors, onOpen, onNewDependent, onRefresh, onClearErrors }: any) {
  const { user } = useAuth()
  const canManage = Boolean(user?.permissions.includes('members.manage'))
  const [tab, setTab] = useState<Tab>('registration')
  const [editing, setEditing] = useState(!member)
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; url: string } | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [action, setAction] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const savedForm = useRef({ ...form })
  const formHeading = useRef<HTMLHeadingElement>(null)
  const privatePhotoUrl = usePrivateMemberPhoto(member?.id, member?.person.photoPath)
  const category = cats.find((c: any) => c.id === form.categoryId)
  const dep = isDependent(category || member?.category)
  const newDep = Boolean(dependentParent && !member)
  const dirty = editing && (JSON.stringify(form) !== JSON.stringify(savedForm.current) || Boolean(pendingPhoto) || removePhoto)
  const busy = saving || Boolean(action)
  const errors: Errors = fieldErrors || {}

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => () => { if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url) }, [pendingPhoto])
  useEffect(() => {
    if (!dirty) return
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  useEffect(() => { if (editing) formHeading.current?.focus() }, [editing])

  const clearDraft = () => { setPendingPhoto(null); setRemovePhoto(false); onClearErrors() }
  const cancel = () => {
    if (busy) return
    if (!member) { onBack(); return }
    setForm({ ...savedForm.current }); clearDraft(); setEditing(false)
  }
  const leave = (next: () => void) => {
    if (busy || (dirty && !window.confirm('Descartar as alterações não salvas?'))) return
    if (editing && member) cancel()
    next()
  }
  const edit = () => { savedForm.current = { ...form }; clearDraft(); setNotice(''); setEditing(true); setTab('registration') }
  const set = (key: string, value: any) => setForm({ ...form, [key]: value })
  const submit = async (event: FormEvent) => {
    const ok = await onSave(event, pendingPhoto?.file, removePhoto)
    if (ok) { clearDraft(); setEditing(false); setNotice('Cadastro salvo com sucesso.') }
  }
  const runAction = async (name: string, operation: () => Promise<void>) => {
    setAction(name); setActionError(''); setNotice('')
    try { await operation() } catch (e: any) { setActionError(e.message || 'Não foi possível concluir a operação.') } finally { setAction('') }
  }
  const changeStatus = () => {
    const active = member.status !== 'ACTIVE'
    if (!window.confirm(active ? 'Reativar este sócio? O acesso ao aplicativo continuará como está.' : 'Inativar este sócio? Isso também desativará o acesso ao aplicativo.')) return
    void runAction('status', async () => { await setMemberStatus(member.id, active ? 'ACTIVE' : 'INACTIVE'); await onRefresh(member.id); setNotice('Situação do sócio atualizada.') })
  }
  const remove = () => {
    if (!window.confirm('Excluir definitivamente este sócio? Cadastros com histórico ou vínculos não podem ser excluídos.')) return
    void runAction('delete', async () => { await deleteMember(member.id); onBack() })
  }
  const tabs: { key: Tab; label: string }[] = [
    { key: 'registration', label: 'Cadastro' },
    ...(!dep ? [{ key: 'dependents' as const, label: `Dependentes (${member?.dependents?.length || 0})` }] : []),
    { key: 'finance', label: 'Financeiro' }, { key: 'invitations', label: 'Convites' }, { key: 'reservations', label: 'Reservas' }, { key: 'entries', label: 'Acessos' }, { key: 'access', label: 'Acesso ao sistema' },
  ]
  const photoUrl = pendingPhoto?.url || (removePhoto ? null : privatePhotoUrl)
  return <main className="members-page member-record-page record-workspace">
    <button className="text-button record-back" disabled={busy} onClick={() => leave(onBack)}><ArrowLeft size={17} />{returnTo || dependentParent ? 'Voltar ao titular' : 'Voltar aos sócios'}</button>
    <header className="record-identity">
      <div className="record-identity-photo">{photoUrl ? <img src={photoUrl} alt="Foto do sócio" /> : <UserRound size={30} aria-label="Sem foto" />}</div>
      <div className="record-identity-text"><span className="eyebrow">{member ? 'Ficha do sócio' : newDep ? 'Novo dependente' : 'Novo sócio'}</span><h1>{member?.person.fullName || (newDep ? 'Cadastrar dependente' : 'Cadastrar sócio')}</h1><div className="record-identity-meta"><span>Matrícula <strong>{member?.registrationNumber || 'Gerada ao salvar'}</strong></span><span>{member?.category.name || category?.name || 'Selecione a categoria'}</span>{member && <span className={'status-badge ' + member.status}>{memberStatus[member.status]}</span>}</div>{member && dep && member.titular && <p className="record-holder">Titular: <button className="inline-link" onClick={() => leave(() => onOpen(member.titular))}>{member.titular.person.fullName}</button></p>}</div>
      {member && !editing && canManage && <button className="login-button record-edit-button" disabled={busy} onClick={edit}><Pencil size={16} />Editar cadastro</button>}
    </header>
    {notice && <p className="record-feedback" role="status">{notice}</p>}
    {(actionError || error) && <p className="form-error" role="alert">{actionError || error}</p>}
    {member && <div className="record-tabs" role="tablist" aria-label="Ficha do sócio">{tabs.map((item, index) => <button type="button" disabled={busy} key={item.key} id={'record-tab-' + item.key} role="tab" aria-selected={tab === item.key} aria-controls={'record-panel-' + item.key} tabIndex={tab === item.key ? 0 : -1} onClick={() => leave(() => { setTab(item.key); setNotice('') })} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
      leave(() => { setTab(tabs[next].key); document.getElementById('record-tab-' + tabs[next].key)?.focus() })
    }}>{item.label}</button>)}</div>}
    <section className="record-panel" id={'record-panel-' + tab} role={member ? 'tabpanel' : undefined} aria-labelledby={member ? 'record-tab-' + tab : undefined}>
      {tab === 'registration' && <>
        {editing ? <form className="member-form record-card record-edit-form" onSubmit={submit}>
          <div className="record-section-heading"><div><h2 tabIndex={-1} ref={formHeading}>{member ? 'Editar cadastro' : 'Dados do novo cadastro'}</h2><p>Preencha os dados e salve para confirmar as alterações.</p></div></div>
          <fieldset disabled={busy}><legend>Dados pessoais</legend><div className="record-fields" data-group="personal"><Field name="fullName" label="Nome completo" error={errors.fullName}><input required value={form.fullName || ''} onChange={(e) => set('fullName', e.target.value)} /></Field><Field name="cpf" label="CPF" error={errors.cpf}><input required value={form.cpf || ''} onChange={(e) => set('cpf', e.target.value)} /></Field><Field name="birthDate" label="Data de nascimento" error={errors.birthDate}><input required type="date" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} /></Field></div></fieldset>
          <fieldset disabled={busy}><legend>Contato</legend><div className="record-fields" data-group="contact"><Field name="phone" label="Telefone"><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field><Field name="email" label="E-mail"><input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field><Field name="city" label="Cidade"><input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field></div></fieldset>
          <fieldset disabled={busy}><legend>Vínculo com o clube</legend><div className="record-fields" data-group="membership"><Field name="registrationNumber" label="Matrícula"><input readOnly placeholder="Gerada automaticamente ao salvar" value={form.registrationNumber || ''} /></Field><Field name="categoryId" label="Categoria" error={errors.categoryId}><select required disabled={newDep} value={form.categoryId || ''} onChange={(e) => set('categoryId', e.target.value)}><option value="">Selecione</option>{cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>{dep && <><Field name="titularMemberId" label="Sócio titular" error={errors.titularMemberId}><HolderPicker initial={dependentParent?.person?.fullName || member?.titular?.person?.fullName || returnTo?.person?.fullName} onChange={(v: string) => set('titularMemberId', v)} error={errors.titularMemberId} /></Field><Field name="relationship" label="Parentesco" error={errors.relationship}><input required value={form.relationship || ''} onChange={(e) => set('relationship', e.target.value)} /></Field></>}<Field name="status" label="Status"><select value={form.status || 'ACTIVE'} onChange={(e) => set('status', e.target.value)}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option><option value="SUSPENDED">Suspenso</option><option value="TERMINATED">Desligado</option></select></Field><Field name="admissionDate" label="Data de ingresso"><input required type="date" value={form.admissionDate || ''} onChange={(e) => set('admissionDate', e.target.value)} /></Field></div></fieldset>
          <fieldset disabled={busy}><legend>Foto e observações</legend><div className="record-photo-edit"><MemberPhotoEditor value={removePhoto ? null : privatePhotoUrl} draft={pendingPhoto} saving={busy} onSave={file => { setPendingPhoto({ file, url: URL.createObjectURL(file) }); setRemovePhoto(false) }} onRemove={() => { setPendingPhoto(null); setRemovePhoto(!pendingPhoto) }} /><div><Field name="notes" label="Observações"><textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={5} /></Field><p className="muted">Alterações da foto também serão aplicadas ao salvar o cadastro.</p></div></div></fieldset>
          <div className="record-save-bar"><span>{dirty ? 'Alterações ainda não salvas' : 'Nenhuma alteração pendente'}</span><div><button type="button" className="btn btn-secondary" disabled={busy} onClick={cancel}>Cancelar</button><button type="submit" className="login-button" disabled={busy}>{saving ? 'Salvando…' : 'Salvar cadastro'}</button></div></div>
        </form> : member && <>
          <div className="record-summary-grid"><section className="record-card"><h2>Dados pessoais</h2><dl className="record-data-grid"><Data label="Nome completo">{member.person.fullName}</Data><Data label="CPF">{member.person.cpf}</Data><Data label="Data de nascimento">{dateLabel(member.person.birthDate)}</Data></dl></section><section className="record-card"><h2>Contato</h2><dl className="record-data-grid"><Data label="Telefone">{member.person.phone}</Data><Data label="E-mail">{member.person.email}</Data><Data label="Cidade">{member.person.city}</Data></dl></section></div>
          <section className="record-card"><h2>Vínculo com o clube</h2><dl className="record-data-grid"><Data label="Matrícula">{member.registrationNumber}</Data><Data label="Categoria">{member.category.name}</Data><Data label="Data de ingresso">{dateLabel(member.admissionDate)}</Data><Data label="Situação do sócio">{memberStatus[member.status]}</Data>{dep && <><Data label="Titular">{member.titular?.person?.fullName}</Data><Data label="Parentesco">{member.relationship}</Data></>}</dl></section>
          <section className="record-card"><h2>Observações</h2><p className="record-notes">{member.notes || 'Nenhuma observação registrada.'}</p></section>
          {canManage && <details className="record-management record-card"><summary>Gerenciar situação do sócio</summary><p>Inativar preserva o histórico e também desativa o acesso ao aplicativo. Após reativar o sócio, o acesso deve ser habilitado na aba Acesso ao sistema, se necessário.</p><div className="record-management-row"><div><strong>{member.status === 'ACTIVE' ? 'Inativar sócio' : 'Reativar sócio'}</strong><p>O cadastro e seu histórico serão preservados.</p></div><button className="btn btn-secondary" disabled={busy} onClick={changeStatus}>{member.status === 'ACTIVE' ? 'Inativar sócio' : 'Reativar sócio'}</button></div><div className="record-management-row"><div><strong>Excluir cadastro</strong><p>Exclusão definitiva, disponível somente para cadastros sem histórico ou vínculos.</p></div><button className="danger-link" disabled={busy} onClick={remove}>Excluir sócio</button></div></details>}
        </>}
      </>}
      {tab === 'dependents' && member && !dep && <section className="record-card"><div className="record-section-heading"><div><h2>Dependentes ({member.dependents?.length || 0})</h2><p>Pessoas vinculadas a este titular.</p></div>{canManage && <button className="login-button" onClick={() => onNewDependent(member)}>+ Novo dependente</button>}</div>{member.dependents?.length ? <div className="dependent-table-wrap"><table className="members-table record-dependents"><thead><tr><th>Matrícula</th><th>Nome</th><th>Parentesco</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{member.dependents.map((d: Member) => <tr key={d.id}><td>{d.registrationNumber}</td><td><button className="dependent-admin-name" onClick={() => onOpen(d)}>{d.person.fullName}</button><small>{d.person.cpf}</small></td><td>{d.relationship || '—'}</td><td><span className={'status-badge ' + d.status}>{memberStatus[d.status]}</span></td><td><button className="member-row-action" onClick={() => onOpen(d)}>Ver cadastro</button></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum dependente vinculado.</p>}</section>}
      {tab === 'finance' && member && (user?.permissions.includes('finance.view') ? <AdminFinancePage member={member} /> : <p className="record-card">Seu perfil não possui permissão para consultar o financeiro.</p>)}
      {member && tab === 'invitations' && (user?.permissions.includes('visitors.view') ? <VisitorsPage member={member} /> : <p className="record-card">Seu perfil não possui permissão para consultar convites.</p>)}
      {member && tab === 'reservations' && (user?.permissions.includes('reservations.view') ? <AdminReservationsPage member={member} /> : <p className="record-card">Seu perfil não possui permissão para consultar reservas.</p>)}
      {member && tab === 'entries' && <MemberHistoryTabs memberId={member.id} activeTab="access" />}
      {tab === 'access' && member && <section className="record-card"><h2>Acesso ao aplicativo</h2><p className="muted">Controla a entrada no aplicativo. A situação do vínculo com o clube aparece em Cadastro.</p><dl className="record-data-grid"><Data label="Login (CPF)">{member.person.cpf}</Data><Data label="Acesso ao aplicativo">{!member.access ? 'Sem acesso cadastrado' : member.access.active ? 'Ativo' : 'Desativado'}</Data><Data label="Último acesso">{member.access?.lastLoginAt ? dateTimeLabel(member.access.lastLoginAt) : 'Nenhum acesso registrado'}</Data></dl>{canManage && <div className="record-access-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => {
        if (!window.confirm('Redefinir a senha para a data de nascimento? Isso também reativa o acesso ao aplicativo e exige troca de senha no próximo login.')) return
        void runAction('password', async () => { await resetMemberPassword(member.id); await onRefresh(member.id); setNotice('Senha redefinida. O sócio deverá alterá-la no próximo acesso.') })
      }}>{action === 'password' ? 'Redefinindo…' : 'Redefinir senha'}</button><button className="btn btn-secondary" disabled={busy} onClick={() => {
        const active = !member.access?.active
        if (!window.confirm(active ? 'Ativar o acesso ao aplicativo?' : 'Desativar o acesso ao aplicativo?')) return
        void runAction('access', async () => { await toggleMemberAccess(member.id, active); await onRefresh(member.id); setNotice(active ? 'Acesso ao aplicativo ativado.' : 'Acesso ao aplicativo desativado.') })
      }}>{action === 'access' ? 'Atualizando…' : member.access?.active ? 'Desativar acesso' : 'Ativar acesso'}</button></div>}</section>}
    </section>
  </main>
}

function HolderPicker({ initial, onChange, error }: any) { const [query, setQuery] = useState(initial || ''); const [rows, setRows] = useState<any[]>([]); useEffect(() => { if (query.length < 2) return setRows([]); const timer = window.setTimeout(() => searchHolders(query).then(setRows).catch(() => setRows([])), 300); return () => window.clearTimeout(timer) }, [query]); return <div className="holder-picker"><input required aria-label="Pesquisar titular" value={query} onChange={(e) => { setQuery(e.target.value); onChange('') }} />{rows.map((r) => <button type="button" key={r.id} onClick={() => { onChange(r.id); setQuery(r.name + ' - ' + r.cpf); setRows([]) }}>{r.name} - {r.cpf}</button>)}{error && <small className="field-error">{error}</small>}</div> }
