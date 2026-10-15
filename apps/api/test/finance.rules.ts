import assert from 'node:assert/strict'
import { effectiveFinancialStatus, financialAmounts, summarizeFinancialPortfolio } from '../src/modules/core/finance/status.js'

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
