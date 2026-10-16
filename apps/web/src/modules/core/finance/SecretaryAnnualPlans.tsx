import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { AnnualPlans } from './AnnualPlans'
import { annualModeNames, annualRequest } from './annual-api'

export function SecretaryAnnualPlans({ memberId, responsibleName, referenceYear, charges, secretary, seasonAvailable = false, onChange }: { memberId: string; responsibleName: string; referenceYear: number; charges: any[]; secretary: boolean; seasonAvailable?: boolean; onChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false), [data, setData] = useState<any>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setError(''); setData(null)
    annualRequest(`/api/annualities/members/${memberId}`).then(next => {
      if (!active) return
      const season = next.seasons.find((entry: any) => entry.endYear === referenceYear)
      if (!season) { setError('Esta temporada ainda não foi cadastrada. Confira o cadastro no menu Anuidades.'); return }
      setData({ ...next, seasons: [season] })
    }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, memberId, referenceYear])
  const annual = charges.filter(row => row.type === 'ANNUAL_FEE' && row.status !== 'CANCELLED')
  const enrollment = annual.find(row => row.annualEnrollment)?.annualEnrollment
  const historical = annual.length > 0 && annual.every(row => row.status === 'PAID') && !enrollment
  if (!annual.length && !seasonAvailable) return null
  return <section className="annual-season-plan" aria-label="Forma de pagamento da anuidade">
    <h4>{historical ? 'Forma de pagamento da anuidade' : '1. Forma de pagamento da anuidade'}</h4>
    {enrollment ? <><p><strong>{annualModeNames[enrollment.mode] || enrollment.mode}</strong></p><p>Forma de pagamento definida. Confira os recebimentos nas cobranças abaixo.</p></> : historical ? <><p><strong>Quitação anterior registrada</strong></p><p>O histórico foi preservado. Não é necessário definir um novo plano para uma anuidade já quitada.</p></> : <><p><strong>Ainda não definida</strong></p><p>Primeiro escolha a forma de pagamento para gerar as cobranças. Depois confirme cada valor recebido.</p>{secretary ? <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Escolher forma de pagamento</button> : <p>A Secretaria deve definir a forma de pagamento.</p>}</>}
    {open && <Modal title="Escolher forma de pagamento" onClose={() => setOpen(false)}><div className="annual-plan-dialog">
      <p className="annual-plan-context">Responsável financeiro: <strong>{responsibleName}</strong><br />Anuidade {referenceYear} <small>(01/11/{referenceYear - 1} a 31/10/{referenceYear})</small></p>
      {error && <p role="alert" className="form-error">{error}</p>}{loading && <p role="status">Carregando modalidades…</p>}
      {data && !loading && <AnnualPlans data={data} memberId={memberId} onChange={async () => { setOpen(false); await onChange() }} />}
    </div></Modal>}
  </section>
}
