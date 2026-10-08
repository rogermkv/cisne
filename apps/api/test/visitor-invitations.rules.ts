import assert from 'node:assert/strict'
import { getMemberInvitationQuota, isCurrentMonthDate, isInvitationEligible, parseCivilDate, resolveQuotaOwnerId } from '../src/modules/core/visitors/quotas.js'

const holder = { id: 'holder-1', status: 'ACTIVE', category: { name: 'Patrimonial', isDependent: false, requiresHolder: false } }
const dependent = { id: 'dependent-1', status: 'ACTIVE', titularMemberId: holder.id, titular: holder, category: { name: 'Dependente', isDependent: true, requiresHolder: true } }
const inactiveDependent = { ...dependent, status: 'INACTIVE' }

assert.equal(isInvitationEligible(holder), true)
assert.equal(isInvitationEligible(dependent), true)
assert.equal(isInvitationEligible(inactiveDependent), false)
assert.equal(isInvitationEligible({ status: 'ACTIVE', category: { name: 'Temporário' } }), false)
assert.equal(parseCivilDate('2026-10-05')?.toISOString(), '2026-10-05T00:00:00.000Z')
assert.equal(parseCivilDate('2026-02-30'), null)
assert.equal(isCurrentMonthDate(new Date('2026-10-15T00:00:00Z'), new Date('2026-10-05T12:00:00Z')), true)
assert.equal(isCurrentMonthDate(new Date('2026-11-01T00:00:00Z'), new Date('2026-10-05T12:00:00Z')), false)
assert.equal(isCurrentMonthDate(new Date('2026-10-04T00:00:00Z'), new Date('2026-10-05T12:00:00Z')), false)
assert.equal(resolveQuotaOwnerId(holder), holder.id)
assert.equal(resolveQuotaOwnerId(dependent), holder.id)

const rows = [{ status: 'SCHEDULED', quotaOwnerMemberId: holder.id }, { status: 'USED', quotaOwnerMemberId: holder.id }, { status: 'CANCELLED', quotaOwnerMemberId: holder.id }]
const fakeDb = {
  member: { findUnique: async ({ where }: any) => where.id === dependent.id ? dependent : holder },
  clubSetting: { findFirstOrThrow: async () => ({ memberMonthlyInvitationLimit: 8 }) },
  visitorInvitation: { count: async ({ where }: any) => { assert.equal(where.quotaOwnerMemberId, holder.id); return rows.filter(row => where.status.in.includes(row.status)).length } },
}

const holderQuota = await getMemberInvitationQuota(holder.id, new Date('2026-10-05T00:00:00Z'), fakeDb)
const dependentQuota = await getMemberInvitationQuota(dependent.id, new Date('2026-10-05T00:00:00Z'), fakeDb)
assert.deepEqual({ eligible: holderQuota.eligible, used: holderQuota.used, available: holderQuota.available, limit: holderQuota.limit, quotaOwnerMemberId: holderQuota.quotaOwnerMemberId }, { eligible: true, used: 2, available: 6, limit: 8, quotaOwnerMemberId: holder.id })
assert.deepEqual({ eligible: dependentQuota.eligible, used: dependentQuota.used, available: dependentQuota.available, quotaOwnerMemberId: dependentQuota.quotaOwnerMemberId }, { eligible: true, used: 2, available: 6, quotaOwnerMemberId: holder.id })
console.log('visitor invitation rules: ok')
