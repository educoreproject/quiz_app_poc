// Open Badges 3.0 issuance from mastery scores.
//
// This is a *client-side, unsigned* implementation: it produces well-formed
// Open Badges 3.0 (W3C Verifiable Credential) JSON-LD that a learner can
// download or copy. There is no cryptographic `proof` — the credential is
// structurally correct and portfolio-grade, but not independently verifiable.
// A backend signer (issuer DID + Data Integrity / VC-JWT proof) could wrap the
// output of `buildCredential` later without reshaping the data.

import { SPECS, SPEC_MAP } from './specs'
import { LAYER_META } from './types'
import type { Layer, SpecKey } from './types'
import { cellKey, overallScore, perSpecScore, type CellStat } from './quiz'

// ---- Config (tunable) ------------------------------------------------------

/** Score (0–100) needed to earn a badge. */
export const MASTERY_THRESHOLD = 80
/** Minimum question-pool coverage required alongside the score. */
export const MIN_COVERAGE = 0.5

/** Public base URL of the deployed app, used to mint badge / skill URIs. */
export const APP_URL = 'https://quiz-app-poc.onrender.com'

/** Static issuer Profile (no backend — this identifies, it does not sign). */
export const ISSUER = {
  id: `${APP_URL}/issuer`,
  type: ['Profile'],
  name: 'EDUcore Mastery',
  url: APP_URL,
} as const

const STANDARDS_FRAMEWORK = 'EDUcore Education Standards'
const SKILLS_FRAMEWORK = 'EDUcore Mastery Skills'

const OB_CONTEXT = [
  'https://www.w3.org/ns/credentials/v2',
  'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
]

// ---- Mastery levels --------------------------------------------------------

export type MasteryLevel = 'Beginning' | 'Proficient' | 'Mastery'

export function masteryLevel(score: number): MasteryLevel {
  if (score >= MASTERY_THRESHOLD) return 'Mastery'
  if (score >= 60) return 'Proficient'
  return 'Beginning'
}

// ---- Badge catalog ---------------------------------------------------------

export interface BadgeDefinition {
  /** Stable slug used in URIs (spec key, or 'capstone'). */
  id: string
  kind: 'spec' | 'capstone'
  spec?: SpecKey
  name: string
  description: string
  /** Accent color for the badge image + card. */
  color: string
  /** Short text drawn inside the badge image. */
  label: string
}

/** 16 per-spec badges + one capstone, derived from the spec catalog. */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...SPECS.map((s): BadgeDefinition => ({
    id: s.key,
    kind: 'spec',
    spec: s.key,
    name: `${s.name} Schema Mastery`,
    description: `Demonstrated mastery of the ${s.name} standard (${s.tagline.replace(/\.$/, '')}) across its ${s.layers
      .map((l) => LAYER_META[l].label)
      .join(', ')} layer${s.layers.length > 1 ? 's' : ''} in the EDUcore daily quiz.`,
    color: s.color,
    label: s.name,
  })),
  {
    id: 'capstone',
    kind: 'capstone',
    name: 'EDUcore Generalist',
    description:
      'Demonstrated broad mastery across all 16 EDUcore education-data standards in the EDUcore daily quiz.',
    color: '#6366f1',
    label: '🎓',
  },
]

// ---- Earned-status evaluation ----------------------------------------------

export interface CoveredCell {
  spec: SpecKey
  layer: Layer
  score: number
}

export interface BadgeStatus {
  def: BadgeDefinition
  earned: boolean
  /** 0–100: per-spec score, or overall for the capstone. */
  score: number
  level: MasteryLevel
  /** Spec×layer cells the learner has actually attempted (drives alignment). */
  covered: CoveredCell[]
}

/** Aggregate question-pool coverage for one spec across its layers. */
function specCoverage(cells: Record<string, CellStat>, spec: SpecKey): number {
  let seen = 0
  let total = 0
  for (const c of Object.values(cells)) {
    if (c.spec !== spec) continue
    seen += c.seen
    total += c.total
  }
  return total ? seen / total : 0
}

function coveredCells(cells: Record<string, CellStat>, spec?: SpecKey): CoveredCell[] {
  return Object.values(cells)
    .filter((c) => c.seen > 0 && (!spec || c.spec === spec))
    .map((c) => ({ spec: c.spec, layer: c.layer, score: c.score }))
}

/** Compute earned status for every badge from the current mastery cells. */
export function evaluateBadges(cells: Record<string, CellStat>): BadgeStatus[] {
  const overall = overallScore(cells)
  return BADGE_DEFINITIONS.map((def) => {
    if (def.kind === 'capstone') {
      return {
        def,
        score: overall,
        level: masteryLevel(overall),
        earned: overall >= MASTERY_THRESHOLD,
        covered: coveredCells(cells),
      }
    }
    const spec = def.spec!
    const score = perSpecScore(cells, spec)
    const coverage = specCoverage(cells, spec)
    return {
      def,
      score,
      level: masteryLevel(score),
      earned: score >= MASTERY_THRESHOLD && coverage >= MIN_COVERAGE,
      covered: coveredCells(cells, spec),
    }
  })
}

// ---- Recipient identity ----------------------------------------------------

