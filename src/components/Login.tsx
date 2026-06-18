import { useState } from 'react'
import { listUsers } from '../lib/auth'

interface LoginProps {
  onLogin: (name: string, email?: string) => void
}

export function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const users = listUsers()
  const clean = name.trim()
  const isReturning = users.some((u) => u.toLowerCase() === clean.toLowerCase())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clean) return
    onLogin(clean, email.trim() || undefined)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">🎓</div>
        <h1 className="login-title">EDUcore Mastery</h1>
        <p className="login-sub">
          {users.length > 0
            ? 'Pick your profile, or add a new name. Progress is saved on this device.'
            : 'Enter your name to start. Your progress is saved on this device.'}
        </p>

        {users.length > 0 && (
          <div className="login-profiles">
            {users.map((u) => (
              <button type="button" key={u} className="login-profile" onClick={() => onLogin(u)}>
                <span className="lp-avatar">{u.slice(0, 1).toUpperCase()}</span>
                <span className="lp-name">{u}</span>
              </button>
            ))}
          </div>
        )}

        <input
          className="login-input"
          type="text"
          autoFocus
          value={name}
          placeholder={users.length > 0 ? 'Or add a new name…' : 'Your name'}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
        />

        <input
          className="login-input login-email"
          type="email"
          value={email}
          placeholder="Email (optional)"
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email (optional, for badge credentials)"
        />
        <div className="login-hint">Email is optional — used only to personalize earned badge credentials, and stored hashed.</div>

        <button className="btn primary block login-btn" type="submit" disabled={!clean}>
          {isReturning ? 'Continue →' : 'Start →'}
        </button>
      </form>
    </div>
  )
}
