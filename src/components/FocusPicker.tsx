import { useState } from 'react'
import { SPECS } from '../lib/specs'
import type { SpecKey } from '../lib/types'

interface FocusPickerProps {
  value: SpecKey[]
  onChange: (specs: SpecKey[]) => void
}

/** A dropdown to choose which specifications the daily quiz focuses on. */
export function FocusPicker({ value, onChange }: FocusPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)

  const summary =
    selected.size === 0
      ? 'All specs'
      : selected.size <= 2
        ? SPECS.filter((s) => selected.has(s.key)).map((s) => s.name).join(', ')
        : `${selected.size} specs`

  function toggle(key: SpecKey) {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange([...next])
  }

  return (
    <div className="focus-picker">
      <button className="fp-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="fp-label">🎯 Study focus:</span>
        <b>{summary}</b>
        <span className="fp-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <>
          <div className="fp-backdrop" onClick={() => setOpen(false)} />
          <div className="fp-panel" role="listbox">
            <div className="fp-panel-head">
              <span>Focus the daily quiz</span>
              <button className="link-btn" onClick={() => onChange([])}>
                All
              </button>
            </div>
            <div className="fp-options">
              {SPECS.map((s) => {
                const on = selected.has(s.key)
                return (
                  <button
                    key={s.key}
                    className={`fp-option ${on ? 'on' : ''}`}
                    onClick={() => toggle(s.key)}
                    role="option"
                    aria-selected={on}
                  >
                    <span className="fp-dot" style={{ background: s.color }} />
                    <span className="fp-name">{s.name}</span>
                    <span className="fp-check">{on ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="fp-panel-foot">
              <button className="btn primary block" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
