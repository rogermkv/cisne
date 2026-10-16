import assert from 'node:assert/strict'
import { effectiveFinancialStatus, financialAmounts, summarizeFinancialPortfolio, isOverdueAnnualInstallment, summarizeOverdueAnnualInstallments } from '../src/modules/core/finance/status.js'

const now = Date.UTC(2026, 8, 22, 12)
assert.equal(effectiveFinancialStatus({ status: 'PENDING', amount: 1600, dueDate: '2026-09-30T00:00:00.000Z', payments: [] }, now), 'PENDING')
assert.equal(effectiveFinancialStatus({ status: 'PENDING', amount: 1600, dueDate: '2026-09-01T00:00:00.000Z', payments: [] }, now), 'OVERDUE')
assert.equal(effectiveFinancialStatus({ status: 'PENDING', amount: 1600, dueDate: '2026-09-30T00:00:00.000Z', payments: [{ amount: 600 }] }, now), 'PARTIAL')
assert.equal(effectiveFinancialStatus({ status: 'PENDING', amount: 1600, dueDate: '2026-09-30T00:00:00.000Z', payments: [{ amount: 1600 }] }, now), 'PAID')
assert.equal(effectiveFinancialStatus({ status: 'CANCELLED', amount: 1600, dueDate: '2026-09-30T00:00:00.000Z', payments: [] }, now), 'CANCELLED')
const portfolio = summarizeFinancialPortfolio([
  { type: 'ANNUAL_FEE', responsibleMemberId: 'family-1', status: 'OVERDUE' },
  { type: 'ANNUAL_FEE', responsibleMemberId: 'family-1', status: 'PAID' },
  { type: 'ANNUAL_FEE', responsibleMemberId: 'family-2', status: 'PAID' },
  { type: 'RESERVATION', responsibleMemberId: 'family-3', status: 'OVERDUE' },
  { type: 'ANNUAL_FEE', responsibleMemberId: 'family-4', status: 'CANCELLED' },
])
assert.deepEqual(portfolio, { annualityCount: 3, annualitiesPaid: 2, annualitiesOverdue: 1, financialGroupCount: 2, groupsInDefault: 1, groupsInGoodStanding: 1 })
console.log('Finance status rules validated.')

// Imported settlements may predate the detailed receipt table: never turn them into debt.
const historical = { status: 'PAID', amount: 1600, paidAt: '2026-01-05', dueDate: '2026-01-10', payments: [] }
assert.equal(effectiveFinancialStatus(historical, now), 'PAID')
assert.deepEqual(financialAmounts(historical), { amount: 1600, paidAmount: 1600, recordedPaymentsTotal: 0, balance: 0, paymentHistoryIncomplete: true })
assert.equal(financialAmounts({ ...historical, payments: [{ amount: 600 }] }).paidAmount, 1600)
assert.equal(financialAmounts({ ...historical, payments: [{ amount: 1600 }] }).paymentHistoryIncomplete, false)
assert.equal(effectiveFinancialStatus({ ...historical, status: 'PENDING' }, now), 'OVERDUE')
assert.equal(financialAmounts({ ...historical, status: 'CANCELLED' }).balance, 0)
console.log('Recorded settlement regression validated without generating receipts.')

// Reversals preserve receipt history without contributing to current settlement.
const corrected = { status: 'PENDING', amount: 0.3, dueDate: '2030-11-10', payments: [{ amount: 0.1 }, { amount: 0.2 }, { amount: 100, reversedAt: '2026-10-15' }] }
assert.equal(financialAmounts(corrected).paidAmount, 0.3)
assert.equal(financialAmounts(corrected).balance, 0)
assert.equal(effectiveFinancialStatus(corrected, now), 'PAID')
console.log('Reversal and cents regression validated.')

const installmentNow = Date.UTC(2026, 9, 16, 12)
const overdueInstallment = { id: 'parcel-3', annualEnrollmentId: 'enrollment-1', installmentNumber: 3, responsibleMemberId: 'family-1', referenceYear: 2027, description: 'Anuidade 2026/2027 · Parcela 3/12', amount: 133.33, dueDate: '2026-10-10T00:00:00.000Z', status: 'PENDING', payments: [], responsibleMember: { person: { fullName: 'Roger Herpich' } } }
const currentInstallment = { ...overdueInstallment, id: 'parcel-4', installmentNumber: 4, dueDate: '2026-11-10T00:00:00.000Z' }
assert.equal(isOverdueAnnualInstallment(overdueInstallment, installmentNow), true)
assert.equal(isOverdueAnnualInstallment(currentInstallment, installmentNow), false)
assert.deepEqual(summarizeOverdueAnnualInstallments([overdueInstallment, currentInstallment], installmentNow).map((item) => ({ id: item.responsibleMemberId, count: item.overdueCount, total: Number(item.overdueTotal.toFixed(2)) })), [{ id: 'family-1', count: 1, total: 133.33 }])
console.log('Overdue annual installment count and cutoff validated.')
