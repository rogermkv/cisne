// Real API + restored PostgreSQL only. Synthetic identities/tokens arrive on stdin.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const cfg = JSON.parse(fs.readFileSync(0, 'utf8'))
assert.ok(cfg.cloneVerified && cfg.database.startsWith('cisne_activity_annual_') && cfg.base === 'http://127.0.0.1:3339')
const accounts = cfg.accounts
async function api(path, { who = 'secretary', method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(cfg.base + '/api' + path, { method, headers: { ...(accounts[who]?.token ? { Authorization: 'Bearer ' + accounts[who].token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const result = await response.json()
  assert.equal(response.status, status, `${method} ${path}: ${result.message || ''}`)
  return result
}
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')
async function upload(chargeId, kind, who, status = 201, bytes = pdf, mime = 'application/pdf') {
  const body = new FormData(); body.append('file', new Blob([bytes], { type: mime }), 'document.pdf')
  const response = await fetch(cfg.base + `/api/annualities/charges/${chargeId}/documents/${kind}`, { method: 'POST', headers: { Authorization: 'Bearer ' + accounts[who].token }, body })
  const result = await response.json(); assert.equal(response.status, status, `upload ${kind}: ${result.message || ''}`); return result
}
const memberFinance = async who => (await api('/member/me/finance', { who })).history
await api('/annualities', { who: 'anonymous', status: 401 })
await api('/annualities', { who: 'holderA', status: 403 })
await api('/annualities', { who: 'employee', status: 403 })
const originalSettings = (await api('/annualities')).settings
await api('/annualities/settings', { who: 'admin', method: 'PUT', body: originalSettings, status: 403 })
await api('/annualities/settings', { who: 'holderA', method: 'PUT', body: originalSettings, status: 403 })
await api('/annualities/settings', { method: 'PUT', body: { pixKey: 'test@example.invalid', beneficiary: 'QA BENEFICIARY', whatsapp: '5555999999999' } })
assert.equal((await api('/member/me/annualities', { who: 'holderA' })).settings.pixKey, 'test@example.invalid')
await api('/annualities/settings', { method: 'PUT', body: originalSettings })
const season = await api('/annualities/seasons', { method: 'POST', body: { endYear: 2030, amount: 1200.01, enrollmentOpen: true }, status: 201 })
await api('/annualities/seasons', { method: 'POST', body: { endYear: 2030, amount: 1200, enrollmentOpen: true }, status: 409 })
await api(`/annualities/seasons/${season.id}`, { method: 'PUT', body: { amount: 1200.01, enrollmentOpen: false } })
await api(`/member/me/annualities/${season.id}/choose`, { who: 'holderA', method: 'POST', body: { mode: 'ADVANCE_12' }, status: 409 })
await api(`/annualities/seasons/${season.id}`, { method: 'PUT', body: { enrollmentOpen: true } })
const choose = (who, mode, status = 200, id = season.id) => api(`/member/me/annualities/${id}/choose`, { who, method: 'POST', body: { mode }, status })
const repeated = await Promise.all([choose('holderA', 'ADVANCE_12'), choose('holderA', 'ADVANCE_12')]); assert.equal(repeated[0].id, repeated[1].id)
let a = (await memberFinance('holderA')).filter(row => row.annualEnrollmentId === repeated[0].id).sort((a,b) => a.installmentNumber - b.installmentNumber)
assert.equal(a.length,12); assert.equal(a[0].dueDate.slice(0,10),'2029-04-10'); assert.equal(a.at(-1).dueDate.slice(0,10),'2030-03-10'); assert.equal(a.reduce((s,r)=>s+Math.round(r.amount*100),0),120001)
await choose('holderA','PIX_ONCE',409)
await choose('dependent','ADVANCE_12',403)
await api(`/annualities/seasons/${season.id}`, { method:'PUT',body:{enrollmentOpen:true,amount:1300},status:409 })
const card = await choose('holderCard','CREDIT_CARD'), once = await choose('holderOnce','PIX_ONCE'), d = await choose('holderD','INSTALLMENTS_4')
for(const [who, count] of [['holderCard',1],['holderOnce',1],['holderD',4]]) { const rows=(await memberFinance(who)).filter(r=>r.referenceYear===2030);assert.equal(rows.length,count);assert.equal(rows.reduce((v,r)=>v+Math.round(r.amount*100),0),120001) }
const ds=(await memberFinance('holderD')).sort((a,b)=>a.installmentNumber-b.installmentNumber);assert.deepEqual(ds.map(row=>row.dueDate.slice(0,10)),['2029-11-10','2029-12-10','2030-01-10','2030-02-10'])
const expired=await api('/annualities/seasons',{method:'POST',body:{endYear:2020,amount:1200.01,enrollmentOpen:true},status:201});await choose('holderOnce','CREDIT_CARD',409,expired.id)
const pay={amount:100,method:'PIX',paidAt:'2026-10-15'}
await api(`/finance/charges/${a[0].id}/payments`,{who:'admin',method:'POST',body:pay,status:403})
await api(`/finance/charges/${a[0].id}/payments`,{who:'holderA',method:'POST',body:pay,status:403})
await api(`/finance/charges/${a[0].id}`,{method:'PUT',body:{description:'bad',amount:1,referenceYear:2030,dueDate:'2029-04-10'},status:409})
await api(`/finance/charges/${a[0].id}/cancel`,{method:'POST',status:409})
await api('/finance/charges',{method:'POST',body:{memberId:accounts.holderA.memberId,type:'ANNUAL_FEE',description:'duplicate',amount:1200.01,referenceYear:2030,dueDate:'2029-04-10'},status:409})
await upload(a[0].id,'PROOF','holderCard',404)
await upload(a[0].id,'BOLETO','holderA',403)
await upload(a[0].id,'BOLETO','secretary',409)
await upload(a[2].id,'PROOF','holderA',400,Buffer.from('not a pdf'))
await upload(a[2].id,'PROOF','holderA',400,Buffer.from('plain'),'text/plain')
await upload(a[2].id,'PROOF','holderA',400,Buffer.alloc(5*1024*1024+1,65))
const proof=await upload(a[0].id,'PROOF','dependent')
assert.equal((await memberFinance('holderA')).find(r=>r.id===a[0].id).paidAmount,0)
await upload(a[0].id,'PROOF','holderA',409)
for(const [who,status] of [['anonymous',401],['holderCard',404],['holderA',200],['dependent',200],['secretary',200]]) { const response=await fetch(cfg.base+`/api/annualities/documents/${proof.id}/file`,{headers:accounts[who]?.token?{Authorization:'Bearer '+accounts[who].token}:{}});assert.equal(response.status,status);if(status===200){assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf)} }
await api(`/finance/charges/${a[0].id}/payments`,{method:'POST',body:pay,status:409})
await api(`/annualities/documents/${proof.id}/approve`,{who:'admin',method:'POST',body:pay,status:403})
const responseCodes=await Promise.all([1,2].map(async()=>{const response=await fetch(cfg.base+`/api/annualities/documents/${proof.id}/approve`,{method:'POST',headers:{Authorization:'Bearer '+accounts.secretary.token,'Content-Type':'application/json'},body:JSON.stringify({...pay,amount:40})});return response.status}));assert.deepEqual(responseCodes.sort(),[200,409])
let refreshed=(await memberFinance('holderA')).find(r=>r.id===a[0].id);assert.equal(refreshed.paidAmount,40);assert.equal(refreshed.balance,60);assert.equal(refreshed.payments.length,1);assert.equal(refreshed.documents[0].status,'APPROVED')
const second=await upload(a[0].id,'PROOF','holderA')
await api(`/annualities/documents/${second.id}/reject`,{method:'POST',body:{reason:''},status:400})
await api(`/annualities/documents/${second.id}/reject`,{method:'POST',body:{reason:'Documento de outra parcela'}})
assert.equal((await memberFinance('holderA')).find(r=>r.id===a[0].id).paidAmount,40)
await api(`/finance/charges/${a[0].id}/payments`,{method:'POST',body:{...pay,amount:60}})
refreshed=(await memberFinance('holderA')).find(r=>r.id===a[0].id);assert.equal(refreshed.status,'PAID');assert.equal(refreshed.balance,0)
const raced=await Promise.all([1,2].map(async()=>{const response=await fetch(cfg.base+`/api/finance/charges/${a[1].id}/payments`,{method:'POST',headers:{Authorization:'Bearer '+accounts.secretary.token,'Content-Type':'application/json'},body:JSON.stringify({...pay,amount:60})});return response.status}));assert.deepEqual(raced.sort(),[200,400])
const boleto=await upload(ds[0].id,'BOLETO','secretary');await upload(ds[0].id,'BOLETO','holderD',403);await upload(ds[0].id,'BOLETO','admin',403);const replacement=await upload(ds[0].id,'BOLETO','secretary');const withBills=(await memberFinance('holderD')).find(row=>row.id===ds[0].id);assert.equal(withBills.documents.filter(doc=>doc.status==='AVAILABLE').length,1);assert.equal(withBills.documents.filter(doc=>doc.status==='SUPERSEDED').length,1)
const legacy=await api('/finance/charges',{method:'POST',body:{memberId:accounts.holderLegacy.memberId,type:'ANNUAL_FEE',description:'QA LEGACY ANNUAL',amount:1200.01,referenceYear:2030,dueDate:'2029-11-10'},status:201});await choose('holderLegacy','ADVANCE_12');const legacyRows=(await memberFinance('holderLegacy'));assert.equal(legacyRows.find(row=>row.id===legacy.id).status,'CANCELLED');assert.equal(legacyRows.reduce((s,row)=>s+Math.round(row.balance*100),0),120001)
const oldPaid=await api('/finance/charges',{method:'POST',body:{memberId:accounts.holderPaid.memberId,type:'ANNUAL_FEE',description:'QA PAID ANNUAL',amount:1200.01,referenceYear:2030,dueDate:'2029-11-10'},status:201});await api(`/finance/charges/${oldPaid.id}/payments`,{method:'POST',body:{...pay,amount:1200.01}});await choose('holderPaid','ADVANCE_12',409);assert.equal((await memberFinance('holderPaid')).length,1)
const logs=await api('/activity-logs?module=FINANCE',{who:'admin'});assert.ok(logs.total>0)
console.log(JSON.stringify({result:'PASS',seasonId:season.id,faultChargeId:a[9].id,documentId:proof.id,checks:['four-plan-calendars-and-cents','idempotent-concurrent-enrollment','fixed-season-price-after-choice','deadline-and-closure','no-duplicate-legacy-debt','paid-legacy-preserved','private-proof-and-boleto-files','cross-family-and-role-denial','invalid-and-oversized-files','proof-not-payment','secretary-only-settlement','partial-full-payments','concurrent-approval-and-payment','reject-and-resubmit','boleto-replacement-history','settings-edit-and-member-refresh','financial-audit']}))
