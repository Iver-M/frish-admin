import { createContext, useContext, useState, useCallback } from 'react'
import { getMarketById } from '../data/markets.js'

/**
 * Simulated auth/session state for this frontend-only prototype.
 *
 * This stands in for real Firebase Auth + custom claims. When the real
 * backend is wired up, `login()` below is where you'd instead call
 * Firebase's signIn + read the ID token's custom claims (role, marketId) —
 * everything downstream (Sidebar filtering, route guards, data scoping)
 * already reads from this same shape and won't need to change.
 */
const AuthContext = createContext(null)

const SESSION_KEY = 'frish_auth_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const session = raw ? JSON.parse(raw) : null
    return session?.role === 'market_admin' ? { ...session, marketId: 'pasig', marketName: 'Pasig Public Market' } : session
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())

  const login = useCallback((role, marketId = null) => {
    const market = marketId ? getMarketById(marketId) : null
    const nextUser = {
      name: role === 'bfar_admin' ? 'BFAR Admin' : `${market?.name || 'Market'} Admin`,
      role, // 'bfar_admin' | 'market_admin'
      marketId, // null for BFAR Admin (system-wide access)
      marketName: market?.name || null,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const isBfarAdmin = user?.role === 'bfar_admin'
  const isMarketAdmin = user?.role === 'market_admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, isBfarAdmin, isMarketAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
