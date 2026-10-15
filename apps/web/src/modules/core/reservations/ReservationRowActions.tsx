import { useEffect, useId, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

export function ReservationRowActions({ row, onView, onEdit, onAction, saving, canManage }: any) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const terminal = ['CANCELLED', 'COMPLETED', 'REJECTED'].includes(row.status)
  const close = () => menu.current?.hidePopover()
  const position = () => {
    if (!trigger.current || !menu.current) return
    const anchor = trigger.current.getBoundingClientRect()
    const box = menu.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(anchor.right - box.width, window.innerWidth - box.width - 8))
    const below = anchor.bottom + 6
    const top = below + box.height <= window.innerHeight - 8 ? below : Math.max(8, anchor.top - box.height - 6)
    Object.assign(menu.current.style, { left: `${left}px`, top: `${top}px` })
  }
  useEffect(() => {
    if (!open) return
    const dismiss = () => close()
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => { window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true) }
  }, [open])
  useEffect(() => { if (saving) close() }, [saving])
  const secondary = (operation: () => void) => { close(); operation() }
  return <div className="reservation-visible-actions">
    <div className="reservation-primary-actions">
      {canManage && row.status === 'REQUESTED' && <><button className="btn btn-positive" disabled={saving} onClick={() => onAction(row, 'approve')}>Confirmar</button><button className="btn btn-secondary reservation-reject-action" disabled={saving} onClick={() => onAction(row, 'reject')}>Recusar</button></>}
      {canManage && row.status === 'APPROVED' && <button className="btn btn-positive" disabled={saving} onClick={() => onAction(row, 'complete')}>Concluir</button>}
    </div>
    <div className="reservation-secondary-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => onView(row)}>Ver detalhes</button>
      {canManage && !terminal && <><button ref={trigger} type="button" className="btn btn-secondary reservation-more-trigger" popoverTarget={id} aria-label="Mais ações da reserva" aria-expanded={open} disabled={saving} onClick={position}><MoreVertical size={17} /></button>
        <div ref={menu} id={id} popover="auto" className="reservation-floating-actions" aria-label="Ações secundárias da reserva" onToggle={event => { const visible = event.currentTarget.matches(':popover-open'); setOpen(visible); if (visible) position() }}>
          <button type="button" onClick={() => secondary(() => onEdit(row))}>Editar reserva</button>
          <button type="button" className="reservation-cancel-action" onClick={() => secondary(() => onAction(row, 'cancel'))}>Cancelar reserva</button>
        </div></>}
    </div>
  </div>
}
