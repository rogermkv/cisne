import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { coreModule } from './modules/core/index.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import multipart from '@fastify/multipart'
import { personPhotoPath, spacePhotoPath } from './config/storage.js'
import { mediaRoutes } from './modules/media/routes.js'
import { mediaView } from './modules/media/view.js'
import { serveModernOrLegacyMemberPhoto } from './modules/core/members/routes.js'
import { verifyAccessToken } from './modules/core/auth/jwt.js'

async function authenticateRootPhotoRequest(request: any, reply: any) {
  const authorization = request.headers.authorization
  const payload = authorization?.startsWith('Bearer ') ? verifyAccessToken(authorization.slice(7), env.jwtSecret) : null
  if (!payload) return reply.code(401).send({ message: 'Autenticação necessária.' })
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, active: true, mustChangePassword: true, person: { select: { id: true, fullName: true, cpf: true, birthDate: true, email: true, phone: true } }, roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { key: true } } } } } } } } } })
  if (!user?.active) return reply.code(401).send({ message: 'Autenticação necessária.' })
  request.authUser = { id: user.id, personId: user.person.id, name: user.person.fullName, cpf: user.person.cpf, birthDate: user.person.birthDate?.toISOString() ?? null, email: user.person.email, phone: user.person.phone, mustChangePassword: user.mustChangePassword, roles: user.roles.map((item: any) => item.role.name), permissions: [...new Set(user.roles.flatMap((item: any) => item.role.permissions.map((permission: any) => permission.permission.key)))] }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  })

  await app.register(cors, {
    origin: env.webOrigin,
  })
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

  await app.register(mediaRoutes, { prefix: '/api' })

  await app.register(coreModule, {
    prefix: '/api',
  })
  app.addHook('preHandler', async (request: any, reply) => {
    if (!request.url.startsWith('/uploads/person-photos/')) return
    await authenticateRootPhotoRequest(request, reply)
    if (reply.sent) return
    const requested = String(request.params?.file || '')
    const file = path.basename(requested)
    if (!file || file !== requested) return reply.code(404).send({ message: 'Imagem não encontrada.' })
    const person = await prisma.person.findFirst({ where: { photoPath: `/uploads/person-photos/${file}` }, select: { member: { select: { id: true } } } })
    if (!person?.member) return reply.code(404).send({ message: 'Imagem não encontrada.' })
    const asset = await prisma.person.findFirst({ where: { photoPath: `/uploads/person-photos/${file}` }, select: { photoAssetId: true } })
    if (asset?.photoAssetId) await serveModernOrLegacyMemberPhoto(request, reply, person.member.id)
  })
  app.get('/uploads/person-photos/:file', async (request:any, reply) => { try { const f=path.basename(request.params.file); const data=await fs.readFile(personPhotoPath(f)); return reply.type(path.extname(f)==='.png'?'image/png':path.extname(f)==='.webp'?'image/webp':'image/jpeg').send(data) } catch { return reply.code(404).send({message:'Imagem não encontrada.'}) } })

  app.get('/uploads/space-photos/:file', async (request:any, reply) => {
    const f = path.basename(request.params.file)
    try {
      const data = await fs.readFile(spacePhotoPath(f))
      return reply.type(path.extname(f) === '.png' ? 'image/png' : path.extname(f) === '.webp' ? 'image/webp' : 'image/jpeg').send(data)
    } catch {
      const legacyPath = `/uploads/space-photos/${f}`
      const photo = await prisma.spacePhoto.findFirst({ where: { path: legacyPath }, include: { mediaAsset: true } })
      if (!photo?.mediaAsset || photo.mediaAsset.deletedAt || photo.mediaAsset.visibility !== 'PUBLIC') return reply.code(404).send({ message: 'Imagem não encontrada.' })
      try {
        const { requireMediaStorage } = await import('./modules/media/runtime.js')
        const data = await requireMediaStorage().read(photo.mediaAsset.storageKey)
        return reply.type(photo.mediaAsset.mimeType).header('Cache-Control', 'public, max-age=31536000, immutable').send(data)
      } catch { return reply.code(404).send({ message: 'Imagem não encontrada.' }) }
    }
  })

  app.addHook('onSend', async (request, reply, payload) => {
    if (!String(reply.getHeader('content-type') || '').includes('application/json') || typeof payload !== 'string') return payload
    try {
      const visit = (value: any): any => {
        if (Array.isArray(value)) return value.map(visit)
        if (!value || typeof value !== 'object') return value
        if (value.mediaAsset) { value.media = mediaView(value.mediaAsset); if (value.media) value.path = value.media.url; delete value.mediaAsset }
        for (const key of Object.keys(value)) value[key] = visit(value[key])
        if (Array.isArray(value.photos)) { const primary = value.photos.find((photo: any) => photo.isPrimary && photo.media); value.primaryMedia = primary?.media || null; if (value.primaryMedia && value.imagePath) value.imagePath = value.primaryMedia.url }
        return value
      }
      return JSON.stringify(visit(JSON.parse(payload)))
    } catch { return payload }
  })

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  return app
}
