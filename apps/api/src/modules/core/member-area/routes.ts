// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export const memberAreaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/member/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.authUser!.id }, include: { person: { include: { member: { include: { category: true, dependentes: { where: { status: { not: 'TERMINATED' } }, include: { person: true, category: true } }, invitations: { include: { visitor: { include: { person: true } } }, orderBy: { scheduledDate: 'desc' } } } } } } } })
    if (!user?.person.member) return reply.code(403).send({ message: 'Área disponível apenas para associados.' })
    const member = user.person.member
    return {
      member: { id: member.id, fullName: user.person.fullName, cpf: user.person.cpf, birthDate: user.person.birthDate, phone: user.person.phone, email: user.person.email, city: user.person.city, photoPath: user.person.photoPath, credentialToken: user.person.credentialToken, category: member.category.name, registrationNumber: member.registrationNumber, status: member.status, admissionDate: member.admissionDate },
      dependents: member.dependentes.map((dependent: any) => ({ id: dependent.id, fullName: dependent.person.fullName, cpf: dependent.person.cpf, birthDate: dependent.person.birthDate, photoPath: dependent.person.photoPath, credentialToken: dependent.person.credentialToken, relationship: dependent.relationship, active: dependent.status === 'ACTIVE' })),
      invitations: member.invitations,
    }
  })
}
