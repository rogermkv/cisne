import crypto from 'node:crypto'
import { constants } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '../../src/lib/prisma.js'
import { inspectHistoricalImage } from '../../src/modules/media/image-processing.js'
import { mediaStorageRoot } from '../../src/modules/media/config.js'
import { LocalMediaStorage } from '../../src/modules/media/local-media-storage.js'

type Status = 'MIGRATED' | 'SKIPPED' | 'MISSING' | 'AMBIGUOUS' | 'ERROR'
type Report = { spacePhotoId: string; spaceId: string; legacyPath: string; sourcePath: string | null; sourceChecksum: string | null; mediaAssetId: string | null; storageKey: string | null; destinationChecksum: string | null; status: Status; message?: string }

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const valueOf = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined }
const sourceRoot = valueOf('--source-root')
const reportPath = valueOf('--report')
const reportFormat = valueOf('--format') || 'json'

if (!sourceRoot) throw new Error('--source-root é obrigatório.')
const root = mediaStorageRoot()
if (!root) throw new Error('MEDIA_STORAGE_ROOT é obrigatória para a migração.')

const checksum = (bytes: Uint8Array) => crypto.createHash('sha256').update(bytes).digest('hex')
const filesByName = async (directory: string): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const result: string[] = []
  for (const entry of entries) { const full = path.join(directory, entry.name); if (entry.isDirectory()) result.push(...await filesByName(full)); else if (entry.isFile()) result.push(full) }
  return result
}
const storageKeyFor = (spaceId: string, mimeType: string) => `public/spaces/${spaceId}/${crypto.randomUUID()}.${mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'}`
const writeReport = async (rows: Report[]) => {
  if (!reportPath) return
  if (reportFormat === 'tsv') { const keys = ['spacePhotoId', 'spaceId', 'legacyPath', 'sourcePath', 'sourceChecksum', 'mediaAssetId', 'storageKey', 'destinationChecksum', 'status', 'message']; await fs.writeFile(reportPath, [keys.join('\t'), ...rows.map(row => keys.map(key => String((row as any)[key] ?? '').replace(/\r?\n/g, ' ')).join('\t'))].join('\n') + '\n') }
  else await fs.writeFile(reportPath, JSON.stringify(rows, null, 2) + '\n')
}

const main = async () => {
  const sourceDirectory = path.resolve(sourceRoot)
  const destinationRoot = path.resolve(root)
  try {
    await fs.access(sourceDirectory)
    await fs.access(destinationRoot)
    await fs.access(path.dirname(destinationRoot), constants.W_OK)
  } catch (error) { throw new Error(`Preflight de origem/destino falhou: ${error}`) }
  const sourceFiles = (await filesByName(sourceDirectory)).sort()
  const sourceBytes = (await Promise.all(sourceFiles.map(async file => (await fs.stat(file)).size))).reduce((sum, size) => sum + size, 0)
  const destinationFs = await fs.statfs(destinationRoot)
  const availableBytes = Number(destinationFs.bavail) * Number(destinationFs.bsize)
  if (availableBytes < sourceBytes) throw new Error(`Espaço livre insuficiente no destino: ${availableBytes} bytes disponíveis para ${sourceBytes} bytes de origem.`)
  const byBase = new Map<string, string[]>()
  for (const file of sourceFiles) { const base = path.basename(file); byBase.set(base, [...(byBase.get(base) || []), file]) }
  const rows: Report[] = []
  const photos = await prisma.spacePhoto.findMany({ include: { mediaAsset: true, space: true }, orderBy: { id: 'asc' } })
  const spaces = await prisma.reservableSpace.findMany({ include: { photos: true }, orderBy: { id: 'asc' } })
  for (const space of spaces.filter(row => row.imagePath)) {
    const primary = space.photos.find(photo => photo.isPrimary)
    if (!primary || path.basename(primary.path) !== path.basename(space.imagePath!)) console.warn(`INCONSISTENT_PRIMARY\t${space.id}\t${space.imagePath}`)
  }
  for (const photo of photos) {
    const base = path.basename(photo.path)
    const candidates = byBase.get(base) || []
    if (photo.mediaAssetId) {
      if (!photo.mediaAsset || photo.mediaAsset.deletedAt) rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: null, sourceChecksum: null, mediaAssetId: photo.mediaAssetId, storageKey: photo.mediaAsset?.storageKey || null, destinationChecksum: null, status: 'ERROR', message: 'mediaAssetId inconsistente' })
      else { try { const bytes = await new LocalMediaStorage(root).read(photo.mediaAsset.storageKey); const digest = checksum(bytes); rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: null, sourceChecksum: digest, mediaAssetId: photo.mediaAsset.id, storageKey: photo.mediaAsset.storageKey, destinationChecksum: digest, status: digest === photo.mediaAsset.checksumSha256 ? 'SKIPPED' : 'ERROR', message: digest === photo.mediaAsset.checksumSha256 ? undefined : 'checksum do asset divergente' }) } catch (error) { rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: null, sourceChecksum: null, mediaAssetId: photo.mediaAsset.id, storageKey: photo.mediaAsset.storageKey, destinationChecksum: null, status: 'ERROR', message: String(error) }) }
      }
      continue
    }
    if (!candidates.length) { rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: null, sourceChecksum: null, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'MISSING' }); continue }
    const candidateData = await Promise.all(candidates.map(async candidate => ({ candidate, bytes: await fs.readFile(candidate), digest: checksum(await fs.readFile(candidate)) })))
    const unique = new Map(candidateData.map(item => [item.digest, item]))
    if (unique.size > 1) { rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: null, sourceChecksum: null, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'AMBIGUOUS', message: 'basenames iguais com checksums diferentes' }); continue }
    const selected = [...unique.values()][0]
    try {
      const metadata = await inspectHistoricalImage(selected.bytes)
      const key = storageKeyFor(photo.spaceId, metadata.mimeType)
      if (dryRun) { rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: null, storageKey: key, destinationChecksum: selected.digest, status: 'MIGRATED' }); continue }
      const storage = new LocalMediaStorage(root)
      await storage.put(key, selected.bytes)
      let asset: any
      try {
        asset = await prisma.$transaction(async tx => {
          const created = await tx.mediaAsset.create({ data: { storageKey: key, mimeType: metadata.mimeType, sizeBytes: selected.bytes.length, width: metadata.width, height: metadata.height, checksumSha256: selected.digest, visibility: 'PUBLIC', purpose: 'SPACE_PHOTO', originalName: path.basename(photo.path), createdByUserId: null } })
          await tx.spacePhoto.update({ where: { id: photo.id }, data: { mediaAssetId: created.id } })
          return created
        })
      } catch (error) { await storage.delete(key).catch(() => undefined); throw error }
      rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: asset.id, storageKey: key, destinationChecksum: checksum(await storage.read(key)), status: 'MIGRATED' })
    } catch (error) { rows.push({ spacePhotoId: photo.id, spaceId: photo.spaceId, legacyPath: photo.path, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'ERROR', message: String(error) }) }
  }
  await writeReport(rows)
  console.log(JSON.stringify({ dryRun, total: rows.length, migrated: rows.filter(row => row.status === 'MIGRATED').length, skipped: rows.filter(row => row.status === 'SKIPPED').length, missing: rows.filter(row => row.status === 'MISSING').length, ambiguous: rows.filter(row => row.status === 'AMBIGUOUS').length, errors: rows.filter(row => row.status === 'ERROR').length, report: reportPath || null }))
  if (rows.some(row => row.status === 'ERROR' || row.status === 'AMBIGUOUS')) process.exitCode = 2
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
