import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiLock, FiMail } from 'react-icons/fi'
import Logo from '../components/common/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const {
    user,
    loginWithGoogle,
    loginWithCredentials,
    isFirebaseEnabled,
    authLoading,
  } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handlePasswordSignIn(event) {
    event.preventDefault()
    setError('')

    if (!isFirebaseEnabled) {
      setError('Firebase is not configured on this computer. Complete .env.local and restart the portal.')
      return
    }
    if (!email.trim() || !password) {
      setError('Enter both your email address and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await loginWithCredentials(email.trim(), password)
      navigate('/dashboard')
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    if (!isFirebaseEnabled) {
      setError('Firebase is not configured on this computer. Complete .env.local and restart the portal.')
      return
    }

    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in with Google right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Logo className="login-card__logo" />

        <div className="login-card__panel">
          <h2 className="login-card__heading">FRISH Admin</h2>
          <p className="login-card__subheading">
            Fish Freshness Inspection System — Administration Portal
          </p>

          <form onSubmit={handlePasswordSignIn}>
            <div className="login-field">
              <FiMail size={16} className="login-field__icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); if (error) setError('') }}
                autoComplete="username"
                required
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="login-field">
              <FiLock size={16} className="login-field__icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); if (error) setError('') }}
                autoComplete="current-password"
                required
                aria-invalid={Boolean(error)}
              />
            </div>

            {error && (
              <p className="login-error" role="alert" aria-live="polite">
                <FiAlertCircle size={14} /> {error}
              </p>
            )}

            <button type="submit" className="login-card__submit" disabled={isSubmitting || authLoading} aria-busy={isSubmitting || authLoading}>
              {authLoading ? 'Checking secure session…' : isSubmitting ? 'Signing in…' : 'Log In'}
            </button>
          </form>

          <div className="login-card__divider"><span>or</span></div>

          <button
            type="button"
            className="login-card__google"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || authLoading}
            aria-busy={isSubmitting || authLoading}
          >
            <GoogleMark />
            {authLoading
              ? 'Checking secure session…'
              : isSubmitting
                ? 'Signing in…'
                : 'Continue with Google'}
          </button>

          <p className="login-card__access-note">
            Authorized BFAR-NCR and Pasig LGU administrator accounts only.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  )
}
