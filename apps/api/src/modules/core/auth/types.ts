export type AuthenticatedUser = {
  id: string
  name: string
  cpf: string
  birthDate: string | null
  email: string | null
  phone: string | null
  mustChangePassword: boolean
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
