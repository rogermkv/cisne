import { ArrowLeft, CalendarDays, CreditCard, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../../api/client'
import { dateLabel, reservationStatus } from '../ui/format'
import './reservations.css'

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` } })

export function ReservationsPage({ onBack }: { onBack: () => void }) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [mine, setMine] = useState<any[]>([])
  const [selected, setSelected] = useState<any>()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    apiRequest<any[]>('/api/reservable-spaces', auth()).then(setSpaces).catch(e => setError(e.message))
    apiRequest<any[]>('/api/member/me/reservations', auth()).then(setMine).catch(e => setError(e.message))
  }

  useEffect(load, [])

  const closeSelection = () => {
    setSelected(undefined)
    setDate('')
    setStartTime('')
    setEndTime('')
  }

  const request = async () => {
    if (!selected || !date || (!!startTime !== !!endTime)) {
      setError('Informe a data e, se desejar horário, preencha início e fim.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/member/me/reservations', { method: 'POST', ...auth(), body: JSON.stringify({ spaceId: selected.id, reservationDate: date, startTime: startTime || undefined, endTime: endTime || undefined }) })
      closeSelection()
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (reservation: any) => {
    if (!window.confirm('Cancelar esta reserva? O histórico será preservado.')) return
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/member/me/reservations/${reservation.id}/cancel`, { method: 'POST', ...auth() })
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return <main className="reservations-page member-reservations-page">
    <button className="finance-back" onClick={onBack}><ArrowLeft size={18} /> Início</button>
    <span className="eyebrow">Área do Sócio</span><h1>Reservas</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="reservation-lead">Escolha um espaço, data e horário para solicitar sua reserva.</p>
    <div className="space-grid">{spaces.map(space => <article className="space-card" key={space.id}><div className="space-placeholder"><CalendarDays size={30} /></div><h2>{space.name}</h2><p>{space.description || 'Espaço disponível para associados.'}</p><span>{space.capacity ? `Até ${space.capacity} pessoas` : 'Uso esportivo'}</span><strong>{Number(space.price) ? `R$ ${Number(space.price).toFixed(2).replace('.', ',')}` : 'Gratuito'}</strong><button onClick={() => { setSelected(space); setError('') }}>Ver disponibilidade</button></article>)}</div>
    <section className="my-reservations"><h2>Minhas reservas</h2>{mine.length ? mine.map(reservation => <article className="reservation-row" key={reservation.id}><div><strong>{reservation.space.name}</strong><span>{dateLabel(reservation.reservationDate)} · {reservation.startTime && reservation.endTime ? `${reservation.startTime} às ${reservation.endTime}` : 'Dia inteiro'}</span><small>Associado/responsável: você</small></div><b>{Number(reservation.totalAmount) ? `R$ ${Number(reservation.totalAmount).toFixed(2).replace('.', ',')}` : 'Gratuito'}</b><em className={reservation.status}>{reservationStatus[reservation.status] || 'Não informado'}</em>{reservation.status === 'APPROVED' && <button onClick={() => setDemo(true)}><CreditCard size={15} /> Pagar reserva</button>}{!['CANCELLED', 'COMPLETED'].includes(reservation.status) && <button className="btn btn-secondary" disabled={saving} onClick={() => cancel(reservation)}>Cancelar</button>}</article>) : <p>Nenhuma reserva encontrada.</p>}</section>
    {selected && <div className="reservation-modal" role="dialog" aria-modal="true" aria-label="Solicitar reserva"><div><h2>{selected.name}</h2><p>{selected.description || 'Espaço disponível para associados.'}</p><label>Escolha a data<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={event => setDate(event.target.value)} /></label><div className="form-two"><label>Horário inicial<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label><label>Horário final<input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label></div><p>Valor: <strong>{Number(selected.price) ? `R$ ${Number(selected.price).toFixed(2).replace('.', ',')}` : 'Gratuito'}</strong></p><button className="btn btn-primary" onClick={request} disabled={!date || saving}>{saving ? 'Enviando…' : 'Solicitar reserva'}</button><button className="btn btn-secondary" onClick={closeSelection}>Fechar</button></div></div>}
    {demo && <div className="reservation-modal" role="dialog" aria-modal="true" aria-label="Pagamento demonstrativo"><div className="demo-payment"><QrCode size={34} /><h2>Pagamento demonstrativo</h2><p>Nenhuma cobrança real será realizada.</p><div className="demo-qr"><QrCode size={72} /></div><button className="btn btn-secondary" onClick={() => setDemo(false)}>Fechar</button></div></div>}
  </main>
}
