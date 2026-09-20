import { prisma } from '../../../lib/prisma.js'

/** Resolves the single member responsible for all family-level financial records. */
export async function resolveFinancialResponsibleMember(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { category: true, titular: true },
  })
  if (!member) return null
  return member.category.isDependent || member.category.requiresHolder
    ? member.titular
    : member
}

export async function resolveFinancialResponsibleMemberId(memberId: string) {
  return (await resolveFinancialResponsibleMember(memberId))?.id ?? null
}
