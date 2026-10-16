import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { dateLabel, money, paymentMethod } from '../ui/format'
import { annualRequest } from './annual-api'
import './annual-payments.css'

export function PaymentHistory({ row, secretary, onChange }: { row: any; secretary: boolean; onChange: () => Promise<void> }) {
  const [correction, setCorrection] = useState<any>(null), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const open = (payment?: any) => { setReason(''); setError(''); setCorrection({ payment }) }
  const reverse = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const path = correction.payment ? `payments/${correction.payment.id}/reverse` : 'reopen-settlement'
      await annualRequest(`/api/finance/charges/${row.id}/${path}`, 'POST', { reason })
      setCorrection(null); await onChange()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  if (!row.payments?.length && !row.paymentHistoryIncomplete && !row.settlementReversedAt) return null
  return <section className="annual-documents" aria-label="Histórico de pagamentos"><h4>Histórico de pagamentos</h4>
    {row.paymentHistoryIncomplete && <article className="annual-document"><div><strong>Quitação antiga sem todos os recibos individuais</strong><span>Os recebimentos individuais existentes serão preservados.</span></div>{secretary && <button className="btn btn-secondary" onClick={() => open()}>Desfazer quitação antiga</button>}</article>}
    {row.settlementReversedAt && <p>Quitação antiga desfeita em {dateLabel(row.settlementReversedAt)}. Motivo: {row.settlementReversalReason}</p>}
    {row.payments?.map((entry: any) => <article className="annual-document" key={entry.id}><div><strong>{money(entry.amount)} {entry.reversedAt ? '· Estornado' : '· Recebido'}</strong><span>{dateLabel(entry.paidAt)} · {paymentMethod[entry.method] || entry.method}</span>{entry.registeredBy?.person?.fullName && <span>Registrado por {entry.registeredBy.person.fullName}</span>}{entry.notes && <p>{entry.notes}</p>}{entry.reversedAt && <p>Estornado em {dateLabel(entry.reversedAt)}. Motivo: {entry.reversalReason}</p>}</div>{secretary && !entry.reversedAt && !row.paymentHistoryIncomplete && row.status !== 'CANCELLED' && <button className="btn btn-secondary" onClick={() => open(entry)}>Estornar pagamento</button>}</article>)}
    {correction && <Modal title={correction.payment ? 'Estornar pagamento' : 'Desfazer quitação antiga'} onClose={() => !busy && setCorrection(null)}><form className="annual-form" onSubmit={reverse}>
      <p><strong>{row.description}</strong>{correction.payment && ` · ${money(correction.payment.amount)}`}</p><p>Use esta opção para corrigir um registro feito por engano. O saldo será recalculado e o registro original ficará no histórico. Esta operação não devolve dinheiro ao pagador.</p><p>Para corrigir valor, data ou forma de pagamento, estorne o registro incorreto e registre novamente com os dados certos.</p>
      {error && <p role="alert" className="form-error">{error}</p>}<label>Motivo da correção<textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="form-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setCorrection(null)}>Voltar</button><button className="btn btn-primary" disabled={busy || !reason.trim()}>{busy ? 'Salvando…' : 'Confirmar correção'}</button></div>
    </form></Modal>}
  </section>
}
