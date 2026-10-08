import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { apiRequest } from '../../../api/client'
import { dateLabel, invitationStatus } from '../ui/format'
import { whatsappUrl } from '../members/phone'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const cpfMask = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 11); return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2') }
const phoneMask = (value: string) => { const digits = value.replace(/\D/g, '').slice(0, 11); if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2'); return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2') }
const normalizeCpf = (value: string) => value.replace(/\D/g, '')
const isValidCpf = (value: string) => { const cpf = normalizeCpf(value); if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; let sum = 0; for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index); let digit = (sum * 10) % 11; if (digit === 10) digit = 0; if (digit !== Number(cpf[9])) return false; sum = 0; for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index); digit = (sum * 10) % 11; if (digit === 10) digit = 0; return digit === Number(cpf[10]) }
const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export function MemberInvitationsPage({ initialInvitations, initialQuota, onBack }: { initialInvitations: any[]; initialQuota: any; onBack: () => void }) {
  const [invitations, setInvitations] = useState(initialInvitations)
  const [quota, setQuota] = useState(initialQuota)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [query, setQuery] = useState('')
  const [visitors, setVisitors] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [creatingVisitor, setCreatingVisitor] = useState(false)
  const [newVisitor, setNewVisitor] = useState({ fullName: '', cpf: '', phone: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = async (value = date) => {
    if (!value) return
    const [year, month] = value.split('-')
    const result = await apiRequest<any>(`/api/member/me/invitations/quota?year=${year}&month=${month}`, auth())
    setQuota(result.quota)
    setInvitations(result.invitations || [])
  }

  useEffect(() => { if (!date) return; refresh().catch(e => setError(e.message)) }, [date])
  useEffect(() => {
    if (query.trim().length < 2 || creatingVisitor) { setVisitors([]); return }
    const timer = window.setTimeout(() => apiRequest<any[]>(`/api/member/me/visitors/search?q=${encodeURIComponent(query)}`, auth()).then(setVisitors).catch(e => setError(e.message)), 250)
    return () => window.clearTimeout(timer)
  }, [query, creatingVisitor])

  const resetVisitorForm = () => { setCreatingVisitor(false); setNewVisitor({ fullName: '', cpf: '', phone: '', city: '', state: '' }); setError('') }
  const createVisitor = async () => {
    if (!newVisitor.fullName.trim()) return setError('Informe o nome completo do visitante.')
    if (!isValidCpf(newVisitor.cpf)) return setError('Informe um CPF válido.')
    const payload = { fullName: newVisitor.fullName.trim(), cpf: normalizeCpf(newVisitor.cpf), phone: newVisitor.phone.replace(/\D/g, ''), city: newVisitor.city.trim(), state: newVisitor.state }
    setSaving(true); setError(''); setMessage('')
    try {
      const visitor = await apiRequest<any>('/api/member/me/visitors', { method: 'POST', ...auth(), body: JSON.stringify(payload) })
      setSelected(visitor)
      setCreatingVisitor(false)
      setQuery('')
      setVisitors([])
      setNewVisitor({ fullName: '', cpf: '', phone: '', city: '', state: '' })
      setMessage('Visitante selecionado para o convite.')
    } catch (e: any) { setError(e.message || 'Não foi possível salvar o visitante.') } finally { setSaving(false) }
  }

  const createInvitation = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !date) return
    const now = new Date(); const today = now.toISOString().slice(0, 10); const currentMonth = today.slice(0, 7)
    if (date < today || date.slice(0, 7) !== currentMonth) { setError('A data do convite deve estar dentro do mês atual e não pode ser anterior a hoje.'); return }
    setSaving(true); setError(''); setMessage('')
    try { await apiRequest('/api/member/me/invitations', { method: 'POST', ...auth(), body: JSON.stringify({ visitorId: selected.id, scheduledDate: date }) }); await refresh(); setOpen(false); setSelected(null); setDate(''); setMessage('Convite criado com sucesso.') } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const cancel = async (id: string) => { if (!window.confirm('Tem certeza de que deseja cancelar este convite?')) return; setSaving(true); setError(''); try { await apiRequest(`/api/member/me/invitations/${id}/cancel`, { method: 'POST', ...auth() }); await refresh(); setMessage('Convite cancelado. A vaga voltou para a cota do mês.') } catch (e: any) { setError(e.message) } finally { setSaving(false) } }
  const selectedWhatsApp = selected?.person?.phone ? whatsappUrl(selected.person.phone) : null
  const selectedMonth = date ? `${date.slice(5, 7)}/${date.slice(0, 4)}` : quota?.month ? `${String(quota.month).padStart(2, '0')}/${quota.year}` : 'o mês selecionado'

  return <main className="member-content">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button>
    <span className="member-kicker">Visitantes e convites</span>
    <div className="member-invitations-heading"><div><h1>Convites da família</h1><p className="member-invitations-subtitle">Titular e dependentes compartilham a mesma cota mensal de 8 convites.</p></div><button className="login-button member-invitation-new" disabled={!quota?.eligible || quota.available <= 0} onClick={() => { setOpen(true); setError(''); setMessage('') }}>+ Novo convite</button></div>
    {message && <p className="member-success" role="status">{message}</p>}{error && !open && <p className="form-error" role="alert">{error}</p>}
    <section className="finance-demo member-invitation-quota"><div><span>Cota do grupo em {quota?.month ? `${String(quota.month).padStart(2, '0')}/${quota.year}` : 'este mês'}</span><strong>{quota?.eligible ? `${quota.available} disponíveis` : 'Sem cota'}</strong><small>{quota?.eligible ? `${quota.used} de ${quota.limit} convites utilizados pelo grupo familiar` : 'Sua categoria de sócio não possui cota mensal de convites.'}</small></div></section>
    {quota?.eligible && quota.available <= 0 && <p className="member-invitation-notice">Limite mensal atingido. O grupo já utilizou os {quota.limit} convites disponíveis neste mês.</p>}{!quota?.eligible && <p className="member-invitation-notice">Sua categoria de sócio não possui cota mensal de convites.</p>}
    <section className="member-section"><div className="member-section-title"><h2>Convites do grupo familiar</h2><span>{invitations.length}</span></div>{invitations.length ? invitations.map((item: any) => <article className="dependent-item member-invitation-item" key={item.id}><div><strong>{item.visitor?.person?.fullName || 'Visitante'}</strong><span>{dateLabel(item.scheduledDate)} · {invitationStatus[item.status] || 'Não informado'}</span><small>Emitido por {item.sponsorMember?.person?.fullName || 'membro da família'}</small>{item.visitor?.person?.phone && <small>{item.visitor.person.phone}</small>}</div>{item.visitor?.person?.phone && <a className="member-row-action" href={whatsappUrl(item.visitor.person.phone) || '#'} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{item.status === 'SCHEDULED' && <button className="member-row-action" disabled={saving} onClick={() => cancel(item.id)}>Cancelar</button>}</article>) : <p className="empty-member">Nenhum convite cadastrado.</p>}</section>
    {open && <div className="member-invitation-composer"><div className="member-invitation-composer-card"><div className="member-section-title"><div><span className="member-kicker">Novo convite</span><h2>Escolha o visitante</h2></div><button className="member-row-action" type="button" onClick={() => { setOpen(false); resetVisitorForm() }}>Fechar</button></div><p className="member-invitation-context">Cota de {selectedMonth}: <strong>{quota?.used} / {quota?.limit}</strong> · {quota?.available} disponível(is)</p>{error && <p className="form-error" role="alert">{error}</p>}<form className="login-form" onSubmit={createInvitation}><label>Data da visita<input type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} /></label>{date && <p className="member-invitation-notice">Esta data utiliza a cota de {selectedMonth}.</p>}{!creatingVisitor && !selected && <><label>Pesquisar visitante<input placeholder="Nome, CPF ou telefone" value={query} onChange={e => setQuery(e.target.value)} /></label>{visitors.length > 0 && <div className="member-visitor-results">{visitors.map(visitor => <button type="button" key={visitor.id} onClick={() => { setSelected(visitor); setVisitors([]); setQuery(visitor.person.fullName); setError('') }}><strong>{visitor.person.fullName}</strong><span>{visitor.person.cpf} · {visitor.person.phone || 'Sem telefone'}</span></button>)}</div>}<button type="button" className="text-button member-create-link" onClick={() => { setCreatingVisitor(true); setError('') }}>+ Cadastrar novo visitante</button></>}{creatingVisitor && <div className="member-new-visitor"><div className="member-new-visitor-heading"><h3>Cadastrar visitante</h3><button type="button" className="text-button" onClick={resetVisitorForm}>Voltar à busca</button></div><label>Nome completo<input autoFocus required value={newVisitor.fullName} onChange={e => setNewVisitor({ ...newVisitor, fullName: e.target.value })} /></label><label>CPF<input required inputMode="numeric" placeholder="000.000.000-00" value={newVisitor.cpf} onChange={e => setNewVisitor({ ...newVisitor, cpf: cpfMask(e.target.value) })} /></label><label>Telefone<input inputMode="tel" placeholder="(00) 00000-0000" value={newVisitor.phone} onChange={e => setNewVisitor({ ...newVisitor, phone: phoneMask(e.target.value) })} /></label><div className="member-visitor-location"><label>Cidade<input required value={newVisitor.city} onChange={e => setNewVisitor({ ...newVisitor, city: e.target.value })} /></label><label>UF<select required value={newVisitor.state} onChange={e => setNewVisitor({ ...newVisitor, state: e.target.value })}><option value="">Selecione</option>{states.map(state => <option key={state} value={state}>{state}</option>)}</select></label></div><button type="button" className="btn btn-secondary member-save-visitor" disabled={saving} onClick={() => void createVisitor()}>{saving ? 'Salvando…' : 'Salvar visitante'}</button></div>}{selected && <div className="member-selected-visitor"><strong>Visitante selecionado</strong><span>{selected.person.fullName} · {selected.person.cpf}</span>{selected.person.phone && <span>{selected.person.phone}</span>}{selectedWhatsApp && <a href={selectedWhatsApp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}<button type="button" onClick={() => setSelected(null)}>Trocar visitante</button></div>}<button type="submit" className="login-button member-confirm-invitation" disabled={saving || !selected || !date || quota?.available <= 0}>{saving ? 'Salvando…' : 'Confirmar convite'}</button></form></div></div>}
  </main>
}
