import assert from 'node:assert/strict'
import { getMemberInvitationQuota, getVisitorSeasonQuota, isCurrentMonthDate, isInvitationEligible, parseCivilDate, resolveQuotaOwnerId, seasonBounds } from '../src/modules/core/visitors/quotas.js'

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
assert.deepEqual(seasonBounds(new Date('2026-10-08T00:00:00Z')), { start: new Date('2025-11-01T00:00:00.000Z'), end: new Date('2026-11-01T00:00:00.000Z'), startYear: 2025, endYear: 2026, label: '2025/2026' })
assert.deepEqual(seasonBounds(new Date('2026-11-01T00:00:00Z')), { start: new Date('2026-11-01T00:00:00.000Z'), end: new Date('2027-11-01T00:00:00.000Z'), startYear: 2026, endYear: 2027, label: '2026/2027' })
const visitorQuotaDb = {
  clubSetting: { findFirstOrThrow: async () => ({ visitorAnnualLimit: 7 }) },
  visitor: { findUnique: async () => ({ id: 'visitor-1', personId: 'person-1' }) },
  accessEvent: { count: async () => 3 },
  visitorInvitation: { count: async () => 2 },
}
const visitorQuota = await getVisitorSeasonQuota('visitor-1', new Date('2026-10-08T00:00:00Z'), visitorQuotaDb)
assert.deepEqual({ used: visitorQuota.used, reserved: visitorQuota.reserved, available: visitorQuota.available, limit: visitorQuota.limit, season: visitorQuota.season }, { used: 3, reserved: 2, available: 2, limit: 7, season: '2025/2026' })

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
