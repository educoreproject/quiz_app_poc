// Generate the SHA-256 hash for a passcode, to set as VITE_PASSCODE_SHA256.
// Usage:  node scripts/hash-passcode.mjs "my secret passcode"
import { createHash } from 'node:crypto'

const passcode = process.argv.slice(2).join(' ')
if (!passcode) {
  console.error('Usage: node scripts/hash-passcode.mjs "your passcode"')
  process.exit(1)
}
const hash = createHash('sha256').update(passcode).digest('hex')
console.log('\nPasscode :', passcode)
console.log('SHA-256  :', hash)
console.log('\nSet this in Vercel (and .env.local) as:')
console.log(`VITE_PASSCODE_SHA256=${hash}\n`)
