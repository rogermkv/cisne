import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { changePassword as changePasswordRequest, getMe, login as loginRequest, type AuthUser } from '../../../api/auth'

const SESSION_KEY = 'cisne.accessToken'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (cpf: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_KEY)
    const controller = new AbortController()
    let active = true
    if (!token) {
      setLoading(false)
      return () => controller.abort()
    }
    getMe(token, controller.signal)
      .then((authenticatedUser) => {
        if (active) setUser(authenticatedUser)
      })
      .catch(() => {
        if (active) sessionStorage.removeItem(SESSION_KEY)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (cpf, password) => {
        const { token } = await loginRequest(cpf, password)
        const authenticatedUser = await getMe(token)
        sessionStorage.setItem(SESSION_KEY, token)
        setUser(authenticatedUser)
      },
      changePassword: async (currentPassword, newPassword) => {
        const token = sessionStorage.getItem(SESSION_KEY)
        if (!token) throw new Error('Sessão expirada.')
        await changePasswordRequest(token, currentPassword, newPassword)
        setUser((current) => current ? { ...current, mustChangePassword: false } : current)
      },
      logout: () => {
        sessionStorage.removeItem(SESSION_KEY)
        setUser(null)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
