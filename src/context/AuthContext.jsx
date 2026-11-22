import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { isFirebaseEnabled } from '../services/firebase.js'
import {
  observeAdminSession,
  refreshAdminSession,
  signInAdminWithCredentials,
  signInAdminWithGoogle,
  signOutAdmin,
} from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [sessionState, setSessionState] = useState(isFirebaseEnabled ? 'checking' : 'ready')
  const sessionVersion = useRef(0)

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined

    return observeAdminSession((profile, loading = false) => {
      sessionVersion.current += 1
      setUser(profile)
      setSessionState(loading ? 'switching' : 'ready')
    })
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const current = sessionVersion.current
    const profile = await signInAdminWithGoogle()
    if (current === sessionVersion.current) setUser(profile)
    return profile
  }, [])

  const loginWithCredentials = useCallback(async (email, password) => {
    const current = sessionVersion.current
    const profile = await signInAdminWithCredentials(email, password)
    if (current === sessionVersion.current) setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    sessionVersion.current += 1
    setUser(null)
    void signOutAdmin()
  }, [])

  const refreshProfile = useCallback(async () => {
    const current = sessionVersion.current
    const profile = await refreshAdminSession()
    if (current === sessionVersion.current) setUser(profile)
    return profile
  }, [])

  const isBfarAdmin = user?.role === 'bfar_admin'
  const isMarketAdmin = user?.role === 'market_admin'

  return (
    <AuthContext.Provider value={{
      user,
      loginWithGoogle,
      loginWithCredentials,
      refreshProfile,
      logout,
      isBfarAdmin,
      isMarketAdmin,
      isFirebaseEnabled,
      authLoading: sessionState !== 'ready',
      switchingSession: sessionState === 'switching',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
