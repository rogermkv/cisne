import path from 'node:path'

const WINDOWS_DRIVE = /^[A-Za-z]:/u
const URL_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/u

export function normalizeStorageKey(value: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('Storage key must be a non-empty string.')
  const key = value.trim()
  if (!key || key !== value || key.includes('\0') || key.includes('\\')) throw new Error('Storage key contains invalid characters.')
  if (key.startsWith('/') || WINDOWS_DRIVE.test(key) || URL_SCHEME.test(key)) throw new Error('Storage key must be relative and cannot be a URL or absolute path.')
  if (path.posix.isAbsolute(key) || path.win32.isAbsolute(key)) throw new Error('Storage key must be relative.')
  const segments = key.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) throw new Error('Storage key cannot contain path traversal segments.')
  return segments.join('/')
}
