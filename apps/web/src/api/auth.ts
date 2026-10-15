import { apiRequest } from './client'

export type AuthUser = {
  id: string
  name: string
  cpf: string
  birthDate: string | null
  email: string | null
  phone: string | null
  mustChangePassword: boolean
  assignedRoles: string[]
  activeRole: string | null
  roles: string[]
  permissions: string[]
}

type LoginResponse = { token: string; expiresIn: number }
type MeResponse = { user: AuthUser }

export function login(cpf: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, password }),
  })
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: true }>('/api/auth/password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function getMe(token: string, signal?: AbortSignal): Promise<AuthUser> {
  const response = await apiRequest<MeResponse>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  return response.user
}

export function selectRole(token: string, role: string): Promise<LoginResponse> {
  return apiRequest('/api/auth/role', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ role }) })
}
