import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { coreModule } from './modules/core/index.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import multipart from '@fastify/multipart'
import { personPhotoPath } from './config/storage.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  })

  await app.register(cors, {
    origin: env.webOrigin,
  })
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

  await app.register(coreModule, {
    prefix: '/api',
  })
  app.get('/uploads/person-photos/:file', async (request:any, reply) => { try { const f=path.basename(request.params.file); const data=await fs.readFile(personPhotoPath(f)); return reply.type(path.extname(f)==='.png'?'image/png':path.extname(f)==='.webp'?'image/webp':'image/jpeg').send(data) } catch { return reply.code(404).send({message:'Imagem não encontrada.'}) } })

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  return app
}