export interface Recipient {
  name: string
  /** urn fallback id when no email is supplied. */
  subjectId?: string
  /** Open Badges IdentityObject(s) — a salted SHA-256 hash of the email. */
  identifier?: Array<Record<string, unknown>>
}

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Build the credential recipient. With an email we emit a privacy-preserving
 * salted hash (the plaintext email never leaves the device); otherwise we fall
 * back to a device-local urn that names the profile.
 */
export async function prepareRecipient(name: string, email?: string): Promise<Recipient> {
  const clean = (email ?? '').trim().toLowerCase()
  if (!clean) {
    return { name, subjectId: `urn:educore:user:${slug(name)}` }
  }
  const salt = randomSalt()
  const hash = await sha256Hex(salt + clean)
  return {
    name,
    identifier: [
      {
        type: 'IdentityObject',
        hashed: true,
        identityType: 'emailAddress',
        identityHash: `sha256$${hash}`,
        salt,
      },
    ],
  }
}

// ---- Alignment -------------------------------------------------------------

function standardAlignment(spec: SpecKey) {
  const meta = SPEC_MAP[spec]
  return {
    type: ['Alignment'],
    targetName: meta.name,
    targetFramework: STANDARDS_FRAMEWORK,
    targetUrl: meta.specUrl,
    targetType: 'Standard',
  }
}

function skillAlignment(spec: SpecKey, layer: Layer) {
  const meta = SPEC_MAP[spec]
  return {
    type: ['Alignment'],
    targetName: `${meta.name} · ${LAYER_META[layer].label}`,
    targetFramework: SKILLS_FRAMEWORK,
    targetCode: cellKey(spec, layer),
    targetUrl: `${APP_URL}/#/skills/${encodeURIComponent(spec)}/${layer}`,
    targetType: 'Competency',
  }
}

function buildAlignment(status: BadgeStatus) {
  if (status.def.kind === 'capstone') {
    return SPECS.map((s) => standardAlignment(s.key))
  }
  const spec = status.def.spec!
  return [standardAlignment(spec), ...status.covered.map((c) => skillAlignment(c.spec, c.layer))]
}

// ---- Badge image (inline SVG → data URI) -----------------------------------

export function badgeImageSvg(def: BadgeDefinition): string {
  const big = def.label.length <= 2 // emoji or short → render large
  const fontSize = big ? 64 : def.label.length > 5 ? 30 : 44
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${def.color}"/>
      <stop offset="100%" stop-color="#0b1020"/>
    </radialGradient>
  </defs>
  <circle cx="120" cy="120" r="116" fill="url(#g)" stroke="${def.color}" stroke-width="4"/>
  <circle cx="120" cy="120" r="96" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
  <text x="120" y="120" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="${fontSize}">${def.label}</text>
  <text x="120" y="196" text-anchor="middle" fill="#ffffff" fill-opacity="0.85" font-family="system-ui, sans-serif" font-weight="700" font-size="15" letter-spacing="1">MASTERY</text>
</svg>`
}

export function badgeImageDataUri(def: BadgeDefinition): string {
  return `data:image/svg+xml,${encodeURIComponent(badgeImageSvg(def))}`
}

// ---- Credential builder ----------------------------------------------------

/** Assemble an Open Badges 3.0 AchievementCredential (unsigned JSON-LD). */
export function buildCredential(
  status: BadgeStatus,
  recipient: Recipient,
  dateISO: string,
): Record<string, unknown> {
  const { def, score } = status
  const subject: Record<string, unknown> = { type: ['AchievementSubject'] }
  if (recipient.identifier) subject.identifier = recipient.identifier
  if (recipient.subjectId) subject.id = recipient.subjectId

  const criteria =
    def.kind === 'capstone'
      ? `Reach an overall mastery score of ${MASTERY_THRESHOLD} across all 16 EDUcore standards in the daily quiz.`
      : `Reach a mastery score of ${MASTERY_THRESHOLD} for ${SPEC_MAP[def.spec!].name} with at least ${Math.round(
          MIN_COVERAGE * 100,
        )}% question coverage in the EDUcore daily quiz.`

  subject.achievement = {
    id: `${APP_URL}/badges/${def.id}`,
    type: ['Achievement'],
    name: def.name,
    description: def.description,
    criteria: { narrative: criteria },
    image: { id: badgeImageDataUri(def), type: 'Image' },
    alignment: buildAlignment(status),
    resultDescription: [
      {
        id: 'urn:educore:resultdesc:mastery',
        type: ['ResultDescription'],
        name: 'Mastery score',
        resultType: 'Score',
        valueMin: '0',
        valueMax: '100',
        requiredValue: String(MASTERY_THRESHOLD),
      },
    ],
  }
  subject.result = [
    {
      type: ['Result'],
      value: String(score),
      resultDescription: 'urn:educore:resultdesc:mastery',
    },
  ]

  return {
    '@context': OB_CONTEXT,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    id: `urn:uuid:${crypto.randomUUID()}`,
    name: def.name,
    issuer: ISSUER,
    validFrom: dateISO,
    awardedDate: dateISO,
    credentialSubject: subject,
  }
}
