// Modern write routes for space media. Legacy filesystem behavior remains isolated to read compatibility routes.
import type { FastifyInstance } from 'fastify'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prisma } from '../../../lib/prisma.js'
import { configuredSpacePhotosDirectory } from '../../../config/storage.js'
import { createMediaService } from '../../media/runtime.js'
import { prepareSpaceImage } from '../../media/image-processing.js'

const legacyPath = (file: string) => `/uploads/space-photos/${file}`

export function installSpaceMediaTransition(app: FastifyInstance) {
  const authorize = async (request: any, reply: any) => {
    await app.authenticate(request, reply)
    if (reply.sent) return false
    await app.requirePermission('reservations.manage')(request, reply)
    return !reply.sent
  }

  app.post('/spaces/:id/photo', { preHandler: authorize }, async (request: any, reply: any) => {
    const spaceId = request.params.id
      const space = await prisma.reservableSpace.findUnique({ where: { id: spaceId } })
      if (!space) return reply.code(404).send({ message: 'EspaÃ§o nÃ£o encontrado.' })
      const part = await request.file().catch(() => null)
      if (!part) return reply.code(400).send({ message: 'Arquivo de foto obrigatÃ³rio.' })
      const input = await part.toBuffer()
      const primaryRequested = String((part.fields as any)?.isPrimary?.value || '') === 'true'
      let asset: any
      let storage: any
      let legacyFile: string | null = null
      let legacyWritten = false
      try {
        const runtime = createMediaService()
        storage = runtime.storage
        const prepared = await prepareSpaceImage(input, part.mimetype)
        asset = await runtime.service.create({ bytes: prepared.bytes, mimeType: prepared.mimeType, visibility: 'PUBLIC', purpose: 'SPACE_PHOTO', ownerId: space.id, originalName: part.filename || null, createdByUserId: request.authUser?.id || null, width: prepared.width, height: prepared.height })
        legacyFile = crypto.randomUUID() + '.' + prepared.extension
        const pathValue = legacyPath(legacyFile)
        if (configuredSpacePhotosDirectory) { await fs.mkdir(configuredSpacePhotosDirectory, { recursive: true }); await fs.writeFile(path.join(configuredSpacePhotosDirectory, legacyFile), prepared.bytes, { flag: 'wx' }); legacyWritten = true }
        const count = await prisma.spacePhoto.count({ where: { spaceId: space.id } })
        const isPrimary = primaryRequested || count === 0
        const photo = await prisma.$transaction(async tx => {
          if (isPrimary) { await tx.spacePhoto.updateMany({ where: { spaceId: space.id }, data: { isPrimary: false } }); await tx.reservableSpace.update({ where: { id: space.id }, data: { imagePath: pathValue } }) }
          return tx.spacePhoto.create({ data: { spaceId: space.id, path: pathValue, mediaAssetId: asset.id, isPrimary, sortOrder: count }, include: { mediaAsset: true } })
        })
        return reply.code(201).send({ ...photo, media: { id: asset.id, url: `/api/media/${asset.id}`, mimeType: asset.mimeType, width: asset.width, height: asset.height } })
      } catch (error: any) {
        if (asset) { await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => undefined); if (storage) await storage.delete(asset.storageKey).catch(() => undefined) }
        if (legacyWritten && legacyFile && configuredSpacePhotosDirectory) await fs.rm(path.join(configuredSpacePhotosDirectory, legacyFile), { force: true }).catch(() => undefined)
        const message = error?.message || 'NÃ£o foi possÃ­vel gravar a foto.'
        return reply.code(/foto|imagem|image|MIME|Formato|unsupported|corrupt|buffer|format|MB|dimens/i.test(message) ? 400 : 500).send({ message })
      }
  })

  app.addHook('preHandler', async (request: any, reply: any) => {
    if (request.method === 'DELETE' && /^\/api\/spaces\/[^/]+\/photos\/[^/]+(?:\?.*)?$/.test(request.url)) {
      if (!(await authorize(request, reply))) return reply
      const [, , , spaceId, , photoId] = request.url.split(/[/?]/)
      const photo = await prisma.spacePhoto.findFirst({ where: { id: photoId, spaceId }, include: { mediaAsset: true } })
      if (!photo) return reply.code(404).send({ message: 'Foto nÃ£o encontrada.' })
      if (photo.isPrimary && await prisma.spacePhoto.count({ where: { spaceId: photo.spaceId, id: { not: photo.id } } })) return reply.code(409).send({ message: 'Defina outra foto como principal antes de remover esta foto.' })
      await prisma.$transaction(async tx => { await tx.spacePhoto.delete({ where: { id: photo.id } }); if (photo.isPrimary) await tx.reservableSpace.update({ where: { id: photo.spaceId }, data: { imagePath: null } }); if (photo.mediaAssetId) await tx.mediaAsset.update({ where: { id: photo.mediaAssetId }, data: { deletedAt: new Date() } }) })
      if (!photo.mediaAssetId) { const { spacePhotoPath } = await import('../../../config/storage.js'); await fs.rm(spacePhotoPath(path.basename(photo.path)), { force: true }) }
      return reply.send({ ok: true })
    }

    if (request.method === 'DELETE' && /^\/api\/spaces\/[^/]+(?:\?.*)?$/.test(request.url)) {
      if (!(await authorize(request, reply))) return reply
      const spaceId = request.url.split('/')[3]
      const count = await prisma.reservation.count({ where: { spaceId } })
      if (count) return reply.code(409).send({ message: 'EspaÃ§o possui histÃ³rico; desative-o em vez de excluÃ­-lo.' })
      const photos = await prisma.spacePhoto.findMany({ where: { spaceId }, select: { mediaAssetId: true } })
      await prisma.$transaction(async tx => { const ids = photos.flatMap(photo => photo.mediaAssetId ? [photo.mediaAssetId] : []); if (ids.length) await tx.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }); await tx.reservableSpace.delete({ where: { id: spaceId } }) })
      return reply.send({ ok: true })
    }
  })
}
