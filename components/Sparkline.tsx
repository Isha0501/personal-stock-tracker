'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: { close: number }[]
  positive: boolean
  width?: number
  height?: number
}

export default function Sparkline({ data, positive, width = 80, height = 32 }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-surface-3 rounded animate-pulse" />
  }

  const color = positive ? '#22c55e' : '#ef4444'

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
