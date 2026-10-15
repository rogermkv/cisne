import { useState } from 'react'
import { apiRequest } from '../../../api/client'
import { Modal } from '../ui/Modal'
import { dateLabel, money, paymentMethod } from '../ui/format'
import { annualAuth, annualRequest, brasiliaToday, downloadFinancialDocument } from './annual-api'
import './annual-payments.css'
const statusNames: Record<string, string> = { PENDING: 'Aguardando conferência', APPROVED: 'Aprovado', REJECTED: 'Recusado', AVAILABLE: 'Disponível', SUPERSEDED: 'Substituído' }
export function ChargeDocuments({ row, secretary = false, member = false, onChange }: { row: any; secretary?: boolean; member?: boolean; onChange: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [review, setReview] = useState<any>(null)
  if (!row.annualEnrollmentId) return null
  const open = !['PAID', 'CANCELLED'].includes(row.status) && Number(row.balance) > 0
  const pending = row.documents?.some((doc: any) => doc.kind === 'PROOF' && doc.status === 'PENDING')
  const upload = async (kind: string, file?: File) => {
    if (!file) return
    setError(''); setBusy(true)
    try {
      const body = new FormData(); body.append('file', file)
      await apiRequest(`/api/annualities/charges/${row.id}/documents/${kind}`, { method: 'POST', headers: annualAuth(), body })
      await onChange()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try { await annualRequest(`/api/annualities/documents/${review.id}/${review.action}`, 'POST', review.action === 'reject' ? { reason: review.reason } : { amount: Number(review.amount), method: review.method, paidAt: review.paidAt, notes: review.notes }); setReview(null); await onChange() }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className="annual-documents" aria-label="Boletos e comprovantes">
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="annual-document-actions">{open && (member || secretary) && !pending && <label className="annual-upload">Enviar comprovante<input aria-label={`Enviar comprovante de ${row.description}`} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => { void upload('PROOF', event.target.files?.[0]); event.target.value = '' }} /></label>}{open && secretary && row.annualEnrollment?.mode === 'INSTALLMENTS_4' && <label className="annual-upload">Anexar / substituir boleto<input aria-label={`Anexar boleto de ${row.description}`} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => { void upload('BOLETO', event.target.files?.[0]); event.target.value = '' }} /></label>}</div>
    {(member || secretary) && open && <small>PDF, JPG ou PNG · até 5 MB. Enviar comprovante não confirma o pagamento.</small>}
    {row.documents?.filter((doc: any) => secretary || doc.status !== 'SUPERSEDED').map((doc: any) => <article className="annual-document" key={doc.id}><div><strong>{doc.kind === 'BOLETO' ? 'Boleto' : 'Comprovante'}</strong><span>{statusNames[doc.status]} · {dateLabel(doc.createdAt)}</span>{doc.rejectionReason && <p>Motivo: {doc.rejectionReason}</p>}</div><button className="btn btn-secondary" disabled={busy} onClick={async () => { try { setError(''); await downloadFinancialDocument(doc.id) } catch (e: any) { setError(e.message) } }}>Baixar {doc.kind === 'BOLETO' ? 'boleto' : 'comprovante'}</button>{secretary && doc.kind === 'PROOF' && doc.status === 'PENDING' && <><button className="btn btn-positive" disabled={busy} onClick={() => { setError(''); setReview({ id: doc.id, action: 'approve', amount: row.balance, method: row.annualEnrollment?.mode === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX', paidAt: brasiliaToday(), notes: '' }) }}>Conferir pagamento</button><button className="btn btn-secondary" disabled={busy} onClick={() => { setError(''); setReview({ id: doc.id, action: 'reject', reason: '' }) }}>Recusar comprovante</button></>}</article>)}
    {review && <Modal title={review.action === 'approve' ? 'Conferir comprovante e registrar pagamento' : 'Recusar comprovante'} onClose={() => !busy && setReview(null)}><form className="annual-form" onSubmit={submitReview}>{error && <p role="alert" className="form-error">{error}</p>}<p>{row.description} · Saldo {money(row.balance)}</p>{review.action === 'reject' ? <label>Motivo da recusa<textarea required maxLength={1000} value={review.reason} onChange={event => setReview({ ...review, reason: event.target.value })} /></label> : <><p>Confira o documento antes de confirmar. Esta ação registra um recebimento real.</p><label>Valor confirmado (R$)<input type="number" required min="0.01" step="0.01" max={row.balance} value={review.amount} onChange={event => setReview({ ...review, amount: event.target.value })} /></label><label>Data efetiva do pagamento<input type="date" required value={review.paidAt} onChange={event => setReview({ ...review, paidAt: event.target.value })} /></label><label>Forma de pagamento<select aria-label="Forma de pagamento" value={review.method} onChange={event => setReview({ ...review, method: event.target.value })}>{Object.entries(paymentMethod).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Observação<textarea maxLength={2000} value={review.notes} onChange={event => setReview({ ...review, notes: event.target.value })} /></label></>}<div className="form-actions"><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setReview(null)}>Voltar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : review.action === 'approve' ? 'Confirmar recebimento' : 'Confirmar recusa'}</button></div></form></Modal>}
  </section>
}
