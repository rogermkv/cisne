import { prisma } from '../../lib/prisma.js'
import { mediaStorageRoot } from './config.js'
import { LocalMediaStorage } from './local-media-storage.js'
import { MediaService, type MediaAssetRecord, type MediaAssetRepository } from './media-service.js'

const repository: MediaAssetRepository = {
  async create(args) { return prisma.mediaAsset.create({ data: args.data }) as Promise<MediaAssetRecord> },
  async update(args) { return prisma.mediaAsset.update({ where: args.where, data: args.data }) as Promise<MediaAssetRecord> },
}

export function requireMediaStorage() {
  const root = mediaStorageRoot()
  if (!root) throw new Error('MEDIA_STORAGE_ROOT é obrigatória quando o MediaStorage é utilizado.')
  return new LocalMediaStorage(root)
}

export function createMediaService() {
  const storage = requireMediaStorage()
  return { storage, service: new MediaService(storage, repository) }
}
