import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api from '../services/api'

export type Role = 'DRIVER' | 'DEALER' | 'BRAND'

interface AuthUser {
  id: string
  email: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (email: string, password: string, role: Role) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  // Access token lives only in memory — never written to localStorage or cookies
  const accessTokenRef = useRef<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const setTokens = (token: string, userData: AuthUser) => {
    accessTokenRef.current = token
    setAccessToken(token)
    setUser(userData)
  }

  const clearTokens = () => {
    accessTokenRef.current = null
    setAccessToken(null)
    setUser(null)
  }

  // On mount, try to restore session from the httpOnly refresh token cookie
  useEffect(() => {
    api.post('/auth/refresh')
      .then(({ data }) => setTokens(data.accessToken, data.user))
      .catch(() => { /* no active session */ })
      .finally(() => setLoading(false))
  }, [])

  // Axios interceptor: attach access token + auto-refresh on 401
  useEffect(() => {
    const reqId = api.interceptors.request.use((config) => {
      if (accessTokenRef.current) {
        config.headers.Authorization = `Bearer ${accessTokenRef.current}`
      }
      return config
    })

    const resId = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const original = err.config
        // Retry once with a fresh access token if we get a 401 (expired token)
        const isRefreshCall = original.url?.includes('/auth/refresh')
        if (err.response?.status === 401 && !original._retry && !isRefreshCall) {
          original._retry = true
          try {
            const { data } = await api.post('/auth/refresh')
            setTokens(data.accessToken, data.user)
            original.headers.Authorization = `Bearer ${data.accessToken}`
            return api(original)
          } catch {
            clearTokens()
          }
        }
        return Promise.reject(err)
      },
    )

    return () => {
      api.interceptors.request.eject(reqId)
      api.interceptors.response.eject(resId)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setTokens(data.accessToken, data.user)
    return data.user as AuthUser
  }, [])

  const register = useCallback(async (email: string, password: string, role: Role) => {
    await api.post('/auth/register', { email, password, role })
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    clearTokens()
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
