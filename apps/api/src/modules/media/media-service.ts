import crypto from 'node:crypto'
import { imageSize } from 'image-size'
import { randomUUID } from 'node:crypto'
import type { MediaStorage } from './media-storage.js'
import { normalizeStorageKey } from './storage-key.js'
import { prepareMemberImage, prepareSpaceImage } from './image-processing.js'

export type MediaVisibility = 'PUBLIC' | 'PRIVATE'
export type MediaPurpose = 'MEMBER_PHOTO' | 'SPACE_PHOTO' | 'ANNOUNCEMENT_IMAGE' | 'EVENT_IMAGE' | 'ATTACHMENT'
export type MediaAssetRecord = { id: string; storageKey: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; checksumSha256: string; visibility: MediaVisibility; purpose: MediaPurpose; originalName: string | null; createdByUserId: string | null; deletedAt: Date | null }

export interface MediaAssetRepository {
  create(args: { data: Omit<MediaAssetRecord, 'id' | 'createdAt' | 'updatedAt'> }): Promise<MediaAssetRecord>
  update(args: { where: { id: string }; data: { deletedAt: Date } }): Promise<MediaAssetRecord>
}

const extensionByMime: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }
const imageMimeByType: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const namespaceByPurpose: Record<MediaPurpose, string> = { MEMBER_PHOTO: 'members', SPACE_PHOTO: 'spaces', ANNOUNCEMENT_IMAGE: 'announcements', EVENT_IMAGE: 'events', ATTACHMENT: 'attachments' }

export type CreateMediaAssetInput = { bytes: Uint8Array; mimeType: string; visibility: MediaVisibility; purpose: MediaPurpose; ownerId: string; originalName?: string | null; createdByUserId?: string | null; width?: number | null; height?: number | null }

export class MediaService {
  constructor(private readonly storage: MediaStorage, private readonly assets: MediaAssetRepository) {}

  createStorageKey(input: Pick<CreateMediaAssetInput, 'visibility' | 'purpose' | 'ownerId' | 'mimeType'>): string {
    const extension = extensionByMime[input.mimeType]
    if (!extension) throw new Error(`Unsupported media MIME type: ${input.mimeType}`)
    const scope = input.visibility === 'PUBLIC' ? 'public' : 'private'
    return normalizeStorageKey(`${scope}/${namespaceByPurpose[input.purpose]}/${input.ownerId}/${randomUUID()}.${extension}`)
  }

  async create(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
    const bytes = Buffer.from(input.bytes)
    if (bytes.length === 0) throw new Error('Media content cannot be empty.')
    const detected = this.detectImage(bytes, input.mimeType)
    const storageKey = this.createStorageKey(input)
    const checksumSha256 = crypto.createHash('sha256').update(bytes).digest('hex')
    await this.storage.put(storageKey, bytes)
    try {
      return await this.assets.create({ data: { storageKey, mimeType: input.mimeType, sizeBytes: bytes.length, width: detected?.width ?? input.width ?? null, height: detected?.height ?? input.height ?? null, checksumSha256, visibility: input.visibility, purpose: input.purpose, originalName: input.originalName ?? null, createdByUserId: input.createdByUserId ?? null, deletedAt: null } })
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined)
      throw error
    }
  }

  async createProcessedSpaceImage(input: Omit<CreateMediaAssetInput, 'bytes' | 'mimeType' | 'width' | 'height'> & { bytes: Uint8Array; requestedMimeType: string }): Promise<MediaAssetRecord> {
    const prepared = await prepareSpaceImage(input.bytes, input.requestedMimeType)
    return this.create({ ...input, bytes: prepared.bytes, mimeType: prepared.mimeType, width: prepared.width, height: prepared.height })
  }

  async createProcessedMemberImage(input: Omit<CreateMediaAssetInput, 'bytes' | 'mimeType' | 'width' | 'height'> & { bytes: Uint8Array; requestedMimeType: string }): Promise<MediaAssetRecord> {
    const prepared = await prepareMemberImage(input.bytes, input.requestedMimeType)
    return this.create({ ...input, bytes: prepared.bytes, mimeType: prepared.mimeType, width: prepared.width, height: prepared.height })
  }

  async softDelete(asset: Pick<MediaAssetRecord, 'id'>): Promise<MediaAssetRecord> { return this.assets.update({ where: { id: asset.id }, data: { deletedAt: new Date() } }) }

  private detectImage(bytes: Buffer, mimeType: string): { width: number; height: number } | null {
    if (mimeType === 'application/pdf') {
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('File content does not match its MIME type.')
      return null
    }
    if (!mimeType.startsWith('image/')) throw new Error(`Unsupported media MIME type: ${mimeType}`)
    let dimensions: { width?: number; height?: number; type?: string }
    try { dimensions = imageSize(bytes) } catch { throw new Error('Image content is invalid or corrupted.') }
    const detectedMime = imageMimeByType[dimensions.type || '']
    if (!detectedMime || detectedMime !== mimeType || !dimensions.width || !dimensions.height) throw new Error('Image content does not match its MIME type.')
    return { width: dimensions.width, height: dimensions.height }
  }
}
