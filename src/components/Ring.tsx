interface RingProps {
  value: number // 0..100
  size?: number
  stroke?: number
  color?: string
  track?: string
  label?: string
  sub?: string
}

/** Animated circular progress ring. */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = 'var(--accent)',
  track = 'rgba(255,255,255,0.08)',
  label,
  sub,
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-label">
        {label !== undefined ? <div className="ring-value">{label}</div> : <div className="ring-value">{Math.round(pct)}</div>}
        {sub && <div className="ring-sub">{sub}</div>}
      </div>
    </div>
  )
}
