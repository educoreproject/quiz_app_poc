import { useState } from 'react'
import { USING_DEFAULT_PASSCODE, verifyPasscode } from '../lib/auth'

interface LoginProps {
  onUnlock: () => void
}

export function Login({ onUnlock }: LoginProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const [shake, setShake] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (checking) return
    setChecking(true)
    setError(false)
    const ok = await verifyPasscode(code)
    setChecking(false)
    if (ok) {
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setCode('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="login-screen">
      <form className={`login-card ${shake ? 'shake' : ''}`} onSubmit={submit}>
        <div className="login-mark">🎓</div>
        <h1 className="login-title">EDUcore Mastery</h1>
        <p className="login-sub">Enter your passcode to continue.</p>

        <input
          className={`login-input ${error ? 'err' : ''}`}
          type="password"
          autoFocus
          value={code}
          placeholder="Passcode"
          onChange={(e) => {
            setCode(e.target.value)
            setError(false)
          }}
          aria-label="Passcode"
        />
        {error && <div className="login-err">Incorrect passcode — try again.</div>}

        <button className="btn primary block login-btn" type="submit" disabled={checking || !code}>
          {checking ? 'Checking…' : 'Unlock →'}
        </button>

        {USING_DEFAULT_PASSCODE && (
          <div className="login-hint">
            Default passcode is <code>educore</code>. Set <code>VITE_PASSCODE_SHA256</code> to change it.
          </div>
        )}
      </form>
    </div>
  )
}
