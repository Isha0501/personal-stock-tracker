'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { HistoryPoint } from '@/lib/types'
import { fmt$$ } from '@/lib/utils'

interface Props {
  data: HistoryPoint[]
  avgCostBasis?: number
  range: string
  onRangeChange: (r: string) => void
}

const RANGES = ['1W', '1M', '3M', '6M', '1Y', '5Y']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="font-mono font-medium">{fmt$$(payload[0].value)}</p>
    </div>
  )
}

export default function PriceChart({ data, avgCostBasis, range, onRangeChange }: Props) {
  if (!data.length) {
    return <div className="h-48 bg-surface-3 rounded-lg animate-pulse" />
  }

  const first = data[0].close
  const last = data[data.length - 1].close
  const positive = last >= first
  const color = positive ? '#22c55e' : '#ef4444'

  const minVal = Math.min(...data.map(d => d.close))
  const maxVal = Math.max(...data.map(d => d.close))
  const padding = (maxVal - minVal) * 0.1

  const formatX = (date: string) => {
    const d = new Date(date)
    if (range === '1W' || range === '1M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (range === '5Y') return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              r === range
                ? 'bg-accent-blue text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-3'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#22222f" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatX}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tickFormatter={v => `$${v.toFixed(0)}`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          {avgCostBasis && (
            <ReferenceLine
              y={avgCostBasis}
              stroke="#4f8ef7"
              strokeDasharray="4 2"
              label={{ value: `Avg Cost $${avgCostBasis.toFixed(2)}`, fill: '#4f8ef7', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${positive})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
