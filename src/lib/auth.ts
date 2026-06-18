// Simple client-side passcode gate.
//
// SECURITY NOTE: this is a *soft gate* for a personal app, not real authentication.
// Only the SHA-256 hash of the passcode ships in the bundle (never the passcode itself),
// so the secret isn't sitting in plain sight — but a determined visitor could still
// bypass a purely client-side check. For real multi-user security you'd need a backend.

/** SHA-256 of the default passcode "educore". Override via VITE_PASSCODE_SHA256. */
const DEFAULT_HASH = '0e3af99e947dd2b46eec47ee8d0bddedbaa086017bdfa2f2af838dd67db26776'

export const PASSCODE_HASH: string =
  (import.meta.env.VITE_PASSCODE_SHA256 as string | undefined)?.trim() || DEFAULT_HASH

export const USING_DEFAULT_PASSCODE = PASSCODE_HASH === DEFAULT_HASH

const AUTH_KEY = 'educore-auth-v1'
/** Stay unlocked for 30 days, then re-prompt. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** True when the entered passcode matches the configured hash. */
export async function verifyPasscode(input: string): Promise<boolean> {
  if (!input) return false
  try {
    const hex = await sha256Hex(input)
    return timingSafeEqual(hex, PASSCODE_HASH)
  } catch {
    return false
  }
}

/** Constant-time string compare (lengths are fixed hex digests). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

interface AuthToken {
  hash: string
  expires: number
}

/** Whether the current browser is unlocked (and not expired). */
export function isUnlocked(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const tok = JSON.parse(raw) as AuthToken
    // Invalidate the session if the passcode hash changed.
    if (tok.hash !== PASSCODE_HASH) return false
    if (Date.now() > tok.expires) return false
    return true
  } catch {
    return false
  }
}

export function unlock() {
  const tok: AuthToken = { hash: PASSCODE_HASH, expires: Date.now() + TTL_MS }
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(tok))
  } catch {
    /* ignore */
  }
}

export function lock() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    /* ignore */
  }
}
