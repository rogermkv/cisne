import { useEffect, useState, useRef } from 'react'
import { apiRequest } from '../../../api/client'
import { useAuth } from '../auth/AuthProvider'
import { roleLabel } from '../ui/format'
import { MemberCategoriesPage } from '../members/MemberCategoriesPage'
import './administration.css'
type Role = { name: string; users: number; permissions: string[] }
type User = { id: string; name: string; registrationNumber: string | null; isMember: boolean; active: boolean; roles: string[]; lastLoginAt: string | null; mustChangePassword: boolean }
const areas: Record<string,string> = { users:'usuários', members:'sócios e tipos', finance:'financeiro', reservations:'reservas', announcements:'avisos', events:'eventos', access:'controle de acesso', visitors:'visitantes' }
const permissionLabel = (key:string) => { const [area,action]=key.split('.');return `${action==='manage'?'Gerenciar':'Consultar'} ${areas[area]||area}` }
const label = (role:string) => roleLabel[role] || role
const date = (value:string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Sem acesso'
const describe = (value:any) => value?.roles ? `${value.active ? 'Ativo' : 'Inativo'} · ${value.roles.map(label).join(', ')}` : value?.activeRole ? label(value.activeRole) : 'Papel não selecionado'
export function AdministrationPage() {
  const { refresh } = useAuth()
  const dialogRef = useRef<HTMLElement>(null)
  const cancelRef = useRef<() => void>(() => {})
  const [tab,setTab] = useState('users');const [roles,setRoles] = useState<Role[]>([]);const [role,setRole] = useState('');const [q,setQ] = useState('');const [page,setPage] = useState(1);const [data,setData] = useState<any>(null);const [audit,setAudit] = useState<any>(null);const [auditPage,setAuditPage] = useState(1);const [revision,setRevision] = useState(0);const [error,setError] = useState('');const [loading,setLoading] = useState(false)
  const [editing,setEditing] = useState<User | null>(null);const [selected,setSelected] = useState<string[]>([]);const [active,setActive] = useState(true);const [saving,setSaving] = useState(false);const [saveError,setSaveError] = useState('');const [notice,setNotice] = useState('')
  const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken')}` })
  useEffect(() => { let current=true;apiRequest<Role[]>('/api/administration/roles',{headers:headers()}).then(r=>{if(current)setRoles(r)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false} },[revision])
  useEffect(() => {
    if (tab !== 'users') return
    let current=true;setLoading(true);setError('');const timer=setTimeout(()=>{apiRequest<any>('/api/administration/users?'+new URLSearchParams({q,role,page:String(page)}),{headers:headers()}).then(r=>{if(current)setData(r)}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)})},250)
    return()=>{current=false;clearTimeout(timer)}
  },[q,role,page,revision,tab])
  useEffect(()=>{if(tab!=='audit')return;let current=true;setError('');apiRequest<any>('/api/administration/audit?page='+auditPage,{headers:headers()}).then(r=>{if(current)setAudit(r)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[tab,auditPage,revision])
  const edit=(user:User)=>{setEditing(user);setSelected(user.roles);setActive(user.active);setSaveError('')}
  const cancel=()=>{if(saving)return;if(editing && (active!==editing.active||JSON.stringify([...selected].sort())!==JSON.stringify([...editing.roles].sort()))&&!window.confirm('Descartar as alterações de acesso deste usuário?'))return;setEditing(null)}
  cancelRef.current = cancel
  useEffect(() => {
    if (!editing) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.querySelector<HTMLElement>('input,button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelRef.current() }
      if (event.key === 'Tab' && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)'))
        const first = items[0], last = items[items.length-1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown',onKey)
    return () => { document.removeEventListener('keydown',onKey);previous?.focus() }
  },[editing?.id])
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!editing)return;if(!window.confirm(`Salvar os papéis e a situação de acesso de ${editing.name}?`))return;setSaving(true);setSaveError('');try{await apiRequest('/api/administration/users/'+editing.id,{method:'PUT',headers:headers(),body:JSON.stringify({roles:selected,active})});setEditing(null);setRevision(n=>n+1);setNotice('Acessos atualizados. As permissões serão conferidas nas próximas solicitações do usuário.');await refresh()}catch(err:any){setSaveError(err.message)}finally{setSaving(false)}}
  if(tab==='categories')return <div className="administration"><MemberCategoriesPage onBack={()=>setTab('users')} /></div>
  return <main className="page administration"><header className="section-heading"><div><span className="eyebrow">Configuração do sistema</span><h1>Painel Administrativo</h1><p>Gerencie os acessos e as configurações do clube.</p></div></header><nav className="administration-tabs" aria-label="Seções do Painel Administrativo">{[['users','Usuários'],['roles','Papéis e permissões'],['categories','Tipos de Sócio'],['audit','Histórico de acessos']].map(([key,name])=><button type="button" key={key} aria-current={tab===key?'page':undefined} onClick={()=>{setTab(key);setError('');setNotice('')}}>{name}</button>)}</nav>{error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p role="status" className="administration-notice">{notice}</p>}
  {tab==='roles'&&<><p>Selecione um papel para consultar os usuários vinculados. Uma conta pode possuir vários papéis.</p><section className="administration-role-grid">{roles.map(r=><article className="administration-card" key={r.name}><button className="administration-role-link" onClick={()=>{setRole(r.name);setPage(1);setTab('users')}}><strong>{label(r.name)}</strong><span>{r.users} usuário(s) · Ver usuários →</span></button><details><summary>Permissões deste papel ({r.permissions.length})</summary><ul>{r.permissions.map(p=><li key={p}>{permissionLabel(p)}</li>)}</ul></details></article>)}</section></>}
  {tab==='users'&&<section className="administration-card"><div className="administration-filters"><label>Pesquisar usuário<input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Nome ou matrícula" /></label><label>Papel<select aria-label="Papel" value={role} onChange={e=>{setRole(e.target.value);setPage(1)}}><option value="">Todos os papéis</option>{roles.map(r=><option key={r.name} value={r.name}>{label(r.name)}</option>)}</select></label><span role="status">{loading?'Carregando…':`${data?.total||0} usuário(s)`}</span></div><div className="administration-table"><table><thead><tr><th>Matrícula / Usuário</th><th>Papéis atribuídos</th><th>Situação</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>{!loading&&data?.users.map((u:User)=><tr key={u.id}><td><small>{u.registrationNumber||'Sem matrícula'}</small><strong>{u.name}</strong></td><td>{u.roles.map(r=><span className="administration-badge" key={r}>{label(r)}</span>)}</td><td>{u.active?'Ativo':'Inativo'}{u.mustChangePassword&&<small>Troca de senha pendente</small>}</td><td>{date(u.lastLoginAt)}</td><td><button className="btn btn-secondary" onClick={()=>edit(u)}>Gerenciar acesso</button></td></tr>)}</tbody></table></div>{!loading&&data?.total===0&&<p>Nenhum usuário encontrado.</p>}<div className="administration-pagination"><button disabled={page===1||loading} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>Página {page} de {Math.max(1,Math.ceil((data?.total||0)/25))}</span><button disabled={loading||page*25>=(data?.total||0)} onClick={()=>setPage(n=>n+1)}>Próxima</button></div></section>}
  {tab==='audit'&&<section className="administration-card"><h2>Histórico de alterações de acesso</h2><p>Atribuições de papéis, situação das contas e seleção do papel ativo.</p>{audit?.records.map((record:any)=><article className="administration-audit" key={record.id}><header><strong>{record.action==='ROLE_SELECTED'?'Papel selecionado':'Acesso atualizado'}</strong><time>{date(record.createdAt)}</time></header><p>{record.actorName} · Conta: {record.targetName}</p><div><span>Antes: {describe(record.before)}</span><span>Depois: {describe(record.after)}</span></div></article>)}{audit?.total===0&&<p>Nenhuma alteração registrada.</p>}<div className="administration-pagination"><button disabled={auditPage===1} onClick={()=>setAuditPage(n=>n-1)}>Anterior</button><span>Página {auditPage} de {Math.max(1,Math.ceil((audit?.total||0)/25))}</span><button disabled={auditPage*25>=(audit?.total||0)} onClick={()=>setAuditPage(n=>n+1)}>Próxima</button></div></section>}
  {editing&&<div className="administration-overlay"><section ref={dialogRef} className="administration-dialog" role="dialog" aria-modal="true" aria-labelledby="access-dialog-title"><h2 id="access-dialog-title">Gerenciar acesso</h2><p>{editing.name}</p><form onSubmit={save}><fieldset disabled={saving}><legend>Papéis atribuídos</legend>{roles.map(r=><label className="administration-check" key={r.name}><input type="checkbox" checked={selected.includes(r.name)} disabled={r.name==='SOCIO'&&!editing.isMember} onChange={e=>setSelected(old=>e.target.checked?[...old,r.name]:old.filter(x=>x!==r.name))}/>{label(r.name)}</label>)}<small>Sócio exige um cadastro de associado vinculado.</small></fieldset><label className="administration-check"><input type="checkbox" checked={active} disabled={saving} onChange={e=>setActive(e.target.checked)}/>Conta ativa</label>{saveError&&<p className="form-error" role="alert">{saveError}</p>}<footer><button type="button" className="btn btn-secondary" disabled={saving} onClick={cancel}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={saving||!selected.length}>{saving?'Salvando…':'Salvar acessos'}</button></footer></form></section></div>}
  </main>
}
