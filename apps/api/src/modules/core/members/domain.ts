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

/** Same family scope used by the member activity record; invalid filters never become global. */
export async function resolveActivityFamily(memberId: unknown) {
  if (typeof memberId !== 'string' || !memberId.trim()) throw Object.assign(new Error('Informe um associado válido.'), { statusCode: 400 })
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, titularMemberId: true } })
  if (!member) throw Object.assign(new Error('Associado não encontrado.'), { statusCode: 404 })
  const holderId = member.titularMemberId || member.id
  const members = await prisma.member.findMany({ where: { OR: [{ id: holderId }, { titularMemberId: holderId, status: { not: 'TERMINATED' } }] }, select: { id: true } })
  return { holderId, memberIds: members.map(item => item.id) }
}
