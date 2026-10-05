import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { normalizeStorageKey } from './storage-key.js'
import type { MediaStorage, MediaStorageStat } from './media-storage.js'

type FileSystemAdapter = { writeFile: typeof fs.writeFile; link: typeof fs.link; unlink: typeof fs.unlink; realpath: typeof fs.realpath }
const defaultFileSystem: FileSystemAdapter = { writeFile: fs.writeFile, link: fs.link, unlink: fs.unlink, realpath: fs.realpath }

export class LocalMediaStorage implements MediaStorage {
  private readonly absoluteRoot: string

  constructor(root: string, private readonly fileSystem: FileSystemAdapter = defaultFileSystem) {
    this.absoluteRoot = path.resolve(root)
  }

  private resolve(storageKey: string): string {
    const safeKey = normalizeStorageKey(storageKey)
    const destination = path.resolve(this.absoluteRoot, ...safeKey.split('/'))
    const relative = path.relative(this.absoluteRoot, destination)
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Storage key resolves outside the configured storage root.')
    }
    return destination
  }

  private async assertDirectoryInsideRoot(directory: string): Promise<void> {
    const root = await this.fileSystem.realpath(this.absoluteRoot)
    const realDirectory = await this.fileSystem.realpath(directory)
    const relative = path.relative(root, realDirectory)
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Storage path resolves outside the configured storage root.')
    }
  }

  async put(storageKey: string, data: Uint8Array): Promise<void> {
    const safeKey = normalizeStorageKey(storageKey)
    const destination = this.resolve(safeKey)
    const directory = path.dirname(destination)
    const temporary = path.join(directory, `.tmp-${crypto.randomUUID()}`)
    await fs.mkdir(directory, { recursive: true, mode: 0o750 })
    await this.assertDirectoryInsideRoot(directory)
    try {
      await this.fileSystem.writeFile(temporary, Buffer.from(data), { flag: 'wx', mode: 0o640 })
      // link(2) creates the destination atomically and fails with EEXIST;
      // unlike rename(2), it never replaces an existing destination.
      await this.fileSystem.link(temporary, destination)
      await this.fileSystem.unlink(temporary)
    } catch (error) {
      await this.fileSystem.unlink(temporary).catch(() => undefined)
      throw error
    }
  }

  async read(storageKey: string): Promise<Buffer> {
    const destination = this.resolve(storageKey)
    await this.assertDirectoryInsideRoot(path.dirname(destination))
    return fs.readFile(destination)
  }

  async exists(storageKey: string): Promise<boolean> {
    try { await fs.access(this.resolve(storageKey)); return true } catch { return false }
  }

  async stat(storageKey: string): Promise<MediaStorageStat> {
    const destination = this.resolve(storageKey)
    await this.assertDirectoryInsideRoot(path.dirname(destination))
    const result = await fs.stat(destination)
    return { sizeBytes: result.size, modifiedAt: result.mtime }
  }

  async delete(storageKey: string): Promise<void> {
    const destination = this.resolve(storageKey)
    await this.assertDirectoryInsideRoot(path.dirname(destination))
    await fs.rm(destination, { force: true })
  }
}
