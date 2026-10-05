import crypto from 'node:crypto'
import { constants } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '../../src/lib/prisma.js'
import { inspectHistoricalImage } from '../../src/modules/media/image-processing.js'
import { mediaStorageRoot } from '../../src/modules/media/config.js'
import { LocalMediaStorage } from '../../src/modules/media/local-media-storage.js'

type Status = 'MIGRATED' | 'SKIPPED' | 'MISSING' | 'ERROR'
type Report = { personId: string; legacyPath: string; sourcePath: string | null; sourceChecksum: string | null; mediaAssetId: string | null; storageKey: string | null; destinationChecksum: string | null; status: Status; message?: string }
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
const filesByName = async (directory: string): Promise<string[]> => { const entries = await fs.readdir(directory, { withFileTypes: true }); const result: string[] = []; for (const entry of entries) { const full = path.join(directory, entry.name); if (entry.isDirectory()) result.push(...await filesByName(full)); else if (entry.isFile()) result.push(full) }; return result }
const storageKeyFor = (personId: string, mimeType: string) => `private/members/${personId}/${crypto.randomUUID()}.${mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'}`
const writeReport = async (rows: Report[]) => { if (!reportPath) return; if (reportFormat === 'tsv') { const keys = ['personId', 'legacyPath', 'sourcePath', 'sourceChecksum', 'mediaAssetId', 'storageKey', 'destinationChecksum', 'status', 'message']; await fs.writeFile(reportPath, [keys.join('\t'), ...rows.map(row => keys.map(key => String((row as any)[key] ?? '').replace(/\r?\n/g, ' ')).join('\t'))].join('\n') + '\n') } else await fs.writeFile(reportPath, JSON.stringify(rows, null, 2) + '\n') }

const main = async () => {
  const sourceDirectory = path.resolve(sourceRoot)
  await fs.access(sourceDirectory)
  await fs.access(path.resolve(root))
  await fs.access(path.dirname(path.resolve(root)), constants.W_OK)
  const sourceFiles = (await filesByName(sourceDirectory)).sort()
  const byBase = new Map<string, string[]>()
  for (const file of sourceFiles) byBase.set(path.basename(file), [...(byBase.get(path.basename(file)) || []), file])
  const referenced = new Set<string>()
  const rows: Report[] = []
  const people = await prisma.person.findMany({ where: { photoPath: { not: null } }, select: { id: true, photoPath: true, photoAssetId: true, photoAsset: true }, orderBy: { id: 'asc' } })
  for (const person of people) {
    const legacyPath = person.photoPath!
    const base = path.basename(legacyPath)
    const candidates = byBase.get(base) || []
    candidates.forEach(candidate => referenced.add(candidate))
    if (person.photoAssetId) {
      try { const bytes = await new LocalMediaStorage(root).read(person.photoAsset.storageKey); const digest = checksum(bytes); rows.push({ personId: person.id, legacyPath, sourcePath: null, sourceChecksum: digest, mediaAssetId: person.photoAsset.id, storageKey: person.photoAsset.storageKey, destinationChecksum: digest, status: digest === person.photoAsset.checksumSha256 ? 'SKIPPED' : 'ERROR', message: digest === person.photoAsset.checksumSha256 ? undefined : 'checksum divergente' }) } catch (error) { rows.push({ personId: person.id, legacyPath, sourcePath: null, sourceChecksum: null, mediaAssetId: person.photoAsset.id, storageKey: person.photoAsset.storageKey, destinationChecksum: null, status: 'ERROR', message: String(error) }) }
      continue
    }
    if (!candidates.length) { rows.push({ personId: person.id, legacyPath, sourcePath: null, sourceChecksum: null, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'MISSING' }); continue }
    const candidateData = await Promise.all(candidates.map(async candidate => { const bytes = await fs.readFile(candidate); return { candidate, bytes, digest: checksum(bytes) } }))
    const unique = new Map(candidateData.map(item => [item.digest, item]))
    if (unique.size > 1) { rows.push({ personId: person.id, legacyPath, sourcePath: null, sourceChecksum: null, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'ERROR', message: 'basenames iguais com checksums diferentes' }); continue }
    const selected = [...unique.values()][0]
    try {
      const metadata = await inspectHistoricalImage(selected.bytes)
      const key = storageKeyFor(person.id, metadata.mimeType)
      if (dryRun) { rows.push({ personId: person.id, legacyPath, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: null, storageKey: key, destinationChecksum: selected.digest, status: 'MIGRATED' }); continue }
      const storage = new LocalMediaStorage(root)
      await storage.put(key, selected.bytes)
      let asset: any
      try { asset = await prisma.$transaction(async tx => { const created = await tx.mediaAsset.create({ data: { storageKey: key, mimeType: metadata.mimeType, sizeBytes: selected.bytes.length, width: metadata.width, height: metadata.height, checksumSha256: selected.digest, visibility: 'PRIVATE', purpose: 'MEMBER_PHOTO', originalName: base, createdByUserId: null } }); await tx.person.update({ where: { id: person.id }, data: { photoAssetId: created.id } }); return created }) } catch (error) { await storage.delete(key).catch(() => undefined); throw error }
      rows.push({ personId: person.id, legacyPath, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: asset.id, storageKey: key, destinationChecksum: checksum(await storage.read(key)), status: 'MIGRATED' })
    } catch (error) { rows.push({ personId: person.id, legacyPath, sourcePath: selected.candidate, sourceChecksum: selected.digest, mediaAssetId: null, storageKey: null, destinationChecksum: null, status: 'ERROR', message: String(error) }) }
  }
  const orphanCount = sourceFiles.filter(file => !referenced.has(file)).length
  await writeReport(rows)
  console.log(JSON.stringify({ dryRun, total: rows.length, migrated: rows.filter(row => row.status === 'MIGRATED').length, skipped: rows.filter(row => row.status === 'SKIPPED').length, missing: rows.filter(row => row.status === 'MISSING').length, errors: rows.filter(row => row.status === 'ERROR').length, orphanCount, report: reportPath || null }))
  if (rows.some(row => row.status === 'ERROR')) process.exitCode = 2
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
