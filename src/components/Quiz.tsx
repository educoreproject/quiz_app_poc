import { useMemo, useState } from 'react'
import { QUESTION_BY_ID } from '../lib/quiz'
import { SPEC_MAP } from '../lib/specs'
import { LAYER_META } from '../lib/types'

export interface QuizResult {
  total: number
  correct: number
  answers: { id: string; chosen: number; correct: boolean }[]
}

interface QuizProps {
  questionIds: string[]
  title: string
  onAnswer: (id: string, chosen: number, correct: boolean) => void
  onComplete: (result: QuizResult) => void
  onExit: () => void
}

export function Quiz({ questionIds, title, onAnswer, onComplete, onExit }: QuizProps) {
  const questions = useMemo(
    () => questionIds.map((id) => QUESTION_BY_ID[id]).filter(Boolean),
    [questionIds],
  )
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [results, setResults] = useState<QuizResult['answers']>([])

  if (questions.length === 0) {
    return (
      <div className="panel">
        <p>No questions available.</p>
        <button className="btn" onClick={onExit}>Back</button>
      </div>
    )
  }

  const q = questions[idx]
  const spec = SPEC_MAP[q.spec]
  const layer = LAYER_META[q.layer]
  const answered = chosen !== null
  const isCorrect = answered && chosen === q.answerIndex

  function choose(i: number) {
    if (answered) return
    setChosen(i)
    const correct = i === q.answerIndex
    onAnswer(q.id, i, correct)
    setResults((r) => [...r, { id: q.id, chosen: i, correct }])
  }

  function next() {
    if (idx + 1 >= questions.length) {
      const all = results
      onComplete({
        total: questions.length,
        correct: all.filter((a) => a.correct).length,
        answers: all,
      })
    } else {
      setIdx(idx + 1)
      setChosen(null)
    }
  }

  const progress = ((idx + (answered ? 1 : 0)) / questions.length) * 100

  return (
    <div className="quiz" style={{ ['--accent' as string]: spec.color }}>
      <div className="quiz-top">
        <button className="link-btn" onClick={onExit}>← Exit</button>
        <div className="quiz-title">{title}</div>
        <div className="quiz-count">{idx + 1} / {questions.length}</div>
      </div>
      <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>

      <div className="quiz-card">
        <div className="quiz-tags">
          <span className="tag" style={{ background: spec.color }}>{spec.name}</span>
          <span className="tag ghost">{layer.icon} {layer.label}</span>
          <span className="tag ghost">{q.concept}</span>
          <span className={`tag diff diff-${q.difficulty}`}>{q.difficulty}</span>
        </div>
        <h2 className="quiz-question">{q.question}</h2>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = 'option'
            if (answered) {
              if (i === q.answerIndex) cls += ' correct'
              else if (i === chosen) cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <button key={i} className={cls} onClick={() => choose(i)} disabled={answered}>
                <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                <span className="opt-text">{opt}</span>
                {answered && i === q.answerIndex && <span className="opt-mark">✓</span>}
                {answered && i === chosen && i !== q.answerIndex && <span className="opt-mark">✕</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className={`explain ${isCorrect ? 'good' : 'bad'}`}>
            <div className="explain-head">{isCorrect ? '✓ Correct' : '✕ Not quite'}</div>
            <p>{q.explanation}</p>
            {q.source && <div className="explain-src">Source: {q.source}</div>}
          </div>
        )}
      </div>

      <div className="quiz-actions">
        {answered && (
          <button className="btn primary" onClick={next}>
            {idx + 1 >= questions.length ? 'See results →' : 'Next question →'}
          </button>
        )}
      </div>
    </div>
  )
}
