// Device-local profiles. No real authentication — each device remembers the
// names that have been used on it and which one is currently active. Every
// profile's scores are stored separately on the device (see storage.ts), so a
// brand-new name starts with a clean slate.

const USERS_KEY = 'educore-users-v1'
const ACTIVE_KEY = 'educore-active-user-v1'
const EMAIL_PREFIX = 'educore-email-v1'

/** All profile names known on this device, in the order they were added. */
export function listUsers(): string[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string') : []
  } catch {
    return []
  }
}

/** The currently logged-in profile on this device, or null if none. */
export function getActiveUser(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null
  } catch {
    return null
  }
}

/**
 * Log in (creating the profile if it's new) and make it active.
 * Matching is case-insensitive but preserves the original casing, so "brandon"
 * and "Brandon" resolve to the same profile and the same saved scores.
 * Returns the canonical name to use for loading/saving state.
 */
export function login(name: string): string {
  const clean = name.trim()
  if (!clean) return ''
  const users = listUsers()
  const existing = users.find((u) => u.toLowerCase() === clean.toLowerCase())
  const canonical = existing ?? clean
  if (!existing) {
    users.push(canonical)
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    } catch {
      /* ignore quota errors */
    }
  }
  try {
    localStorage.setItem(ACTIVE_KEY, canonical)
  } catch {
    /* ignore */
  }
  return canonical
}

/** Log out — forget who's active, but keep every profile's saved scores. */
export function logout() {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore */
  }
}

// ---- Optional email (used only to mint badge credentials) ------------------

/** The optional email a profile supplied, or '' if none. */
export function getEmail(user: string): string {
  try {
    return localStorage.getItem(`${EMAIL_PREFIX}::${user}`) || ''
  } catch {
    return ''
  }
}

/** Store (or clear) a profile's optional email. */
export function setEmail(user: string, email: string) {
  const key = `${EMAIL_PREFIX}::${user}`
  try {
    const clean = email.trim()
    if (clean) localStorage.setItem(key, clean)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
