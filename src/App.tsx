import { useEffect, useMemo, useState } from 'react'
import { Matrix } from './components/Matrix'
import { Quiz, type QuizResult } from './components/Quiz'
import { Study } from './components/Study'
import { ProgressView } from './components/Progress'
import { Ring } from './components/Ring'
import { Sparkline } from './components/Sparkline'
import { Login } from './components/Login'
import { SPEC_MAP } from './lib/specs'
import { getActiveUser, login as loginUser, logout } from './lib/auth'
import { LAYER_META } from './lib/types'
import type { Layer, SpecKey } from './lib/types'
import {
  bumpStreak,
  emptyState,
  loadState,
  recordAnswer,
  resetState,
  saveState,
  streakAlive,
  todayKey,
  type ProgressState,
} from './lib/storage'
import {
  ALL_QUESTIONS,
  computeCells,
  overallScore,
  QUESTION_BY_ID,
  selectDaily,
  selectDrill,
} from './lib/quiz'

type View = 'dashboard' | 'quiz' | 'results' | 'study' | 'progress'

interface Session {
  ids: string[]
  title: string
  kind: 'daily' | 'drill'
}

export default function App() {
  const [user, setUser] = useState<string | null>(() => getActiveUser())
  const [state, setState] = useState<ProgressState>(() => {
    const u = getActiveUser()
    return u ? loadState(u) : emptyState()
  })
  const [view, setView] = useState<View>('dashboard')
  const [session, setSession] = useState<Session | null>(null)
  const [lastResult, setLastResult] = useState<QuizResult | null>(null)
  const [selected, setSelected] = useState<{ spec: SpecKey; layer: Layer } | null>(null)

  const today = todayKey()

  // Ensure today's daily set exists (once a profile is active).
  useEffect(() => {
    if (!user) return
    if (!state.daily || state.daily.date !== today) {
      mutate((s) => {
        s.daily = { date: today, questionIds: selectDaily(s, today), answers: {}, completed: false }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function mutate(fn: (s: ProgressState) => void) {
    setState((prev) => {
      const next: ProgressState = structuredClone(prev)
      fn(next)
      if (user) saveState(user, next)
      return next
    })
  }

  function handleLogin(name: string) {
    const canonical = loginUser(name)
    if (!canonical) return
    setUser(canonical)
    setState(loadState(canonical))
    setView('dashboard')
  }

  function handleLogout() {
    logout()
    setUser(null)
    setState(emptyState())
    setView('dashboard')
  }

  const cells = useMemo(() => computeCells(state), [state])
  const overall = overallScore(cells)

  function startDaily() {
    if (!state.daily) return
    setSession({ ids: state.daily.questionIds, title: "Today's Quiz", kind: 'daily' })
    setLastResult(null)
    setView('quiz')
  }

  function startDrill(spec: SpecKey, layer: Layer) {
    const ids = selectDrill(state, spec, layer)
    setSession({ ids, title: `Drill · ${SPEC_MAP[spec].name} ${LAYER_META[layer].label}`, kind: 'drill' })
    setLastResult(null)
    setView('quiz')
  }

  function onAnswer(id: string, chosen: number, correct: boolean) {
    mutate((s) => {
      recordAnswer(s, id, correct)
      if (session?.kind === 'daily' && s.daily) s.daily.answers[id] = chosen
    })
  }

  function onComplete(result: QuizResult) {
    setLastResult(result)
    mutate((s) => {
      // snapshot today's overall knowledge score for the trend
      const sc = overallScore(computeCells(s))
      const existing = s.scoreHistory.find((h) => h.date === today)
      if (existing) existing.score = sc
      else s.scoreHistory.push({ date: today, score: sc })

      if (session?.kind === 'daily' && s.daily && !s.daily.completed) {
        s.daily.completed = true
        s.dailyHistory.push({ date: today, answered: result.total, correct: result.correct })
        bumpStreak(s, today)
      }
    })
    setView('results')
  }

  function openCell(spec: SpecKey, layer: Layer) {
    setSelected({ spec, layer })
    setView('study')
  }

  // ---- Render ----

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const dailyDone = state.daily?.completed
  const dailyAnswered = state.daily ? Object.keys(state.daily.answers).length : 0
  const dailyTotal = state.daily?.questionIds.length ?? 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('dashboard')}>
          <span className="brand-mark">🎓</span>
          <div>
            <div className="brand-title">EDUcore Mastery</div>
            <div className="brand-sub">Daily schema quiz · {ALL_QUESTIONS.length} questions · 16 specs</div>
          </div>
        </div>
        <nav className="nav">
          <button className={view === 'dashboard' ? 'on' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={view === 'progress' ? 'on' : ''} onClick={() => setView('progress')}>Progress</button>
          <div className="streak-pill" title="Daily streak">
            🔥 <b>{streakAlive(state) ? state.streak.current : 0}</b>
          </div>
          <button className="user-btn" title="Switch profile" onClick={handleLogout}>
            <span className="user-avatar">{user.slice(0, 1).toUpperCase()}</span>
            <span className="user-name">{user}</span>
          </button>
        </nav>
      </header>

      <main className="main">
        {view === 'dashboard' && (
          <Dashboard
            state={state}
            cells={cells}
            overall={overall}
            dailyDone={!!dailyDone}
            dailyAnswered={dailyAnswered}
            dailyTotal={dailyTotal}
            onStartDaily={startDaily}
            onOpenCell={openCell}
            onReset={() => {
              if (confirm(`Reset all progress and history for ${user}? This cannot be undone.`)) {
                resetState(user)
                const fresh = loadState(user)
                fresh.daily = { date: today, questionIds: selectDaily(fresh, today), answers: {}, completed: false }
                saveState(user, fresh)
                setState(fresh)
              }
            }}
          />
        )}

        {view === 'quiz' && session && (
          <Quiz
            questionIds={session.ids}
            title={session.title}
            onAnswer={onAnswer}
            onComplete={onComplete}
            onExit={() => setView(selected ? 'study' : 'dashboard')}
          />
        )}

        {view === 'results' && lastResult && (
          <Results
            result={lastResult}
            kind={session?.kind ?? 'daily'}
            onStudyMissed={() => {
              const firstMiss = lastResult.answers.find((a) => !a.correct)
              if (firstMiss) {
                const q = QUESTION_BY_ID[firstMiss.id]
                setSelected({ spec: q.spec, layer: q.layer })
                setView('study')
              } else {
                setView('dashboard')
              }
            }}
            onDone={() => setView('dashboard')}
          />
        )}

        {view === 'study' && selected && (
          <Study
            spec={selected.spec}
            layer={selected.layer}
            state={state}
            cells={cells}
            onDrill={startDrill}
            onClose={() => setView('dashboard')}
          />
        )}

        {view === 'progress' && <ProgressView state={state} cells={cells} />}
      </main>
    </div>
  )
}

// ---- Dashboard -------------------------------------------------------------

function Dashboard(props: {
  state: ProgressState
  cells: ReturnType<typeof computeCells>
  overall: number
  dailyDone: boolean
  dailyAnswered: number
  dailyTotal: number
  onStartDaily: () => void
  onOpenCell: (spec: SpecKey, layer: Layer) => void
  onReset: () => void
}) {
  const { state, cells, overall, dailyDone, dailyAnswered, dailyTotal, onStartDaily, onOpenCell, onReset } = props

  // Surface the weakest started cells as "focus areas".
  const focus = useMemo(() => {
    return Object.values(cells)
      .filter((c) => c.total > 0 && (c.missed > 0 || (c.seen > 0 && c.score < 60)))
      .sort((a, b) => b.missed - a.missed || a.score - b.score)
      .slice(0, 4)
  }, [cells])

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-left">
          <h1>Today’s mission</h1>
          <p className="hero-sub">
            {dailyDone
              ? 'Daily quiz complete — nice work. Explore your weak spots below or drill any section.'
              : `A fresh ${dailyTotal}-question set, weighted toward what you’ve missed and haven’t seen.`}
          </p>
          <div className="hero-cta">
            <button className="btn primary big" onClick={onStartDaily}>
              {dailyDone ? '↻ Replay today’s quiz' : dailyAnswered > 0 ? `Resume (${dailyAnswered}/${dailyTotal})` : "▶ Start today’s quiz"}
            </button>
            {dailyDone && <span className="done-badge">✓ Done today</span>}
          </div>
          <div className="hero-trend">
            <Sparkline data={state.scoreHistory} width={360} height={70} />
            <div className="hero-trend-label">Knowledge trend</div>
          </div>
        </div>
        <div className="hero-right">
          <Ring value={overall} size={150} sub="overall score" />
          <div className="hero-streak">🔥 {streakAlive(state) ? state.streak.current : 0}-day streak · best {state.streak.longest}</div>
        </div>
      </section>

      {focus.length > 0 && (
        <section className="focus">
          <h2 className="sub-title">🎯 Focus areas</h2>
          <div className="focus-cards">
            {focus.map((c) => (
              <button key={`${c.spec}-${c.layer}`} className="focus-card" onClick={() => onOpenCell(c.spec, c.layer)} style={{ ['--accent' as string]: SPEC_MAP[c.spec].color }}>
                <div className="fc-top">
                  <span className="tag" style={{ background: SPEC_MAP[c.spec].color }}>{SPEC_MAP[c.spec].name}</span>
                  <span className="fc-layer">{LAYER_META[c.layer].icon} {LAYER_META[c.layer].label}</span>
                </div>
                <div className="fc-score">{c.score}<small>/100</small></div>
                <div className="fc-meta">{c.missed > 0 ? `${c.missed} to review` : 'building up'}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="matrix-section">
        <div className="ms-head">
          <h2 className="sub-title">🗺️ Knowledge map</h2>
          <p className="ms-sub">16 specs × 3 layers. Click any cell for a study narrative built from what you’ve missed, then drill it.</p>
        </div>
        <Matrix cells={cells} onSelect={onOpenCell} />
      </section>

      <footer className="dash-foot">
        <button className="link-btn danger" onClick={onReset}>Reset all progress</button>
      </footer>
    </div>
  )
}

// ---- Results ---------------------------------------------------------------

function Results(props: {
  result: QuizResult
  kind: 'daily' | 'drill'
  onStudyMissed: () => void
  onDone: () => void
}) {
  const { result, onStudyMissed, onDone } = props
  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
  const missed = result.answers.filter((a) => !a.correct)
  const verdict = pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Solid work.' : pct >= 50 ? 'Getting there.' : 'Room to grow.'
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="results">
      <Ring value={pct} size={170} color={color} label={`${result.correct}/${result.total}`} sub={`${pct}%`} />
      <h1>{verdict}</h1>
      <p className="results-sub">
        You answered {result.correct} of {result.total} correctly.
        {missed.length > 0 ? ' Turn the misses into a study narrative below.' : ' A clean sweep — every answer correct!'}
      </p>

      {missed.length > 0 && (
        <div className="results-missed">
          <h3>Missed ({missed.length})</h3>
          <ul>
            {missed.map((m) => {
              const q = QUESTION_BY_ID[m.id]
              return (
                <li key={m.id}>
                  <span className="tag mini" style={{ background: SPEC_MAP[q.spec].color }}>{SPEC_MAP[q.spec].name}</span>
                  <span className="rm-q">{q.question}</span>
                  <span className="rm-a">✓ {q.options[q.answerIndex]}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="results-actions">
        {missed.length > 0 && <button className="btn primary" onClick={onStudyMissed}>📖 Study what I missed</button>}
        <button className="btn" onClick={onDone}>Back to dashboard</button>
      </div>
    </div>
  )
}
