export type MediaStorageStat = { sizeBytes: number; modifiedAt: Date }

export interface MediaStorage {
  put(storageKey: string, data: Uint8Array): Promise<void>
  read(storageKey: string): Promise<Buffer>
  exists(storageKey: string): Promise<boolean>
  stat(storageKey: string): Promise<MediaStorageStat>
  delete(storageKey: string): Promise<void>
}
