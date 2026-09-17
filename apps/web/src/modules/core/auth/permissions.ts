import type { AuthUser } from '../../../api/auth'

export function hasPermission(user: AuthUser | null, permission: string | readonly string[]): boolean {
  if (!user) return false
  const required = Array.isArray(permission) ? permission : [permission]
  return required.every((item) => user.permissions.includes(item))
}
