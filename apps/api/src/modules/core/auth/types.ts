export type AuthenticatedUser = {
  id: string
  personId: string
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

export type LoginBody = {
  cpf?: unknown
  password?: unknown
}

export type ChangePasswordBody = {
  currentPassword?: unknown
  newPassword?: unknown
}
