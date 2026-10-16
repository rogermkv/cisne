// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
import { onTransactionRollback } from '../../../lib/request-transaction.js'
import { createMediaService, requireMediaStorage } from '../../media/runtime.js'
import { resolveFinancialResponsibleMemberId } from '../members/domain.js'
import { installmentSchedule, planModes, planNames, seasonLabel, brasiliaDay } from './domain.js'
import { fail, lockCharge, recordPayment } from './payments.js'

const documentFields = { id: true, chargeId: true, kind: true, status: true, rejectionReason: true, createdAt: true, reviewedAt: true, paymentId: true, asset: { select: { mimeType: true, originalName: true, sizeBytes: true } } }
export const annualChargeInclude = { annualEnrollment: { include: { season: true } }, documents: { orderBy: { createdAt: 'desc' as const }, select: documentFields } }
async function family(user: any) {
  const member = await prisma.member.findUnique({ where: { personId: user.personId } })
  if (!member || member.status !== 'ACTIVE') fail(403, 'Cadastro de sócio ativo necessário.')
  const responsibleId = await resolveFinancialResponsibleMemberId(member.id)
  if (!responsibleId) fail(403, 'Responsável financeiro não encontrado.')
  return { member, responsibleId }
}
async function authorizeCharge(user: any, charge: any) {
  if (user.activeRole === 'SOCIO') {
    const account = await family(user)
    if (account.responsibleId !== charge.responsibleMemberId) fail(404, 'Documento não encontrado.')
  } else if (!user.permissions.includes('finance.view')) fail(403, 'Sem permissão para consultar documentos financeiros.')
}
const seasonView = (season: any) => ({ ...season, plans: planModes.map(mode => ({ mode, description: mode === 'ADVANCE_12' ? 'PIX em 12 parcelas, de abril anterior ao início da temporada até março.' : mode === 'INSTALLMENTS_4' ? 'PIX ou boleto anexado pela secretaria, de novembro a fevereiro.' : mode === 'CREDIT_CARD' ? 'Link solicitado por WhatsApp. As parcelas ficam com a operadora do cartão.' : 'PIX integral, com vencimento até 10 de novembro.', available: season.enrollmentOpen && brasiliaDay() <= `${season.endYear}-10-31` && (!['CREDIT_CARD', 'PIX_ONCE'].includes(mode) || brasiliaDay() <= `${season.endYear - 1}-11-10`), schedule: installmentSchedule(season.endYear, mode, Number(season.amount)) })) })
const cents = (amount: unknown) => Math.round(Number(amount) * 100)
async function choosePlan(seasonId: string, responsibleId: string, mode: string, actor: any) {
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`season:${seasonId}`}))`
    const season = await prisma.annualSeason.findUnique({ where: { id: seasonId } })
    if (!season) fail(404, 'Temporada não encontrada.')
    if (!planModes.includes(mode)) fail(400, 'Selecione uma modalidade válida.')
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`annual:${responsibleId}:${season.endYear}`}))`
    const existing = await prisma.annualEnrollment.findUnique({ where: { seasonId_responsibleMemberId: { seasonId: season.id, responsibleMemberId: responsibleId } } })
    if (existing) {
      if (existing.mode !== mode) fail(409, 'Já existe uma modalidade escolhida. Entre em contato com a secretaria para uma alteração.')
      return existing
    }
    if (!season.enrollmentOpen || brasiliaDay() > `${season.endYear}-10-31` || (['CREDIT_CARD', 'PIX_ONCE'].includes(mode) && brasiliaDay() > `${season.endYear - 1}-11-10`)) fail(409, 'O prazo de escolha desta modalidade está encerrado.')
    const legacy = await prisma.financialCharge.findMany({ where: { responsibleMemberId: responsibleId, referenceYear: season.endYear, type: 'ANNUAL_FEE', status: { not: 'CANCELLED' } }, include: { payments: true } })
    if (legacy.length && (legacy.length !== 1 || legacy[0].payments.some((payment: any) => !payment.reversedAt) || legacy[0].status === 'PAID' || legacy[0].annualEnrollmentId || cents(legacy[0].amount) !== cents(season.amount))) fail(409, 'Esta temporada possui cobranças ou pagamentos anteriores. A secretaria precisa conciliar os registros antes da escolha, para evitar duplicidade.')
    const schedule = installmentSchedule(season.endYear, mode, Number(season.amount))
    const enrollment = await prisma.annualEnrollment.create({ data: { seasonId: season.id, responsibleMemberId: responsibleId, mode, amount: season.amount, createdByUserId: actor.id } })
    if (legacy.length) await prisma.financialCharge.update({ where: { id: legacy[0].id }, data: { status: 'CANCELLED' } })
    await prisma.financialCharge.createMany({ data: schedule.map(item => ({ ...item, memberId: responsibleId, responsibleMemberId: responsibleId, type: 'ANNUAL_FEE', status: 'PENDING', referenceYear: season.endYear, annualEnrollmentId: enrollment.id, description: `Anuidade ${seasonLabel(season.endYear)} · ${planNames[mode]}${schedule.length > 1 ? ` · Parcela ${item.installmentNumber}/${schedule.length}` : ''}` })) })
    return enrollment
}

