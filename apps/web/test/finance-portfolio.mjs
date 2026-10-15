import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../src/modules/core/finance/portfolio.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { financialGroups, summarizePortfolio, groupMatches, seasonOf } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const responsibleMember = { id: 'holder', registrationNumber: '000009', person: { fullName: 'Conta de teste', cpf: '98765432100' } }
const charge = (id, extra = {}) => ({ id, memberId: 'holder', responsibleMemberId: 'holder', responsibleMember, referenceYear: 2026, dueDate: '2026-01-01', status: 'OVERDUE', amount: 100, balance: 100, paidAmount: 0, payments: [], ...extra })
const rows = [charge('holder-charge'), charge('dependent-charge', { memberId: 'dependent', member: { registrationNumber: '000011', person: { fullName: 'Dependente de teste', cpf: '12345678900' } }, balance: 60, paidAmount: 40, payments: [{ id: 'receipt', amount: 40, paidAt: '2026-10-15' }] }), charge('legacy', { referenceYear: 2025, status: 'PAID', balance: 0, paidAmount: 100, recordedPaymentsTotal: 0, paymentHistoryIncomplete: true }), charge('cancelled', { status: 'CANCELLED', balance: 0 })]
const groups = financialGroups(rows)
assert.equal(groups.length, 1)
assert.equal(groups[0].open, 160)
assert.equal(groups[0].receipts.length, 1)
assert.equal(groupMatches(groups[0], 'Dependente'), true)
assert.equal(groupMatches(groups[0], '123.456.789-00'), true)
assert.equal(groupMatches(groups[0], '000009'), true)
assert.equal(groupMatches(financialGroups([rows[1]])[0], '987.654.321-00'), true)
const totals = summarizePortfolio(rows)
assert.equal(totals.responsibleCount, 1)
assert.equal(totals.overdueResponsibleCount, 1)
assert.equal(totals.open, 160)
assert.equal(totals.overdue, 160)
assert.equal(totals.received, 40)
assert.equal(totals.legacySettled, 100)
assert.equal(totals.pendingCount, 2)
assert.equal(summarizePortfolio(rows.filter(r => seasonOf(r) === '2025')).received, 0)
assert.equal(summarizePortfolio([charge('a', { amount: 0.1, balance: 0.1 }), charge('b', { amount: 0.2, balance: 0.2 })]).open, 0.3)
assert.equal(summarizePortfolio([charge('partial', { status: 'PARTIAL', balance: 60, paidAmount: 40 })]).overdue, 0)
assert.equal(rows[0].id, 'holder-charge')
console.log('PASS: family grouping, old debts, partial payments, legacy settlements, season scope and cents')
