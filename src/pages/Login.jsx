import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMail, FiLock } from 'react-icons/fi'
import Logo from '../components/common/Logo.jsx'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // No authentication in this prototype — go straight to the dashboard.
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
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <FiLock size={16} className="login-field__icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-card__submit">
              Log In
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