export const annualityRoutes: FastifyPluginAsync = async app => {
  app.setErrorHandler((error: any, request, reply) => {
    if (error.code === 'P2002') return reply.code(409).send({ message: 'Este registro já existe. Atualize a tela antes de tentar novamente.' })
    if (error.statusCode && error.statusCode < 500) return reply.code(error.statusCode).send({ message: error.message })
    request.log.error({ err: error }, 'Annual payment operation failed')
    return reply.code(500).send({ message: 'Não foi possível concluir a operação. Nenhuma alteração foi confirmada.' })
  })
  const secretary = async (request: any, reply: any) => {
    await app.authenticate(request, reply)
    if (!reply.sent && request.authUser.activeRole !== 'SECRETARIA') return reply.code(403).send({ message: 'Somente a Secretaria pode realizar esta operação.' })
  }
  app.get('/annualities', { preHandler: app.requirePermission('finance.view') }, async () => ({ seasons: await prisma.annualSeason.findMany({ orderBy: { endYear: 'desc' }, include: { _count: { select: { enrollments: true } } } }), settings: await prisma.annualPaymentSetting.findUnique({ where: { id: 'club' } }) }))
  app.put('/annualities/settings', { preHandler: secretary }, async (request: any) => {
    const body = request.body || {}
    if (![body.pixKey, body.beneficiary, body.whatsapp].every(value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200)) fail(400, 'Preencha chave PIX, favorecido e WhatsApp.')
    const whatsapp = body.whatsapp.replace(/\D/g, '')
    if (!/^55\d{10,11}$/.test(whatsapp)) fail(400, 'Informe WhatsApp com país 55, DDD e número.')
    return prisma.annualPaymentSetting.upsert({ where: { id: 'club' }, create: { id: 'club', pixKey: body.pixKey.trim(), beneficiary: body.beneficiary.trim(), whatsapp }, update: { pixKey: body.pixKey.trim(), beneficiary: body.beneficiary.trim(), whatsapp } })
  })
  app.post('/annualities/seasons', { preHandler: app.requirePermission('finance.manage') }, async (request: any, reply) => {
    if (!['ADMIN', 'SECRETARIA'].includes(request.authUser.activeRole)) fail(403, 'Sem permissão para cadastrar temporadas.')
    const year = Number(request.body?.endYear), amount = Number(request.body?.amount)
    installmentSchedule(year, 'ADVANCE_12', amount)
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || typeof request.body?.enrollmentOpen !== 'boolean') fail(400, 'Informe valor em centavos e situação da escolha de planos.')
    if (await prisma.annualSeason.findUnique({ where: { endYear: year } })) fail(409, 'Esta temporada já foi cadastrada.')
    return reply.code(201).send(await prisma.annualSeason.create({ data: { endYear: year, amount, enrollmentOpen: request.body.enrollmentOpen } }))
  })
  app.put('/annualities/seasons/:id', { preHandler: app.requirePermission('finance.manage') }, async (request: any) => {
    if (!['ADMIN', 'SECRETARIA'].includes(request.authUser.activeRole)) fail(403, 'Sem permissão para editar temporadas.')
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`season:${request.params.id}`}))`
    const season = await prisma.annualSeason.findUnique({ where: { id: request.params.id } })
    if (!season) fail(404, 'Temporada não encontrada.')
    if (typeof request.body?.enrollmentOpen !== 'boolean') fail(400, 'Informe a situação de escolha de planos.')
    const amount = request.body.amount === undefined ? Number(season.amount) : Number(request.body.amount)
    installmentSchedule(season.endYear, 'ADVANCE_12', amount)
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) fail(400, 'Informe valor em centavos.')
    if (amount !== Number(season.amount) && await prisma.annualEnrollment.count({ where: { seasonId: season.id } })) fail(409, 'O valor não pode ser alterado após a primeira escolha de modalidade.')
    return prisma.annualSeason.update({ where: { id: season.id }, data: { amount, enrollmentOpen: request.body.enrollmentOpen } })
  })
  app.get('/member/me/annualities', { preHandler: app.authenticate }, async (request: any) => {
    const account = await family(request.authUser)
    const responsible = await prisma.member.findUnique({ where: { id: account.responsibleId }, select: { registrationNumber: true, person: { select: { fullName: true } } } })
    const enrollments = await prisma.annualEnrollment.findMany({ where: { responsibleMemberId: account.responsibleId }, include: { season: true } })
    const seasons = await prisma.annualSeason.findMany({ where: { OR: [{ enrollmentOpen: true }, { id: { in: enrollments.map(row => row.seasonId) } }] }, orderBy: { endYear: 'desc' } })
    return { responsible, canChoose: account.member.id === account.responsibleId, seasons: seasons.map(seasonView), enrollments, settings: await prisma.annualPaymentSetting.findUnique({ where: { id: 'club' } }) }
  })
  app.post('/member/me/annualities/:id/choose', { preHandler: app.authenticate }, async (request: any) => prisma.$transaction(async () => {
    const { member, responsibleId } = await family(request.authUser)
    if (member.id !== responsibleId) fail(403, 'A escolha da modalidade é feita pelo titular responsável pela conta familiar.')
    return choosePlan(request.params.id, responsibleId, request.body?.mode, request.authUser)
  }))
  app.get('/annualities/members/:id', { preHandler: secretary }, async (request: any) => {
    const responsibleId = await resolveFinancialResponsibleMemberId(request.params.id)
    if (!responsibleId) fail(404, 'Associado não encontrado.')
    const enrollments = await prisma.annualEnrollment.findMany({ where: { responsibleMemberId: responsibleId } })
    const seasons = await prisma.annualSeason.findMany({ orderBy: { endYear: 'desc' } })
    return { responsibleId, canChoose: true, seasons: seasons.map(seasonView), enrollments }
  })
  app.post('/annualities/members/:id/seasons/:seasonId/choose', { preHandler: secretary }, async (request: any) => prisma.$transaction(async () => {
    const responsibleId = await resolveFinancialResponsibleMemberId(request.params.id)
    if (!responsibleId) fail(404, 'Associado não encontrado.')
    const responsible = await prisma.member.findUnique({ where: { id: responsibleId } })
    if (!responsible || responsible.status !== 'ACTIVE') fail(409, 'O responsável financeiro precisa estar ativo.')
    return choosePlan(request.params.seasonId, responsibleId, request.body?.mode, request.authUser)
  }))
  app.get('/annualities/documents/:id/file', { preHandler: app.authenticate }, async (request: any, reply) => {
    const doc = await prisma.financialDocument.findUnique({ where: { id: request.params.id }, include: { asset: true, charge: true } })
    if (!doc || doc.asset.deletedAt) fail(404, 'Documento não encontrado.')
    await authorizeCharge(request.authUser, doc.charge)
    try { const bytes = await requireMediaStorage().read(doc.asset.storageKey); return reply.type(doc.asset.mimeType).header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff').header('Content-Disposition', `attachment; filename="${doc.kind === 'BOLETO' ? 'boleto' : 'comprovante'}-${doc.id}.${doc.asset.mimeType === 'application/pdf' ? 'pdf' : doc.asset.mimeType === 'image/png' ? 'png' : 'jpg'}"`).send(bytes) }
    catch { fail(404, 'Arquivo não encontrado.') }
  })
  app.post('/annualities/charges/:id/documents/:kind', { preHandler: app.authenticate }, async (request: any, reply) => prisma.$transaction(async () => {
    const kind = request.params.kind
    if (!['PROOF', 'BOLETO'].includes(kind)) fail(400, 'Tipo de documento inválido.')
    if (kind === 'BOLETO' && request.authUser.activeRole !== 'SECRETARIA') fail(403, 'Somente a Secretaria pode anexar boletos.')
    if (kind === 'PROOF' && !['SOCIO', 'SECRETARIA'].includes(request.authUser.activeRole)) fail(403, 'Sem permissão para enviar comprovantes.')
    const charge = await lockCharge(request.params.id)
    await authorizeCharge(request.authUser, charge)
    if (!charge.annualEnrollmentId || ['PAID', 'CANCELLED'].includes(charge.status)) fail(409, 'Esta cobrança não está disponível para envio de documentos.')
    if (kind === 'BOLETO' && charge.annualEnrollment.mode !== 'INSTALLMENTS_4') fail(409, 'Boletos estão disponíveis para o plano de quatro parcelas.')
    if (kind === 'PROOF' && await prisma.financialDocument.findFirst({ where: { chargeId: charge.id, kind, status: 'PENDING' } })) fail(409, 'Já existe um comprovante aguardando conferência para esta parcela.')
    const file = await request.file()
    if (!file || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) fail(400, 'Envie PDF, JPG ou PNG de até 5 MB.')
    let bytes: Buffer
    try { bytes = await file.toBuffer() } catch { fail(400, 'Envie um arquivo de até 5 MB.') }
    if (file.file.truncated || !bytes.length || bytes.length > 5 * 1024 * 1024) fail(400, 'Envie um arquivo de até 5 MB.')
    const { storage, service } = createMediaService()
    let asset
    try { asset = await service.create({ bytes, mimeType: file.mimetype, visibility: 'PRIVATE', purpose: 'ATTACHMENT', ownerId: charge.id, originalName: file.filename.slice(0,200), createdByUserId: request.authUser.id }) } catch { fail(400, 'O arquivo não corresponde ao formato informado ou não pôde ser armazenado.') }
    onTransactionRollback(() => storage.delete(asset.storageKey))
    if (kind === 'BOLETO') await prisma.financialDocument.updateMany({ where: { chargeId: charge.id, kind, status: 'AVAILABLE' }, data: { status: 'SUPERSEDED' } })
    return reply.code(201).send(await prisma.financialDocument.create({ data: { chargeId: charge.id, kind, status: kind === 'PROOF' ? 'PENDING' : 'AVAILABLE', mediaAssetId: asset.id, submittedByUserId: request.authUser.id }, select: documentFields }))
  }))
  app.post('/annualities/documents/:id/approve', { preHandler: secretary }, async (request: any) => prisma.$transaction(async () => {
    let doc = await prisma.financialDocument.findUnique({ where: { id: request.params.id } })
    if (!doc) fail(404, 'Comprovante não encontrado.')
    await lockCharge(doc.chargeId)
    doc = await prisma.financialDocument.findUnique({ where: { id: doc.id } })
    if (doc.kind !== 'PROOF' || doc.status !== 'PENDING') fail(409, 'Este comprovante já foi conferido ou não pode ser aprovado.')
    const payment = await recordPayment(doc.chargeId, request.body || {}, request.authUser, doc.id)
    return prisma.financialDocument.update({ where: { id: doc.id }, data: { status: 'APPROVED', reviewedAt: new Date(), reviewedByUserId: request.authUser.id, paymentId: payment.id }, select: documentFields })
  }))
  app.post('/annualities/documents/:id/reject', { preHandler: secretary }, async (request: any) => prisma.$transaction(async () => {
    let doc = await prisma.financialDocument.findUnique({ where: { id: request.params.id } })
    if (!doc) fail(404, 'Comprovante não encontrado.')
    await lockCharge(doc.chargeId)
    doc = await prisma.financialDocument.findUnique({ where: { id: doc.id } })
    if (doc.kind !== 'PROOF' || doc.status !== 'PENDING') fail(409, 'Este comprovante já foi conferido.')
    const reason = request.body?.reason
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) fail(400, 'Informe o motivo da recusa, com até 1000 caracteres.')
    return prisma.financialDocument.update({ where: { id: doc.id }, data: { status: 'REJECTED', rejectionReason: reason.trim(), reviewedAt: new Date(), reviewedByUserId: request.authUser.id }, select: documentFields })
  }))
}
