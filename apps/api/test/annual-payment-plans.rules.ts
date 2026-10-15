import assert from 'node:assert/strict'
import { installmentSchedule, planModes, brasiliaDay } from '../src/modules/core/annualities/domain.js'
import { effectiveFinancialStatus } from '../src/modules/core/finance/status.js'
const a = installmentSchedule(2027, 'ADVANCE_12', 1600)
assert.equal(a.length, 12)
assert.equal(a[0].dueDate.toISOString().slice(0,10), '2026-04-10')
assert.equal(a.at(-1)!.dueDate.toISOString().slice(0,10), '2027-03-10')
assert.deepEqual(installmentSchedule(2027, 'INSTALLMENTS_4', 1600).map(row => row.dueDate.toISOString().slice(0,10)), ['2026-11-10','2026-12-10','2027-01-10','2027-02-10'])
for (const mode of ['CREDIT_CARD', 'PIX_ONCE'] as const) { const rows = installmentSchedule(2027, mode, 1600); assert.equal(rows.length, 1); assert.equal(rows[0].amount, 1600); assert.equal(rows[0].dueDate.toISOString().slice(0,10), '2026-11-10') }
for (let cents = 12; cents < 10000; cents += 37) for (const mode of planModes) { const rows = installmentSchedule(2027, mode, cents / 100); assert.equal(rows.reduce((sum,row) => sum + Math.round(row.amount * 100), 0), cents); assert.ok(rows.every(row => row.amount >= 0.01 && row.dueDate.getUTCDate() === 10)) }
for (const value of [0, -1, NaN, Infinity]) assert.throws(() => installmentSchedule(2027, 'ADVANCE_12', value))
assert.throws(() => installmentSchedule(2027, 'ADVANCE_12', 0.11))
const charge = { annualEnrollmentId:'annual', status:'PENDING', amount:100, dueDate:'2026-11-10T00:00:00.000Z', payments:[] }
assert.equal(effectiveFinancialStatus(charge, +new Date('2026-11-11T02:59:59.999Z')), 'PENDING')
assert.equal(effectiveFinancialStatus(charge, +new Date('2026-11-11T03:00:00.000Z')), 'OVERDUE')
assert.equal(effectiveFinancialStatus({ ...charge, payments:[{amount:40}] }, +new Date('2026-11-10T12:00:00Z')), 'PARTIAL')
assert.equal(effectiveFinancialStatus({ ...charge, payments:[{amount:100}] }), 'PAID')
assert.equal(effectiveFinancialStatus({ ...charge, annualEnrollmentId:null }, +new Date('2026-11-11T00:00:00Z')), 'OVERDUE')
assert.equal(brasiliaDay(new Date('2026-11-11T02:59:59Z')), '2026-11-10')
console.log('PASS schedules, cents, season boundaries, partial payments and Brasilia due-day rollover')
