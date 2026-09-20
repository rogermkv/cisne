import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { apiRequest } from '../../../api/client'
const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
export function MemberCategoriesPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]), [name, setName] = useState(''), [dependent, setDependent] = useState(false)
  const load = () => { apiRequest<any[]>('/api/member-categories', auth()).then(setRows) }
  useEffect(() => { load() }, [])
  const create = async () => { if (!name.trim()) return; await apiRequest('/api/member-categories', { method: 'POST', headers: { ...auth().headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, isDependent: dependent, requiresHolder: dependent }) }); setName(''); setDependent(false); load() }
  return <main className="members-page"><button className="text-button" onClick={onBack}><ArrowLeft size={16} /> Painel</button><span className="eyebrow">Administração</span><h1>Tipos de Sócio</h1><section className="record-card"><div className="members-toolbar"><input placeholder="Nome da modalidade" value={name} onChange={e => setName(e.target.value)} /><label><input type="checkbox" checked={dependent} onChange={e => setDependent(e.target.checked)} /> É dependente / exige titular</label><button className="login-button" onClick={create}>Cadastrar</button></div></section><section className="members-table-wrap"><table className="members-table"><thead><tr><th>Nome</th><th>Natureza</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.isDependent || row.requiresHolder ? 'Dependente' : 'Titular'}</td><td>{row.active ? 'Ativo' : 'Inativo'}</td><td><button className="member-row-action" onClick={async () => { await apiRequest(`/api/member-categories/${row.id}`, { method: 'PUT', headers: { ...auth().headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...row, active: !row.active }) }); load() }}>{row.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table></section></main>
}
