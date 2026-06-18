import { SPECS } from '../lib/specs'
import { LAYERS, LAYER_META } from '../lib/types'
import type { Layer, SpecKey } from '../lib/types'
import { cellKey, type CellStat } from '../lib/quiz'

interface MatrixProps {
  cells: Record<string, CellStat>
  onSelect: (spec: SpecKey, layer: Layer) => void
}

function scoreColor(score: number, untouched: boolean): string {
  if (untouched) return 'rgba(255,255,255,0.04)'
  // red (0) → amber (50) → green (100)
  const hue = (score / 100) * 130 // 0=red, 130=green
  return `hsl(${hue}, 70%, ${28 + score * 0.12}%)`
}

export function Matrix({ cells, onSelect }: MatrixProps) {
  return (
    <div className="matrix">
      <div className="matrix-head">
        <div className="mh-spec" />
        {LAYERS.map((l) => (
          <div key={l} className="mh-layer">
            <span className="mh-icon">{LAYER_META[l].icon}</span>
            <span>{LAYER_META[l].label}</span>
          </div>
        ))}
      </div>
      {SPECS.map((spec) => (
        <div className="matrix-row" key={spec.key}>
          <div className="mr-spec" title={spec.tagline}>
            <span className="spec-dot" style={{ background: spec.color }} />
            <span className="spec-name">{spec.name}</span>
          </div>
          {LAYERS.map((layer) => {
            const c = cells[cellKey(spec.key, layer)]
            const total = c?.total ?? 0
            const has = total > 0
            const untouched = !c || c.seen === 0
            if (!has) {
              return (
                <div key={layer} className="cell na" title={`${spec.name} has no ${LAYER_META[layer].label} layer in EDUcore`}>
                  <span className="na-mark">—</span>
                </div>
              )
            }
            return (
              <button
                key={layer}
                className={`cell ${untouched ? 'untouched' : ''} ${c.missed > 0 ? 'has-missed' : ''}`}
                style={{ background: scoreColor(c.score, untouched) }}
                onClick={() => onSelect(spec.key, layer)}
                title={`${spec.name} · ${LAYER_META[layer].label}\nScore ${c.score} · seen ${c.seen}/${total}${c.missed ? ` · ${c.missed} to review` : ''}`}
              >
                <span className="cell-score">{untouched ? '·' : c.score}</span>
                <span className="cell-cov">
                  <span className="cov-fill" style={{ width: `${c.coverage * 100}%` }} />
                </span>
                {c.missed > 0 && <span className="cell-flag">{c.missed}</span>}
              </button>
            )
          })}
        </div>
      ))}
      <div className="matrix-legend">
        <span><i className="lg untouched" /> Not started</span>
        <span><i className="lg low" /> Weak</span>
        <span><i className="lg mid" /> Building</span>
        <span><i className="lg high" /> Strong</span>
        <span><i className="lg na" /> Not in spec</span>
        <span className="lg-flag">●<sub>n</sub> = items to review</span>
      </div>
    </div>
  )
}
