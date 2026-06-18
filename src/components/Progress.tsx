import { useMemo } from 'react'
import { SPECS } from '../lib/specs'
import { LAYERS, LAYER_META } from '../lib/types'
import { cellKey, overallScore, perSpecScore, type CellStat } from '../lib/quiz'
import type { ProgressState } from '../lib/storage'
import { Sparkline } from './Sparkline'

interface ProgressProps {
  state: ProgressState
  cells: Record<string, CellStat>
}

export function ProgressView({ state, cells }: ProgressProps) {
  const overall = overallScore(cells)
  const specScores = useMemo(
    () => SPECS.map((s) => ({ spec: s, score: perSpecScore(cells, s.key) }))
      .sort((a, b) => b.score - a.score),
    [cells],
  )
  const totalSeen = Object.values(state.questionStats).filter((s) => s.seen > 0).length
  const totalAttempts = Object.values(state.questionStats).reduce((n, s) => n + s.seen, 0)
  const totalCorrect = Object.values(state.questionStats).reduce((n, s) => n + s.correct, 0)
  const acc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  return (
    <div className="progress-view">
      <h1 className="view-title">📈 Your progress over time</h1>

      <div className="prog-top">
        <div className="prog-card big">
          <div className="prog-label">Knowledge trend</div>
          <Sparkline data={state.scoreHistory} width={420} height={110} />
          <div className="prog-foot">Overall score today: <b>{overall}</b></div>
        </div>
        <div className="prog-stats">
          <div className="prog-card"><div className="big-num">{state.streak.current}</div><div>Day streak 🔥</div></div>
          <div className="prog-card"><div className="big-num">{state.streak.longest}</div><div>Longest streak</div></div>
          <div className="prog-card"><div className="big-num">{totalSeen}</div><div>Questions seen</div></div>
          <div className="prog-card"><div className="big-num">{acc}%</div><div>Lifetime accuracy</div></div>
        </div>
      </div>

      <h2 className="sub-title">Mastery by spec</h2>
      <div className="spec-bars">
        {specScores.map(({ spec, score }) => (
          <div className="spec-bar-row" key={spec.key}>
            <div className="sb-name"><span className="spec-dot" style={{ background: spec.color }} />{spec.name}</div>
            <div className="sb-track">
              <span className="sb-fill" style={{ width: `${score}%`, background: spec.color }} />
            </div>
            <div className="sb-score">{score}</div>
          </div>
        ))}
      </div>

      <h2 className="sub-title">Mastery by layer</h2>
      <div className="layer-cards">
        {LAYERS.map((l) => {
          let num = 0, den = 0
          for (const s of SPECS) {
            const c = cells[cellKey(s.key, l)]
            if (c && c.total) { num += c.score * c.total; den += c.total }
          }
          const score = den ? Math.round(num / den) : 0
          return (
            <div className="layer-card" key={l}>
              <div className="lc-icon">{LAYER_META[l].icon}</div>
              <div className="lc-label">{LAYER_META[l].label}</div>
              <div className="lc-score">{score}</div>
              <div className="lc-blurb">{LAYER_META[l].blurb}</div>
            </div>
          )
        })}
      </div>

      {state.dailyHistory.length > 0 && (
        <>
          <h2 className="sub-title">Daily history</h2>
          <div className="day-history">
            {state.dailyHistory.slice(-30).reverse().map((d) => (
              <div className="day-chip" key={d.date} title={`${d.correct}/${d.answered} on ${d.date}`}>
                <div className="dc-date">{d.date.slice(5)}</div>
                <div className="dc-bar">
                  <span style={{ height: `${d.answered ? (d.correct / d.answered) * 100 : 0}%` }} />
                </div>
                <div className="dc-frac">{d.correct}/{d.answered}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
