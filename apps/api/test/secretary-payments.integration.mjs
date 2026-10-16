// Real API and isolated PostgreSQL16; never accepts a production connection.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
const cfg=JSON.parse(fs.readFileSync(0,'utf8'))
assert.ok(cfg.cloneVerified && process.env.DATABASE_URL.includes('/tmp/cisne-secretary-qa-'))
const p=new PrismaClient(), accounts=cfg.accounts
async function api(path,{who='secretary',method='GET',body,status=200}={}){
 const response=await fetch(cfg.base+'/api'+path,{method,headers:{...(accounts[who]?.token?{Authorization:'Bearer '+accounts[who].token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await response.json();assert.equal(response.status,status,`${method} ${path}: ${result.message||''}`);return result
}
const charges=who=>api('/finance/charges?memberId='+accounts[who].memberId)
const choose=(who,seasonId,mode,actor='secretary',status=200)=>api(`/annualities/members/${accounts[who].memberId}/seasons/${seasonId}/choose`,{who:actor,method:'POST',body:{mode},status})
try{
 for(const [who,status] of [['admin',403],['employee',403],['holderA',403],['anonymous',401]])await api('/annualities/members/'+accounts.holderA.memberId,{who,status})
 const season=await api('/annualities/seasons',{method:'POST',body:{endYear:2031,amount:1200.01,enrollmentOpen:true},status:201})
 const legacy=await api('/finance/charges',{method:'POST',body:{memberId:accounts.browser.memberId,type:'ANNUAL_FEE',description:'QA secretary legacy',amount:1200.01,referenceYear:2031,dueDate:'2030-11-10'},status:201})
 const enrollment=await Promise.all([choose('browser',season.id,'INSTALLMENTS_4'),choose('browser',season.id,'INSTALLMENTS_4')]);assert.equal(enrollment[0].id,enrollment[1].id);assert.equal(enrollment[0].createdByUserId,accounts.secretary.id)
 const rows=await charges('browser');assert.equal(rows.find(r=>r.id===legacy.id).status,'CANCELLED');const parcels=rows.filter(r=>r.annualEnrollmentId===enrollment[0].id).sort((a,b)=>a.installmentNumber-b.installmentNumber);assert.equal(parcels.length,4);assert.deepEqual(parcels.map(r=>r.dueDate.slice(0,10)),['2030-11-10','2030-12-10','2031-01-10','2031-02-10']);assert.equal(parcels.reduce((s,r)=>s+Math.round(r.amount*100),0),120001)
 const memberChoice=await api('/member/me/annualities',{who:'browser'});assert.equal(memberChoice.enrollments.find(r=>r.id===enrollment[0].id).mode,'INSTALLMENTS_4')
 await choose('browser',season.id,'ADVANCE_12','secretary',409)
 for(const [who,mode,count] of [['holderCard','CREDIT_CARD',1],['holderOnce','PIX_ONCE',1],['holderA','ADVANCE_12',12]]){const e=await choose(who,season.id,mode);assert.equal((await charges(who)).filter(r=>r.annualEnrollmentId===e.id).length,count)}
 for(const who of ['admin','employee','holderD'])await choose('holderD',season.id,'ADVANCE_12',who,403)
 const dependentView=await api('/annualities/members/'+accounts.dependent.memberId);assert.equal(dependentView.responsibleId,accounts.holderA.memberId);assert.equal((await choose('dependent',season.id,'ADVANCE_12')).responsibleMemberId,accounts.holderA.memberId)
 const body=new FormData();body.append('file',new Blob([Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')],{type:'application/pdf'}),'boleto.pdf');const upload=await fetch(cfg.base+'/api/annualities/charges/'+parcels[0].id+'/documents/BOLETO',{method:'POST',headers:{Authorization:'Bearer '+accounts.secretary.token},body});assert.equal(upload.status,201)
 const chargeId=parcels[0].id;const pay={amount:100,paidAt:'2026-10-15',method:'PIX'}
 const payment=await api(`/finance/charges/${chargeId}/payments`,{method:'POST',body:pay})
 const reversePath=`/finance/charges/${chargeId}/payments/${payment.id}/reverse`
 for(const [who,status] of [['admin',403],['employee',403],['holderD',403],['anonymous',401]])await api(reversePath,{who,method:'POST',body:{reason:'unauthorized'},status})
 await api(reversePath,{method:'POST',body:{reason:' '},status:400})
 await api(`/finance/charges/${parcels[1].id}/payments/${payment.id}/reverse`,{method:'POST',body:{reason:'wrong charge'},status:404})
 // Failure to persist the audit change must roll back the reversal and balance.
 await p.$executeRawUnsafe(`CREATE FUNCTION qa_reversal_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."tableName"='financial_payments' AND NEW.after ? 'reversedAt' THEN RAISE EXCEPTION 'QA audit rollback'; END IF; RETURN NEW; END $$`)
 await p.$executeRawUnsafe('CREATE TRIGGER qa_reversal_failure BEFORE INSERT ON activity_changes FOR EACH ROW EXECUTE FUNCTION qa_reversal_failure()')
 await api(reversePath,{method:'POST',body:{reason:'forced rollback'},status:500})
 assert.equal((await p.financialPayment.findUnique({where:{id:payment.id}})).reversedAt,null)
 await p.$executeRawUnsafe('DROP TRIGGER qa_reversal_failure ON activity_changes');await p.$executeRawUnsafe('DROP FUNCTION qa_reversal_failure()')
 const results=await Promise.all([200,409].map(async()=>{const res=await fetch(cfg.base+'/api'+reversePath,{method:'POST',headers:{Authorization:'Bearer '+accounts.secretary.token,'Content-Type':'application/json'},body:JSON.stringify({reason:'Registro lançado por engano'})});return res.status}));assert.deepEqual(results.sort(),[200,409])
 const refreshed=(await charges('browser')).find(r=>r.id===chargeId);assert.equal(refreshed.paidAmount,0);assert.equal(refreshed.balance,300);assert.equal(refreshed.payments.length,1);assert.equal(refreshed.payments[0].reversalReason,'Registro lançado por engano');assert.ok(refreshed.payments[0].reversedAt)
 await api(`/finance/charges/${chargeId}/payments`,{method:'POST',body:{...pay,amount:300}});assert.equal((await charges('browser')).find(r=>r.id===chargeId).status,'PAID')
 // An earlier proof approval is reversed together with its receipt, not deleted.
 const a=(await charges('holderA')).find(r=>r.referenceYear===2030&&r.installmentNumber===1);const approved=a.documents.find(d=>d.status==='APPROVED');assert.ok(approved)
 await api(`/finance/charges/${a.id}/payments/${approved.paymentId}/reverse`,{method:'POST',body:{reason:'Comprovante aprovado por engano'}})
 const ar=(await charges('holderA')).find(r=>r.id===a.id);assert.equal(ar.paidAmount,60);assert.equal(ar.balance,40);assert.equal(ar.documents.find(d=>d.id===approved.id).status,'REJECTED');assert.equal(ar.documents.find(d=>d.id===approved.id).paymentId,approved.paymentId)
 // Explicit legacy settlements do not fabricate receipts. Reopening keeps real partial payments.
 const old=await p.financialCharge.create({data:{memberId:accounts.holderD.memberId,responsibleMemberId:accounts.holderD.memberId,type:'ANNUAL_FEE',description:'QA old settlement',amount:400,referenceYear:2024,dueDate:new Date('2023-11-10'),status:'PAID',paidAt:new Date('2023-11-01'),payments:{create:{amount:100,method:'PIX',registeredByUserId:accounts.secretary.id}}}})
 await api(`/finance/charges/${old.id}/reopen-settlement`,{who:'admin',method:'POST',body:{reason:'bad'},status:403})
 await api(`/finance/charges/${old.id}/reopen-settlement`,{method:'POST',body:{reason:'Quitação legada incorreta'}})
 const reopened=(await charges('holderD')).find(r=>r.id===old.id);assert.equal(reopened.paidAmount,100);assert.equal(reopened.balance,300);assert.equal(reopened.status,'OVERDUE');assert.equal(reopened.settlementReversalReason,'Quitação legada incorreta');assert.equal(reopened.payments.length,1)
 await api(`/finance/charges/${old.id}/reopen-settlement`,{method:'POST',body:{reason:'again'},status:409})
 const logs=await api('/activity-logs?module=FINANCE&action=PAYMENT_REVERSE',{who:'admin'});const log=logs.records.find(r=>r.status==='SUCCESS'&&r.targetId===chargeId);assert.ok(log);assert.equal(log.actorId,accounts.secretary.id);assert.equal(log.actorRole,'SECRETARIA');const changes=await api('/activity-logs/'+log.id+'/changes',{who:'admin'});assert.ok(changes.changes.some(r=>r.after.reversalReason==='Registro lançado por engano'))
 const dashboard=await api('/finance/dashboard?from=2020-01-01&to=2032-12-31');const raw=await p.financialPayment.findMany({where:{reversedAt:null,charge:{status:{not:'CANCELLED'}}}});assert.equal(Math.round(dashboard.totalReceived*100),raw.reduce((s,r)=>s+Math.round(Number(r.amount)*100),0))
 await p.financialCharge.create({data:{memberId:accounts.holderD.memberId,responsibleMemberId:accounts.holderD.memberId,type:'ANNUAL_FEE',description:'QA legacy UI settlement',amount:200,referenceYear:2023,dueDate:new Date('2022-11-10'),status:'PAID',paidAt:new Date('2022-11-01')}})
 const pending=await p.financialCharge.create({data:{memberId:accounts.holderD.memberId,responsibleMemberId:accounts.holderD.memberId,type:'ANNUAL_FEE',description:'QA plan first',amount:400,referenceYear:2032,dueDate:new Date('2031-11-10')}})
 await api(`/finance/charges/${pending.id}/payments`,{method:'POST',body:{amount:100,method:'PIX',paidAt:'2026-10-15'},status:409})
 await api(`/finance/charges/${pending.id}/payments`,{who:'admin',method:'POST',body:{amount:100,method:'PIX',paidAt:'2026-10-15'},status:403})
 assert.equal(await p.financialPayment.count({where:{chargeId:pending.id}}),0)
 assert.equal((await p.financialCharge.findUnique({where:{id:pending.id}})).status,'PENDING')
 await api('/annualities/seasons',{method:'POST',body:{endYear:2032,amount:400,enrollmentOpen:true},status:201})
 await api('/annualities/seasons',{method:'POST',body:{endYear:2033,amount:400,enrollmentOpen:true},status:201})
 const other=await api('/finance/charges',{method:'POST',body:{memberId:accounts.holderD.memberId,type:'OTHER',description:'QA non annual',amount:50,referenceYear:2030,dueDate:'2029-11-10'},status:201})
 await api(`/finance/charges/${other.id}/payments`,{method:'POST',body:{amount:50,method:'PIX',paidAt:'2026-10-15'}})
 console.log(JSON.stringify({result:'PASS',checks:['annual-payment-before-choice-blocked','nonannual-payment-preserved','secretary-four-plans','idempotent-concurrent-choice','family-scope','legacy-charge-replaced-without-duplicate','member-sees-parcels','boleto-upload','role-and-charge-isolation','mandatory-reversal-reason','concurrent-reversal-once','audit-failure-rolls-back','receipt-preserved','proof-review-reopened','legacy-settlement-partial-preserved','dashboard-excludes-reversed','audit-actor-date-reason']}))
}finally{await p.$disconnect()}
