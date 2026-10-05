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
