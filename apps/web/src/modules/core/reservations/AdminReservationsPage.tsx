import { ArrowLeft, Eye, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../../api/client'
import { Feedback } from '../ui/Feedback'
import { Modal } from '../ui/Modal'
import { dateLabel, money, reservationStatus } from '../ui/format'
import './reservations.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })
const json = () => ({ ...auth(), headers: { ...auth().headers, 'Content-Type': 'application/json' } })
const blankSpace = { name: '', description: '', capacity: '', price: '', active: true, requiresApproval: true, reservationRules: '' }
const blankReservation = { memberId: '', spaceId: '', reservationDate: '', startTime: '', endTime: '', totalAmount: '', notes: '', status: 'APPROVED' }

export function AdminReservationsPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'reservations' | 'spaces'>('reservations')
  const [rows, setRows] = useState<any[]>([])
  const [spaces, setSpaces] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [record, setRecord] = useState<'space-form' | 'space-view' | 'reservation-form' | 'reservation-view' | null>(null)
  const [spaceForm, setSpaceForm] = useState<any>(blankSpace)
  const [reservationForm, setReservationForm] = useState<any>(blankReservation)
  const [spaceEditing, setSpaceEditing] = useState<any>(null)
  const [reservationEditing, setReservationEditing] = useState<any>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [reservationRows, spaceRows] = await Promise.all([
        apiRequest<any[]>('/api/reservations', auth()),
        apiRequest<any[]>('/api/spaces', auth()),
      ])
      setRows(reservationRows)
      setSpaces(spaceRows)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    apiRequest<any[]>('/api/members?status=ACTIVE', auth()).then(setMembers).catch(() => {})
  }, [])

  const notify = (text: string) => {
    setError('')
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  const openSpace = (row?: any) => {
    setSpaceEditing(row || null)
    setSpaceForm(row ? { ...blankSpace, ...row, capacity: row.capacity ?? '', price: row.price ?? '' } : { ...blankSpace })
    setRecord('space-form')
    setError('')
  }

  const saveSpace = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(spaceEditing ? `/api/spaces/${spaceEditing.id}` : '/api/spaces', {
        method: spaceEditing ? 'PUT' : 'POST',
        ...json(),
        body: JSON.stringify({ ...spaceForm, capacity: spaceForm.capacity === '' ? null : Number(spaceForm.capacity), price: Number(spaceForm.price) }),
      })
      setRecord(null)
      notify(spaceEditing ? 'Espaço atualizado.' : 'Espaço cadastrado.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleSpace = async (row: any) => {
    setSaving(true)
    try {
      await apiRequest(`/api/spaces/${row.id}`, { method: 'PUT', ...json(), body: JSON.stringify({ ...row, active: !row.active }) })
      notify(row.active ? 'Espaço desativado.' : 'Espaço ativado.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteSpace = async (row: any) => {
    if (!window.confirm(`Excluir o espaço “${row.name}”? O espaço só será excluído se não tiver histórico de reservas.`)) return
    setSaving(true)
    try {
      await apiRequest(`/api/spaces/${row.id}`, { method: 'DELETE', ...auth() })
      notify('Espaço excluído.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const openReservation = (row?: any) => {
    setReservationEditing(row || null)
    setReservationForm(row ? { ...blankReservation, ...row, reservationDate: String(row.reservationDate).slice(0, 10), totalAmount: row.totalAmount ?? '' } : { ...blankReservation })
    setRecord('reservation-form')
    setError('')
  }

  const saveReservation = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(reservationEditing ? `/api/reservations/${reservationEditing.id}` : '/api/reservations', {
        method: reservationEditing ? 'PUT' : 'POST',
        ...json(),
        body: JSON.stringify({ ...reservationForm, totalAmount: reservationForm.totalAmount === '' ? undefined : Number(reservationForm.totalAmount) }),
      })
      setRecord(null)
      notify(reservationEditing ? 'Reserva atualizada.' : 'Reserva criada.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const action = async (id: string, kind: 'approve' | 'reject' | 'cancel') => {
    if (kind === 'cancel' && !window.confirm('Cancelar esta reserva? O histórico será preservado.')) return
    setSaving(true)
    try {
      await apiRequest(`/api/reservations/${id}/${kind}`, { method: 'POST', ...json(), body: kind === 'reject' ? JSON.stringify({ reason: 'Indisponibilidade do espaço' }) : undefined })
      notify(kind === 'approve' ? 'Reserva aprovada.' : kind === 'reject' ? 'Reserva recusada.' : 'Reserva cancelada.')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return <main className="reservations-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Voltar ao painel</button>
    <header className="reservation-admin-header"><div><span className="eyebrow">Gestão administrativa</span><h1>{tab === 'spaces' ? 'Espaços' : 'Reservas'}</h1></div><div className="reservation-admin-actions"><button className="btn btn-secondary" onClick={() => setTab(tab === 'spaces' ? 'reservations' : 'spaces')}><Settings size={16} /> {tab === 'spaces' ? 'Ver reservas' : 'Gerenciar espaços'}</button>{tab === 'spaces' ? <button className="btn btn-primary" onClick={() => openSpace()}><Plus size={16} /> Novo espaço</button> : <button className="btn btn-primary" onClick={() => openReservation()}><Plus size={16} /> Nova reserva</button>}</div></header>
    <Feedback error={error} message={message} />
    {tab === 'spaces' ? <section className="table-scroll" role="region" aria-label="Espaços"><table className="data-table"><thead><tr><th>Nome</th><th>Descrição</th><th>Capacidade</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{spaces.map(space => <tr key={space.id}><td><strong>{space.name}</strong></td><td>{space.description || '—'}</td><td>{space.capacity || '—'}</td><td>{money(space.price)}</td><td><span className={`status-badge ${space.active ? 'ACTIVE' : 'INACTIVE'}`}>{space.active ? 'Ativo' : 'Inativo'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => { setRecord('space-view'); setSpaceEditing(space) }}><Eye size={15} /> Visualizar</button><button className="btn btn-secondary" onClick={() => openSpace(space)}><Pencil size={15} /> Editar</button><button className="btn btn-secondary" disabled={saving} onClick={() => toggleSpace(space)}>{space.active ? 'Desativar' : 'Ativar'}</button><button className="btn btn-danger" disabled={saving} onClick={() => deleteSpace(space)}><Trash2 size={15} /> Excluir</button></div></td></tr>)}</tbody></table>{loading && <p className="empty-state">Carregando espaços…</p>}{!loading && !spaces.length && <p className="empty-state">Nenhum espaço cadastrado.</p>}</section> : <section className="table-scroll" role="region" aria-label="Reservas"><table className="data-table"><thead><tr><th>Associado / espaço</th><th>Data</th><th>Horário</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.member?.person?.fullName || '—'}</strong><small>{row.space?.name || '—'}</small></td><td>{dateLabel(row.reservationDate)}</td><td>{row.startTime && row.endTime ? `${row.startTime} – ${row.endTime}` : 'Dia inteiro'}</td><td>{money(row.totalAmount)}</td><td><span className={`status-badge ${row.status}`}>{reservationStatus[row.status] || 'Não informado'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => { setRecord('reservation-view'); setReservationEditing(row) }}><Eye size={15} /> Ver</button>{!['CANCELLED', 'COMPLETED'].includes(row.status) && <><button className="btn btn-secondary" onClick={() => openReservation(row)}><Pencil size={15} /> Editar</button><button className="btn btn-secondary" disabled={saving} onClick={() => action(row.id, 'cancel')}>Cancelar</button></>}{row.status === 'REQUESTED' && <><button className="btn btn-positive" disabled={saving} onClick={() => action(row.id, 'approve')}>Aprovar</button><button className="btn btn-secondary" disabled={saving} onClick={() => action(row.id, 'reject')}>Recusar</button></>}</div></td></tr>)}</tbody></table>{loading && <p className="empty-state">Carregando reservas…</p>}{!loading && !rows.length && <p className="empty-state">Nenhuma reserva encontrada.</p>}</section>}
    {record === 'space-form' && <Modal title={spaceEditing ? 'Editar espaço' : 'Novo espaço'} onClose={() => setRecord(null)}><form className="reservation-form" onSubmit={saveSpace}><label>Nome<input required value={spaceForm.name} onChange={event => setSpaceForm({ ...spaceForm, name: event.target.value })} /></label><label>Descrição<textarea value={spaceForm.description || ''} onChange={event => setSpaceForm({ ...spaceForm, description: event.target.value })} /></label><label>Capacidade<input type="number" min="1" value={spaceForm.capacity} onChange={event => setSpaceForm({ ...spaceForm, capacity: event.target.value })} /></label><label>Valor<input required type="number" min="0" step="0.01" value={spaceForm.price} onChange={event => setSpaceForm({ ...spaceForm, price: event.target.value })} /></label><label>Regras de reserva<textarea value={spaceForm.reservationRules || ''} onChange={event => setSpaceForm({ ...spaceForm, reservationRules: event.target.value })} /></label><label className="checkbox-field"><input type="checkbox" checked={spaceForm.active} onChange={event => setSpaceForm({ ...spaceForm, active: event.target.checked })} /> Espaço ativo</label><label className="checkbox-field"><input type="checkbox" checked={spaceForm.requiresApproval} onChange={event => setSpaceForm({ ...spaceForm, requiresApproval: event.target.checked })} /> Exigir aprovação</label><FormButtons close={() => setRecord(null)} saving={saving} /></form></Modal>}
    {record === 'reservation-form' && <Modal title={reservationEditing ? 'Editar reserva' : 'Nova reserva'} onClose={() => setRecord(null)}><form className="reservation-form" onSubmit={saveReservation}><label>Associado<select required value={reservationForm.memberId} onChange={event => setReservationForm({ ...reservationForm, memberId: event.target.value })}><option value="">Selecione</option>{members.map(member => <option key={member.id} value={member.id}>{member.person.fullName}</option>)}</select></label><label>Espaço ativo<select required value={reservationForm.spaceId} onChange={event => setReservationForm({ ...reservationForm, spaceId: event.target.value })}><option value="">Selecione</option>{spaces.filter(space => space.active || space.id === reservationForm.spaceId).map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label><label>Data<input required type="date" value={reservationForm.reservationDate} onChange={event => setReservationForm({ ...reservationForm, reservationDate: event.target.value })} /></label><div className="form-two"><label>Horário inicial<input type="time" value={reservationForm.startTime || ''} onChange={event => setReservationForm({ ...reservationForm, startTime: event.target.value })} /></label><label>Horário final<input type="time" value={reservationForm.endTime || ''} onChange={event => setReservationForm({ ...reservationForm, endTime: event.target.value })} /></label></div><label>Valor<input type="number" min="0" step="0.01" value={reservationForm.totalAmount} onChange={event => setReservationForm({ ...reservationForm, totalAmount: event.target.value })} /></label><label>Observações<textarea value={reservationForm.notes || ''} onChange={event => setReservationForm({ ...reservationForm, notes: event.target.value })} /></label><FormButtons close={() => setRecord(null)} saving={saving} /></form></Modal>}
    {record === 'space-view' && <Modal title={spaceEditing.name} onClose={() => setRecord(null)}><Detail rows={[['Descrição', spaceEditing.description || '—'], ['Capacidade', spaceEditing.capacity || '—'], ['Valor', money(spaceEditing.price)], ['Situação', spaceEditing.active ? 'Ativo' : 'Inativo'], ['Aprovação', spaceEditing.requiresApproval ? 'Obrigatória' : 'Dispensada'], ['Regras', spaceEditing.reservationRules || '—']]} /></Modal>}
    {record === 'reservation-view' && <Modal title="Detalhes da reserva" onClose={() => setRecord(null)}><Detail rows={[['Espaço', reservationEditing.space?.name], ['Associado/responsável', reservationEditing.member?.person?.fullName], ['Data', dateLabel(reservationEditing.reservationDate)], ['Horário', reservationEditing.startTime && reservationEditing.endTime ? `${reservationEditing.startTime} – ${reservationEditing.endTime}` : 'Dia inteiro'], ['Status', reservationStatus[reservationEditing.status]], ['Observações', reservationEditing.notes || '—']]} /></Modal>}
  </main>
}

function FormButtons({ close, saving }: { close: () => void; saving: boolean }) { return <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={close}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button></div> }
function Detail({ rows }: { rows: Array<[string, any]> }) { return <dl className="reservation-detail">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> }
