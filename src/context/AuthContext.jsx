import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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
  const [authLoading, setAuthLoading] = useState(isFirebaseEnabled)

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setAuthLoading(false)
      return undefined
    }

    return observeAdminSession((profile) => {
      setUser(profile)
      setAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const profile = await signInAdminWithGoogle()
    setUser(profile)
    return profile
  }, [])

  const loginWithCredentials = useCallback(async (email, password) => {
    const profile = await signInAdminWithCredentials(email, password)
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    void signOutAdmin()
  }, [])

  const refreshProfile = useCallback(async () => {
    const profile = await refreshAdminSession()
    setUser(profile)
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
      authLoading,
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
