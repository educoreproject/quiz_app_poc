interface SparkProps {
  data: { date: string; score: number }[]
  width?: number
  height?: number
  color?: string
}

/** Compact trend line of the overall knowledge score over time. */
export function Sparkline({ data, width = 320, height = 80, color = 'var(--accent)' }: SparkProps) {
  if (data.length === 0) {
    return <div className="spark-empty">Complete a quiz to start your trend line.</div>
  }
  const pad = 6
  const xs = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(1, data.length - 1)
  const ys = (v: number) => height - pad - (v / 100) * (height - 2 * pad)
  const pts = data.map((d, i) => `${xs(i)},${ys(d.score)}`)
  const line = 'M ' + pts.join(' L ')
  const area = `${line} L ${xs(data.length - 1)},${height - pad} L ${xs(0)},${height - pad} Z`
  const last = data[data.length - 1]
  return (
    <svg width={width} height={height} className="spark">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(data.length - 1)} cy={ys(last.score)} r={4} fill={color} />
    </svg>
  )
}
