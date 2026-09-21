import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return <dialog ref={ref} className="ui-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="ui-modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>
}
