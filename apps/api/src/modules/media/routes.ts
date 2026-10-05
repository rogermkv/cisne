import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireMediaStorage } from './runtime.js'

export const mediaRoutes: FastifyPluginAsync = async app => {
  app.get('/media/:id', async (request: any, reply) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: request.params.id } })
    if (!asset || asset.deletedAt || asset.visibility !== 'PUBLIC') return reply.code(404).send({ message: 'Mídia não encontrada.' })
    try {
      const storage = requireMediaStorage()
      const bytes = await storage.read(asset.storageKey)
      return reply.type(asset.mimeType).header('Cache-Control', 'public, max-age=31536000, immutable').send(bytes)
    } catch {
      return reply.code(404).send({ message: 'Mídia não encontrada.' })
    }
  })
}
