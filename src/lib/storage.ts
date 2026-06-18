// ---- Persisted progress model (localStorage) -------------------------------

export interface QuestionStat {
  seen: number
  correct: number
  lastSeenISO: string
  lastCorrect: boolean
  /** consecutive misses, used to keep a question in the study queue */
  missStreak: number
}

export interface DayRecord {
  date: string // YYYY-MM-DD
  answered: number
  correct: number
}

export interface DailyState {
  date: string
  questionIds: string[]
  /** questionId -> chosen option index */
  answers: Record<string, number>
  completed: boolean
}

export interface ProgressState {
  version: number
  questionStats: Record<string, QuestionStat>
  dailyHistory: DayRecord[]
  streak: { current: number; longest: number; lastDate: string }
  daily: DailyState | null
  /** snapshot of overall knowledge score per day, for the trend chart */
  scoreHistory: { date: string; score: number }[]
}

const KEY = 'educore-mastery-v1'

export function emptyState(): ProgressState {
  return {
    version: 1,
    questionStats: {},
    dailyHistory: [],
    streak: { current: 0, longest: 0, lastDate: '' },
    daily: null,
    scoreHistory: [],
  }
}

export function loadState(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as ProgressState
    return { ...emptyState(), ...parsed }
  } catch {
    return emptyState()
  }
}

export function saveState(s: ProgressState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore quota errors */
  }
}

export function resetState() {
  localStorage.removeItem(KEY)
}

// ---- Date helpers ----------------------------------------------------------

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

/** Update streak after completing today's quiz. */
export function bumpStreak(s: ProgressState, date: string) {
  const { lastDate } = s.streak
  if (lastDate === date) return
  if (!lastDate) {
    s.streak.current = 1
  } else {
    const gap = dayDiff(lastDate, date)
    s.streak.current = gap === 1 ? s.streak.current + 1 : 1
  }
  s.streak.lastDate = date
  s.streak.longest = Math.max(s.streak.longest, s.streak.current)
}

/** Streak is "alive" only if the last completed day is today or yesterday. */
export function streakAlive(s: ProgressState, date = todayKey()): boolean {
  if (!s.streak.lastDate) return false
  return dayDiff(s.streak.lastDate, date) <= 1
}

// ---- Recording answers -----------------------------------------------------

export function recordAnswer(
  s: ProgressState,
  questionId: string,
  correct: boolean,
  nowISO = new Date().toISOString(),
) {
  const st = s.questionStats[questionId] || {
    seen: 0,
    correct: 0,
    lastSeenISO: nowISO,
    lastCorrect: false,
    missStreak: 0,
  }
  st.seen += 1
  if (correct) {
    st.correct += 1
    st.missStreak = 0
  } else {
    st.missStreak += 1
  }
  st.lastCorrect = correct
  st.lastSeenISO = nowISO
  s.questionStats[questionId] = st
}
