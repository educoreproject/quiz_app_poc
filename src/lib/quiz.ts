import { QUESTIONS } from '../data/questions'
import { SPECS } from './specs'
import type { Layer, Question, SpecKey } from './types'
import type { ProgressState, QuestionStat } from './storage'

export const ALL_QUESTIONS = QUESTIONS
export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
)

export const DAILY_SIZE = 10

// ---- Seeded RNG (deterministic daily quiz) ---------------------------------

function hashStr(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- Mastery / knowledge scoring -------------------------------------------

export interface CellStat {
  spec: SpecKey
  layer: Layer
  total: number // questions available in this cell
  seen: number // distinct questions attempted
  attempts: number
  correct: number
  accuracy: number // 0..1 over attempts
  coverage: number // 0..1 distinct seen / total
  /** Blended 0..100 knowledge score; 0 when untouched. */
  score: number
  missed: number // distinct questions currently in miss state
}

const EMPTY_CELL = (spec: SpecKey, layer: Layer, total: number): CellStat => ({
  spec,
  layer,
  total,
  seen: 0,
  attempts: 0,
  correct: 0,
  accuracy: 0,
  coverage: 0,
  score: 0,
  missed: 0,
})

export function blendedScore(accuracy: number, coverage: number): number {
  if (coverage === 0) return 0
  // Reward accuracy, but a topic you've barely sampled can't be "mastered".
  return Math.round(accuracy * (0.55 + 0.45 * Math.min(1, coverage)) * 100)
}

/** Per spec × layer stats from current progress. */
export function computeCells(state: ProgressState): Record<string, CellStat> {
  const cells: Record<string, CellStat> = {}
  const totals: Record<string, number> = {}
  for (const q of QUESTIONS) {
    const k = `${q.spec}|${q.layer}`
    totals[k] = (totals[k] || 0) + 1
  }
  for (const q of QUESTIONS) {
    const k = `${q.spec}|${q.layer}`
    if (!cells[k]) cells[k] = EMPTY_CELL(q.spec, q.layer, totals[k])
    const st = state.questionStats[q.id]
    if (st && st.seen > 0) {
      const c = cells[k]
      c.seen += 1
      c.attempts += st.seen
      c.correct += st.correct
      if (!st.lastCorrect && st.missStreak > 0) c.missed += 1
    }
  }
  for (const c of Object.values(cells)) {
    c.accuracy = c.attempts > 0 ? c.correct / c.attempts : 0
    c.coverage = c.total > 0 ? c.seen / c.total : 0
    c.score = blendedScore(c.accuracy, c.coverage)
  }
  return cells
}

export function cellKey(spec: SpecKey, layer: Layer) {
  return `${spec}|${layer}`
}

/** Overall knowledge score across every non-empty cell, weighted by cell size. */
export function overallScore(cells: Record<string, CellStat>): number {
  let num = 0
  let den = 0
  for (const c of Object.values(cells)) {
    if (c.total === 0) continue
    num += c.score * c.total
    den += c.total
  }
  return den ? Math.round(num / den) : 0
}

export function perSpecScore(cells: Record<string, CellStat>, spec: SpecKey): number {
  let num = 0
  let den = 0
  for (const c of Object.values(cells)) {
    if (c.spec !== spec || c.total === 0) continue
    num += c.score * c.total
    den += c.total
  }
  return den ? Math.round(num / den) : 0
}

// ---- Daily quiz selection --------------------------------------------------

interface Scored {
  q: Question
  weight: number
}

function questionWeight(_q: Question, st: QuestionStat | undefined, rng: () => number): number {
  const jitter = 0.0001 * rng()
  if (!st || st.seen === 0) return 3 + jitter // unseen — good to learn
  if (!st.lastCorrect) return 6 + st.missStreak + jitter // missed — review soonest
  // previously correct — review with decay; older = more weight
  const ageDays = (Date.now() - new Date(st.lastSeenISO).getTime()) / 86_400_000
  const reviewReady = Math.min(4, ageDays / 3)
  return 0.4 + reviewReady + jitter
}

/**
 * Deterministic-per-day selection that prioritizes missed questions and weak
 * areas, then fills with fresh material, while keeping spec/layer variety.
 */
export function selectDaily(state: ProgressState, date: string, size = DAILY_SIZE): string[] {
  const rng = mulberry32(hashStr('educore-' + date))
  const scored: Scored[] = QUESTIONS.map((q) => ({
    q,
    weight: questionWeight(q, state.questionStats[q.id], rng),
  }))
  // Weighted shuffle: sort by weight * random.
  const ranked = scored
    .map((s) => ({ ...s, r: s.weight * (0.5 + rng()) }))
    .sort((a, b) => b.r - a.r)

  const chosen: Question[] = []
  const specCount: Record<string, number> = {}
  const maxPerSpec = Math.max(2, Math.ceil(size / 5))
  for (const { q } of ranked) {
    if (chosen.length >= size) break
    if ((specCount[q.spec] || 0) >= maxPerSpec) continue
    chosen.push(q)
    specCount[q.spec] = (specCount[q.spec] || 0) + 1
  }
  // Top up if variety cap left us short.
  if (chosen.length < size) {
    for (const { q } of ranked) {
      if (chosen.length >= size) break
      if (!chosen.includes(q)) chosen.push(q)
    }
  }
  return shuffle(chosen, rng).map((q) => q.id)
}

/** A focused drill on one spec×layer cell, prioritizing missed/unseen. */
export function selectDrill(
  state: ProgressState,
  spec: SpecKey,
  layer: Layer,
  size = 8,
): string[] {
  const rng = mulberry32(hashStr(`${spec}-${layer}-${Date.now()}`))
  const pool = QUESTIONS.filter((q) => q.spec === spec && q.layer === layer)
  const ranked = pool
    .map((q) => ({ q, r: questionWeight(q, state.questionStats[q.id], rng) * (0.5 + rng()) }))
    .sort((a, b) => b.r - a.r)
  return ranked.slice(0, Math.min(size, pool.length)).map((x) => x.q.id)
}

// ---- Study narrative -------------------------------------------------------

export interface MissedItem {
  q: Question
  stat: QuestionStat
}

/** Questions the learner has missed and not yet recovered, optionally filtered. */
export function missedQuestions(
  state: ProgressState,
  filter?: { spec?: SpecKey; layer?: Layer },
): MissedItem[] {
  const out: MissedItem[] = []
  for (const q of QUESTIONS) {
    if (filter?.spec && q.spec !== filter.spec) continue
    if (filter?.layer && q.layer !== filter.layer) continue
    const st = state.questionStats[q.id]
    if (st && st.seen > 0 && !st.lastCorrect) out.push({ q, stat: st })
  }
  // Hardest first.
  out.sort((a, b) => b.stat.missStreak - a.stat.missStreak)
  return out
}

export interface NarrativeParagraph {
  concept: string
  text: string
  questionIds: string[]
}

/**
 * Weave the explanations of missed questions into a study narrative,
 * grouped by concept so related gaps read as one coherent lesson.
 */
export function buildNarrative(items: MissedItem[]): NarrativeParagraph[] {
  const byConcept = new Map<string, MissedItem[]>()
  for (const it of items) {
    const key = it.q.concept || 'General'
    if (!byConcept.has(key)) byConcept.set(key, [])
    byConcept.get(key)!.push(it)
  }
  const paras: NarrativeParagraph[] = []
  for (const [concept, group] of byConcept) {
    const sentences = group.map((g) => {
      const correct = g.q.options[g.q.answerIndex]
      // Make the explanation self-contained even if it doesn't name the answer.
      const lead = g.q.explanation.trim()
      const needsAnswer = !lead.toLowerCase().includes(correct.toLowerCase().slice(0, 12))
      return needsAnswer ? `${lead} (Answer: ${correct}.)` : lead
    })
    paras.push({
      concept,
      text: sentences.join(' '),
      questionIds: group.map((g) => g.q.id),
    })
  }
  return paras
}

// ---- Coverage helpers for matrix -------------------------------------------

export const SPEC_ORDER: SpecKey[] = SPECS.map((s) => s.key)
