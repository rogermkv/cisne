import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'

import { apiRequest } from '../../../api/client'
import { changePassword as changePasswordRequest, getMe, selectRole as selectRoleRequest, login as loginRequest, type AuthUser } from '../../../api/auth'

const SESSION_KEY = 'cisne.accessToken'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (cpf: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  selectRole: (role: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const dirtyForm = useRef(false)
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

  const refresh = async () => {
    const token = sessionStorage.getItem(SESSION_KEY)
    if (!token) return
    try { const next = await getMe(token); if (sessionStorage.getItem(SESSION_KEY) === token) setUser(next) }
    catch (error: any) { if (error.status === 401 && sessionStorage.getItem(SESSION_KEY) === token) { sessionStorage.removeItem(SESSION_KEY); setUser(null) } }
  }
  useEffect(() => {
    const markDirty = (event: Event) => { if ((event.target as HTMLElement)?.closest('form')) dirtyForm.current = true }
    const refreshSession = () => { void refresh() }
    document.addEventListener('input', markDirty, true); document.addEventListener('change', markDirty, true)
    window.addEventListener('focus', refreshSession); window.addEventListener('cisne:refresh-auth', refreshSession)
    const timer = window.setInterval(refreshSession, 45000)
    return () => { document.removeEventListener('input', markDirty, true); document.removeEventListener('change', markDirty, true); window.removeEventListener('focus', refreshSession); window.removeEventListener('cisne:refresh-auth', refreshSession); clearInterval(timer) }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      selectRole: async (role) => {
        if (role === user?.activeRole) return
        if (dirtyForm.current && document.querySelector('form') && !window.confirm('Há alterações no formulário que podem não ter sido salvas. Deseja trocar de papel e descartá-las?')) return
        const current = sessionStorage.getItem(SESSION_KEY)
        if (!current) throw new Error('Sessão expirada.')
        const { token } = await selectRoleRequest(current, role)
        const next = await getMe(token)
        sessionStorage.setItem(SESSION_KEY, token); dirtyForm.current = false; setUser(next)
      },
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
      logout: async () => {
        const token = sessionStorage.getItem(SESSION_KEY)
        try { if (token) await apiRequest('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) }
        catch { /* A disconnected client must still be able to clear its local credentials. */ }
        finally { sessionStorage.removeItem(SESSION_KEY); setUser(null) }
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
