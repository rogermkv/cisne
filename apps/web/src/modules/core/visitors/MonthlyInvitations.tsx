import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { dateTimeLabel, invitationStatus } from '../ui/format'
import { whatsappUrl } from '../members/phone'
import './monthly-invitations.css'

export function MonthlyInvitations({ rows, canManage, saving, onDetail, onVisitor, onCancel }: any) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const months = [...new Set<string>(rows.map((row: any) => row.createdAt.slice(0, 7)))].sort().reverse()
  const toggle = (month: string) => setExpanded(previous => { const next = new Set(previous); next.has(month) ? next.delete(month) : next.add(month); return next })
  return <div className="member-invitation-months">{months.map(month => {
    const entries = rows.filter((row: any) => row.createdAt.slice(0, 7) === month)
    const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const open = expanded.has(month)
    return <section className="member-invitation-month" key={month}>
      <button className="member-invitation-month-trigger" aria-expanded={open} aria-controls={`invitations-month-${month}`} onClick={() => toggle(month)}><span><strong>{label}</strong><small>{entries.length} {entries.length === 1 ? 'convite' : 'convites'} · {entries.filter((row: any) => row.status === 'USED').length} utilizados · {entries.filter((row: any) => row.status === 'SCHEDULED').length} válidos</small></span><ChevronDown size={18} /></button>
      {open && <div className="member-invitation-month-content" id={`invitations-month-${month}`}>{entries.map((row: any) => <article className="member-invitation-entry" key={row.id} aria-label={row.visitor?.person?.fullName || 'Visitante'}><div className="member-invitation-entry-heading"><div><strong>{row.visitor?.person?.fullName || 'Visitante'}</strong><small>Emitido em {dateTimeLabel(row.createdAt)} · Por {row.sponsorMember?.person?.fullName || 'membro do grupo'}</small>{row.usedAt && <small>Utilizado em {dateTimeLabel(row.usedAt)}</small>}</div><span className={`status-badge ${row.status}`}>{invitationStatus[row.status] || row.status}</span></div><div className="member-invitation-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => onDetail(row)}>Ver convite</button>{canManage && row.status === 'SCHEDULED' && <button className="btn btn-secondary" disabled={saving} onClick={() => onCancel(row.id)}>Cancelar convite</button>}<details className="member-invitation-menu"><summary aria-label="Ações do visitante">⋮</summary><div><button disabled={saving} onClick={() => onVisitor(row.visitor.id, 'profile')}>Ver visitante</button><button disabled={saving} onClick={() => onVisitor(row.visitor.id, 'history')}>Histórico do visitante</button>{canManage && <><button disabled={saving} onClick={() => onVisitor(row.visitor.id, 'edit')}>Editar visitante</button><button disabled={saving} onClick={() => onVisitor(row.visitor.id, 'block')}>{row.visitor.blocked ? 'Desbloquear visitante' : 'Bloquear visitante'}</button></>}{whatsappUrl(row.visitor?.person?.phone) && <a href={whatsappUrl(row.visitor.person.phone)!} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div></details></div></article>)}</div>}
    </section>
  })}{!months.length && <p className="empty-state">Nenhum convite registrado para este grupo.</p>}</div>
}
