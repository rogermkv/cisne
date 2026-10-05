export function mediaStorageRoot(): string | undefined {
  const value = process.env.MEDIA_STORAGE_ROOT
  return value && value.trim() ? value : undefined
}
