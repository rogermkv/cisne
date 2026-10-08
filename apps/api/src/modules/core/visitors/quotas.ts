// @ts-nocheck
import { prisma } from '../../../lib/prisma.js'

export const countedInvitationStatuses = ['SCHEDULED', 'USED'] as const
const eligibleHolderCategories = new Set(['EFETIVO', 'PATRIMONIAL'])
const normalizeCategory = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

export const isInvitationEligible = (member: any) => Boolean(member && member.status === 'ACTIVE' && (member.titularMemberId ? member.titular?.status === 'ACTIVE' && eligibleHolderCategories.has(normalizeCategory(member.titular?.category?.name || '')) : !member.category?.isDependent && !member.category?.requiresHolder && eligibleHolderCategories.has(normalizeCategory(member.category?.name || ''))))

export const parseCivilDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return date.toISOString().slice(0, 10) === value ? date : null
}

export const civilDateValue = (date: Date) => date.toISOString().slice(0, 10)

export const monthBounds = (value: Date) => ({
  start: new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)),
  end: new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1)),
  year: value.getUTCFullYear(),
  month: value.getUTCMonth() + 1,
})

export const isCurrentMonthDate = (date: Date, now = new Date()) => {
  const current = monthBounds(now)
  return date >= current.start && date < current.end && civilDateValue(date) >= civilDateValue(now)
}

export const resolveQuotaOwnerId = (member: any) => member?.titularMemberId || member?.id || null

export async function getMemberInvitationQuota(memberId: string, date: Date, db: any = prisma) {
  const member = await db.member.findUnique({ where: { id: memberId }, include: { category: true, titular: { include: { category: true } } } })
  const settings = await db.clubSetting.findFirstOrThrow()
  const bounds = monthBounds(date)
  const limit = settings.memberMonthlyInvitationLimit ?? 8
  const quotaOwnerMemberId = resolveQuotaOwnerId(member)

  if (!isInvitationEligible(member) || !quotaOwnerMemberId) return { memberId, quotaOwnerMemberId, eligible: false, limit: 0, used: 0, available: 0, month: bounds.month, year: bounds.year }

  const used = await db.visitorInvitation.count({ where: { quotaOwnerMemberId, scheduledDate: { gte: bounds.start, lt: bounds.end }, status: { in: countedInvitationStatuses } } })
  return { memberId, quotaOwnerMemberId, eligible: true, limit, used, available: Math.max(0, limit - used), month: bounds.month, year: bounds.year }
}

export async function expirePastInvitations(db: any = prisma, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return db.visitorInvitation.updateMany({ where: { status: 'SCHEDULED', scheduledDate: { lt: today } }, data: { status: 'EXPIRED' } })
}

export const invitationEligibilityMessage = (member: any) => !member ? 'Sócio não encontrado.' : member.status !== 'ACTIVE' ? 'Este sócio está inativo e não pode emitir convites.' : !isInvitationEligible(member) ? 'A categoria deste sócio não possui direito à emissão de convites.' : null
export const quotaLockKey = (quotaOwnerMemberId: string, date: Date) => `${quotaOwnerMemberId}:${date.getUTCFullYear()}:${date.getUTCMonth() + 1}`
