import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { roleLabel } from '../ui/format'
import './roles.css'
const descriptions: Record<string,string> = { ADMIN: 'Administração do sistema, usuários e configurações.', SECRETARIA: 'Atendimento e gestão operacional do clube.', FUNCIONARIO: 'Consulta de sócios, avisos e gestão de reservas.', SOCIO: 'Carteirinha, financeiro, convites e reservas pessoais.' }
export function RoleSelectionPage() {
  const { user, selectRole, logout } = useAuth(); const [error,setError] = useState(''); const [busy,setBusy] = useState(false)
  return <main className="login-page"><section className="login-card role-selection"><span className="eyebrow">Clube Ser Cisne</span><h1>Como deseja acessar?</h1><p>Olá, {user?.name}. Selecione o papel que deseja utilizar nesta sessão.</p><div className="role-options">{user?.assignedRoles.map(role => <button className="role-option" key={role} disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await selectRole(role) } catch(e:any) { setError(e.message) } finally { setBusy(false) } }}><strong>{roleLabel[role] || role}</strong><span>{descriptions[role]}</span></button>)}</div>{!user?.assignedRoles.length && <p>Nenhum papel atribuído. Solicite acesso ao administrador.</p>}{error && <p role="alert" className="form-error">{error}</p>}<button className="text-button" onClick={logout}>Sair</button></section></main>
}
export function RoleSwitcher() {
  const { user, selectRole } = useAuth(); const [error,setError] = useState('');const [busy,setBusy] = useState(false)
  if (!user) return null
  return <div className="role-switcher"><label>Papel ativo{user.assignedRoles.length > 1 ? <select aria-label="Papel ativo" value={user.activeRole || ''} disabled={busy} onChange={async e => { const role=e.target.value;setBusy(true);setError('');try{await selectRole(role)}catch(err:any){setError(err.message)}finally{setBusy(false)} }}>{user.assignedRoles.map(role=><option key={role} value={role}>{roleLabel[role] || role}</option>)}</select> : <strong>{roleLabel[user.activeRole || ''] || user.activeRole}</strong>}</label>{error && <span role="alert">{error}</span>}</div>
}
