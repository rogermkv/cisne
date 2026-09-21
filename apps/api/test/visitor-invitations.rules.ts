import assert from 'node:assert/strict'
import { getMemberInvitationQuota, isInvitationEligible, parseCivilDate } from '../src/modules/core/visitors/quotas.js'

const member = (name: string, status = 'ACTIVE', dependent = false) => ({ status, category: { name, isDependent: dependent, requiresHolder: dependent } })
assert.equal(isInvitationEligible(member('Efetivo')), true)
assert.equal(isInvitationEligible(member('Patrimonial')), true)
assert.equal(isInvitationEligible(member('Dependente', 'ACTIVE', true)), false)
assert.equal(isInvitationEligible(member('Temporário')), false)
assert.equal(isInvitationEligible(member('Efetivo', 'INACTIVE')), false)
assert.equal(parseCivilDate('2026-10-05')?.toISOString(), '2026-10-05T00:00:00.000Z')
assert.equal(parseCivilDate('2026-02-30'), null)

const rows = [{ status: 'SCHEDULED' }, { status: 'USED' }, { status: 'CANCELLED' }]
const fakeDb = {
  member: { findUnique: async () => member('Patrimonial') },
  clubSetting: { findFirstOrThrow: async () => ({ memberMonthlyInvitationLimit: 10 }) },
  visitorInvitation: { count: async ({ where }: any) => rows.filter(row => where.status.in.includes(row.status)).length },
}
const quota = await getMemberInvitationQuota('member-test', new Date('2026-10-05T00:00:00Z'), fakeDb)
assert.deepEqual({ eligible: quota.eligible, used: quota.used, available: quota.available, month: quota.month, year: quota.year }, { eligible: true, used: 2, available: 8, month: 10, year: 2026 })
console.log('visitor invitation rules: ok')
