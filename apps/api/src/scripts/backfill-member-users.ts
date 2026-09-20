import { prisma } from '../lib/prisma.js'
import { normalizeCpf } from '../modules/core/auth/normalization.js'
import { hashPassword } from '../modules/core/auth/password.js'

const initialPassword = (birthDate: Date) => {
  const [year, month, day] = birthDate.toISOString().slice(0, 10).split('-')
  return `${day}${month}${year}`
}

const execute = process.argv.includes('--execute')

const main = async () => {
  const members = await prisma.member.findMany({
    include: { person: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const role = await prisma.role.findUnique({ where: { name: 'SOCIO' } })
  const validCpf = (cpf: string) => Boolean(normalizeCpf(cpf))
  const eligible = members.filter((member) => validCpf(member.person.cpf) && member.person.birthDate && !member.person.user)
  const insufficient = members.filter((member) => !validCpf(member.person.cpf) || !member.person.birthDate)
  const conflicts: Array<{ memberId: string; reason: string }> = []
  const safe = [] as typeof eligible

  for (const member of eligible) {
    const samePersonUser = await prisma.user.findUnique({ where: { personId: member.personId } })
    if (samePersonUser) {
      conflicts.push({ memberId: member.id, reason: 'Person já possui User' })
      continue
    }
    // CPF is unique on Person, which is the canonical login source in this schema.
    const duplicatePerson = await prisma.person.count({ where: { cpf: member.person.cpf, id: { not: member.personId } } })
    if (duplicatePerson > 0) {
      conflicts.push({ memberId: member.id, reason: 'CPF conflita com outra Person' })
      continue
    }
    safe.push(member)
  }

  console.log(JSON.stringify({
    mode: execute ? 'execute' : 'dry-run',
    totalMembers: members.length,
    alreadyWithUser: members.filter((member) => Boolean(member.person.user)).length,
    needsBackfill: eligible.length,
    insufficientData: insufficient.length,
    conflicts,
    safeToCreate: safe.length,
    insufficientDetails: insufficient.map((member) => ({ id: member.id, name: member.person.fullName, cpf: member.person.cpf, birthDate: member.person.birthDate })),
  }, null, 2))

  if (!execute) return

  let created = 0
  for (const member of safe) {
    const user = await prisma.user.create({ data: { personId: member.personId, passwordHash: await hashPassword(initialPassword(member.person.birthDate!)), mustChangePassword: true } })
    if (role) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })
    created += 1
  }
  console.log(JSON.stringify({ createdUsers: created }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
