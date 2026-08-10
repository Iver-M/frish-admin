import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi'
import Logo from '../components/common/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getAdmins } from '../data/admins.js'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { user, login, loginWithCredentials, isFirebaseEnabled } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()

    if (isFirebaseEnabled) {
      setError('')

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
      return
    }

    // No real authentication yet, but this is shaped exactly like a real
    // login will be: the user only provides credentials, and the role +
    // market scope are looked up from the account itself — never chosen by
    // the person logging in. Swap this lookup for a real Firebase sign-in
    // later (the returned ID token's custom claims replace `account`
    // below); nothing downstream (Sidebar, route guards, data scoping)
    // needs to change.
    const account = getAdmins().find((a) => a.email.toLowerCase() === email.trim().toLowerCase())

    if (!account) {
      setError('No admin account found for that email.')
      return
    }
    if (account.status === 'suspended') {
      setError('This account has been suspended. Contact a BFAR Admin.')
      return
    }

    setError('')
    login(account.role, account.marketId)
    navigate('/dashboard')
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

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <FiMail size={16} className="login-field__icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
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
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
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

            <button type="submit" className="login-card__submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Log In'}
            </button>

            <a href="#" className="login-card__forgot" onClick={(e) => e.preventDefault()}>
              Forgot Password?
            </a>
          </form>
        </div>
      </div>
    </div>
  )
}
