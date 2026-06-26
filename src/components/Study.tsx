import { useMemo } from 'react'
import { SPEC_MAP, specSectionUrl } from '../lib/specs'
import { LAYER_META } from '../lib/types'
import type { Layer, SpecKey } from '../lib/types'
import {
  ALL_QUESTIONS,
  buildNarrative,
  cellKey,
  missedQuestions,
  type CellStat,
} from '../lib/quiz'
import type { ProgressState } from '../lib/storage'
import { Ring } from './Ring'

interface StudyProps {
  spec: SpecKey
  layer: Layer
  state: ProgressState
  cells: Record<string, CellStat>
  onDrill: (spec: SpecKey, layer: Layer) => void
  onClose: () => void
}

export function Study({ spec, layer, state, cells, onDrill, onClose }: StudyProps) {
  const meta = SPEC_MAP[spec]
  const lmeta = LAYER_META[layer]
  const cell = cells[cellKey(spec, layer)]
  const missed = useMemo(() => missedQuestions(state, { spec, layer }), [state, spec, layer])
  const narrative = useMemo(() => buildNarrative(missed), [missed])

  const concepts = useMemo(() => {
    const set = new Map<string, number>()
    for (const q of ALL_QUESTIONS) {
      if (q.spec === spec && q.layer === layer) set.set(q.concept, (set.get(q.concept) || 0) + 1)
    }
    return [...set.entries()].sort((a, b) => b[1] - a[1])
  }, [spec, layer])

  return (
    <div className="study" style={{ ['--accent' as string]: meta.color }}>
      <button className="link-btn" onClick={onClose}>← Back to dashboard</button>

      <div className="study-hero">
        <div>
          <div className="study-tags">
            <span className="tag" style={{ background: meta.color }}>{meta.name}</span>
            <span className="tag ghost">{lmeta.icon} {lmeta.label}</span>
          </div>
          <h1 className="study-title">{meta.name} — {lmeta.label}</h1>
          <p className="study-tagline">{meta.tagline}</p>
          <p className="study-blurb">{lmeta.blurb}</p>
          <div className="study-pub">Published by {meta.publisher} · Formats: {meta.formats.join(', ')}</div>
        </div>
        <Ring
          value={cell?.score ?? 0}
          size={132}
          color={meta.color}
          sub={cell && cell.seen > 0 ? `${cell.seen}/${cell.total} seen` : 'not started'}
        />
      </div>

      <div className="study-grid">
        <section className="study-narrative">
          <h2>📖 Your study narrative</h2>
          {narrative.length === 0 ? (
            <div className="empty-good">
              {cell && cell.seen > 0
                ? '✓ Nothing missed here yet — this section is clean. Drill it to deepen coverage.'
                : 'You haven’t been quizzed here yet. Drill this section to generate a personalized narrative from anything you miss.'}
            </div>
          ) : (
            <>
              <p className="narrative-intro">
                Built from the {missed.length} question{missed.length === 1 ? '' : 's'} you’ve missed in this
                section, grouped by concept. Read it, then re-drill.
              </p>
              {narrative.map((p) => (
                <div className="narrative-para" key={p.concept}>
                  <h3>{p.concept}</h3>
                  <p>{p.text}</p>
                  <a
                    className="show-me"
                    href={specSectionUrl(spec, p.concept)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    🔎 Show me in the {meta.name} spec →
                  </a>
                </div>
              ))}
            </>
          )}
        </section>

        <aside className="study-side">
          <div className="side-card">
            <h3>Concepts covered</h3>
            <ul className="concept-list">
              {concepts.map(([c, n]) => (
                <li key={c}><span>{c}</span><b>{n}</b></li>
              ))}
            </ul>
          </div>
          <div className="side-card stats">
            <h3>This section</h3>
            <div className="stat-row"><span>Questions</span><b>{cell?.total ?? 0}</b></div>
            <div className="stat-row"><span>Seen</span><b>{cell?.seen ?? 0}</b></div>
            <div className="stat-row"><span>Accuracy</span><b>{cell && cell.attempts ? Math.round(cell.accuracy * 100) : 0}%</b></div>
            <div className="stat-row"><span>To review</span><b className={cell?.missed ? 'warn' : ''}>{cell?.missed ?? 0}</b></div>
          </div>
          <button className="btn primary block" onClick={() => onDrill(spec, layer)}>
            ⚡ Drill this section
          </button>
        </aside>
      </div>
    </div>
  )
}
