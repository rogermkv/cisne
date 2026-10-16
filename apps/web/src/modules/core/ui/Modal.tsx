import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Nested dialogs may unmount in either order. Restore the page only after
// the last dialog releases its lock, using the value from before the first.
const scrollLocks = new Set<symbol>()
let originalOverflow: { value: string; priority: string } | null = null
function lockPageScroll() {
  const style = document.body.style
  const lock = Symbol('modal')
  if (!scrollLocks.size) originalOverflow = { value: style.getPropertyValue('overflow'), priority: style.getPropertyPriority('overflow') }
  scrollLocks.add(lock)
  style.setProperty('overflow', 'hidden')
  return () => {
    if (!scrollLocks.delete(lock) || scrollLocks.size) return
    if (originalOverflow?.value) style.setProperty('overflow', originalOverflow.value, originalOverflow.priority)
    else style.removeProperty('overflow')
    originalOverflow = null
  }
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current
    dialog?.showModal()
    const unlock = lockPageScroll()
    return () => {
      dialog?.close()
      unlock()
      if (previous?.isConnected && !previous.closest('dialog:not([open])')) previous.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className="ui-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="ui-modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>
}
