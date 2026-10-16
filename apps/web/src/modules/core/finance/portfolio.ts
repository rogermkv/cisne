export const seasonOf = (row: any): string => String(row.referenceYear || new Date(row.dueDate).getUTCFullYear())
export const openCharge = (row: any): boolean => !['PAID','CANCELLED'].includes(row.status) && Number(row.balance ?? row.amount)>0
const cents=(value:unknown)=>{const amount=Number(value);return Number.isFinite(amount)?Math.round(amount*100):0}
export const sumMoney = (rows:any[],get:(row:any)=>unknown):number => rows.reduce((sum,row)=>sum+cents(get(row)),0)/100
export function responsibleOf(row:any) {
  const responsible=row.responsibleMember || row.member?.titular || row.member
  return {id:row.responsibleMemberId || responsible?.id || row.memberId || row.id,name:responsible?.person?.fullName || 'Responsável não informado',registration:responsible?.registrationNumber || '',phone:responsible?.person?.phone || '',person:responsible?.person}
}
export function receiptsOf(rows:any[]) {
  return rows.flatMap(charge=>(charge.payments||[]).filter((payment:any)=>!payment.reversedAt).map((payment:any)=>({...payment,charge}))).sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt))||String(a.id).localeCompare(String(b.id)))
}
export function summarizePortfolio(rows:any[]) {
  const pending=rows.filter(openCharge);const active=rows.filter(r=>r.status!=='CANCELLED');const ids=new Set(active.map(r=>responsibleOf(r).id));const overdueIds=new Set(pending.filter(r=>r.status==='OVERDUE').map(r=>responsibleOf(r).id));const receipts=receiptsOf(rows)
  return {open:sumMoney(pending,r=>r.balance??r.amount),overdue:sumMoney(pending.filter(r=>r.status==='OVERDUE'),r=>r.balance??r.amount),received:sumMoney(receipts,r=>r.amount),receiptCount:receipts.length,pendingCount:pending.length,responsibleCount:ids.size,overdueResponsibleCount:overdueIds.size,legacySettled:sumMoney(rows.filter(r=>r.paymentHistoryIncomplete),r=>Math.max(0,Number(r.paidAmount||0)-Number(r.recordedPaymentsTotal||0)))}
}
export function financialGroups(rows:any[]) {
  const groups=new Map<string,{id:string;name:string;registration:string;phone:string;charges:any[];receipts:any[];open:number;overdue:number;received:number}>()
  for(const row of rows){const responsible=responsibleOf(row);let group=groups.get(responsible.id);if(!group){group={...responsible,charges:[],receipts:[],open:0,overdue:0,received:0};groups.set(responsible.id,group)}group.charges.push(row)}
  return [...groups.values()].map(group=>{const totals=summarizePortfolio(group.charges);return {...group,charges:group.charges.sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))||String(a.id).localeCompare(String(b.id))),receipts:receiptsOf(group.charges),open:totals.open,overdue:totals.overdue,received:totals.received}})
}
export const groupMatches=(group:ReturnType<typeof financialGroups>[number],query:string):boolean=>{
  const needle=query.trim().toLocaleLowerCase('pt-BR');if(!needle)return true
  const fields = [group.name, group.registration, ...group.charges.flatMap(row => [row.member?.person?.fullName, row.member?.person?.cpf, row.member?.registrationNumber, row.responsibleMember?.person?.cpf, row.member?.titular?.person?.cpf, row.description])].filter(Boolean).map(value => String(value).toLocaleLowerCase('pt-BR'))
  const digits = needle.replace(/\D/g, '')
  return fields.some(value => value.includes(needle) || (/^[\d.\-\s]+$/.test(needle) && digits.length > 0 && value.replace(/\D/g, '').includes(digits)))
}
