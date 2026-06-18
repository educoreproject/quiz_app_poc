import { useMemo, useState } from 'react'
import {
  badgeImageSvg,
  buildCredential,
  evaluateBadges,
  MASTERY_THRESHOLD,
  prepareRecipient,
  type BadgeStatus,
} from '../lib/badges'
import { SPECS, SPEC_MAP } from '../lib/specs'
import { LAYER_META } from '../lib/types'
import type { CellStat } from '../lib/quiz'

interface BadgesProps {
  cells: Record<string, CellStat>
  userName: string
  email: string
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function Badges({ cells, userName, email }: BadgesProps) {
  const statuses = useMemo(() => evaluateBadges(cells), [cells])
  const [selected, setSelected] = useState<BadgeStatus | null>(null)

  const earnedCount = statuses.filter((s) => s.earned).length
  const ordered = [...statuses].sort(
    (a, b) => Number(b.earned) - Number(a.earned) || b.score - a.score,
  )

  return (
    <div className="badges">
      <header className="badges-head">
        <h1>🏅 Badges</h1>
        <p className="badges-sub">
          Earn an Open Badge for each standard you master (score ≥ {MASTERY_THRESHOLD}), plus a
          capstone for overall mastery. Each badge issues a downloadable Open Badges 3.0
          credential aligned to the standard and the skills you covered.{' '}
          <b>{earnedCount}</b> of {statuses.length} earned.
        </p>
      </header>

      <div className="badge-grid">
        {ordered.map((s) => (
          <BadgeCard key={s.def.id} status={s} onOpen={() => s.earned && setSelected(s)} />
        ))}
      </div>

      {selected && (
        <BadgeDetail
          status={selected}
          userName={userName}
          email={email}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function BadgeCard({ status, onOpen }: { status: BadgeStatus; onOpen: () => void }) {
  const { def, earned, score, level } = status
  return (
    <button
      className={`badge-card ${earned ? 'earned' : 'locked'}`}
      style={{ ['--accent' as string]: def.color }}
      onClick={onOpen}
      disabled={!earned}
      title={earned ? 'View & download credential' : `Reach ${MASTERY_THRESHOLD} to earn`}
    >
      <div className="badge-img" dangerouslySetInnerHTML={{ __html: badgeImageSvg(def) }} />
      <div className="badge-name">{def.name}</div>
      {earned ? (
        <div className="badge-level">
          {level} · {score}/100
        </div>
      ) : (
        <>
          <div className="badge-progress">
            <span style={{ width: `${Math.min(100, score)}%` }} />
          </div>
          <div className="badge-lock">
            🔒 {score}/100 · reach {MASTERY_THRESHOLD}
          </div>
        </>
      )}
    </button>
  )
}

function BadgeDetail({
  status,
  userName,
  email,
  onClose,
}: {
  status: BadgeStatus
  userName: string
  email: string
  onClose: () => void
}) {
  const { def, score, level, covered } = status
  const [copied, setCopied] = useState(false)

  async function makeCredential() {
    const recipient = await prepareRecipient(userName, email)
    return buildCredential(status, recipient, new Date().toISOString())
  }

  async function download() {
    const cred = await makeCredential()
    const blob = new Blob([JSON.stringify(cred, null, 2)], { type: 'application/ld+json' })
    triggerDownload(blob, `${def.id}-openbadge.json`)
  }

  async function copy() {
    const cred = await makeCredential()
    try {
      await navigator.clipboard.writeText(JSON.stringify(cred, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  function downloadImage() {
    const blob = new Blob([badgeImageSvg(def)], { type: 'image/svg+xml' })
    triggerDownload(blob, `${def.id}-badge.svg`)
  }

  const alignment =
    def.kind === 'capstone'
      ? SPECS.map((s) => ({ name: s.name, framework: 'EDUcore Education Standards' }))
      : [
          { name: SPEC_MAP[def.spec!].name, framework: 'EDUcore Education Standards' },
          ...covered.map((c) => ({
            name: `${SPEC_MAP[c.spec].name} · ${LAYER_META[c.layer].label}`,
            framework: 'EDUcore Mastery Skills',
          })),
        ]

  return (
    <div className="badge-modal" onClick={onClose}>
      <div
        className="badge-detail"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--accent' as string]: def.color }}
      >
        <button className="bd-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="badge-img lg" dangerouslySetInnerHTML={{ __html: badgeImageSvg(def) }} />
        <h2>{def.name}</h2>
        <div className="badge-level">
          {level} · {score}/100
        </div>
        <p className="bd-desc">{def.description}</p>

        <dl className="bd-meta">
          <div>
            <dt>Recipient</dt>
            <dd>{email ? `${userName} · ${email} (hashed)` : `${userName} (device-local)`}</dd>
          </div>
          <div>
            <dt>Issuer</dt>
            <dd>EDUcore Mastery</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Open Badges 3.0 · unsigned</dd>
          </div>
        </dl>

        <div className="bd-align">
          <h3>Aligned skills ({alignment.length})</h3>
          <ul>
            {alignment.map((a, i) => (
              <li key={i}>
                <span className="al-name">{a.name}</span>
                <span className="al-fw">{a.framework}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bd-actions">
          <button className="btn primary" onClick={download}>
            ⬇ Download .json
          </button>
          <button className="btn" onClick={copy}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button className="btn" onClick={downloadImage}>
            ⬇ Badge image
          </button>
        </div>

        <p className="bd-note">
          Unsigned credential — a structurally valid Open Badges 3.0 document for portfolios and
          demos, not independently verifiable. Add a backend signer for verifiable credentials.
        </p>
      </div>
    </div>
  )
}
