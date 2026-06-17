'use client'

import type { PortfolioSummary } from '@/lib/types'
import { fmt$$, fmtPct, gainColor, cn } from '@/lib/utils'

interface Props {
  summary: PortfolioSummary
  lastUpdated: string | null
  onRefresh: () => void
  refreshing: boolean
}

export default function PortfolioSummaryBar({ summary, lastUpdated, onRefresh, refreshing }: Props) {
  const updatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="border-b border-surface-3 bg-surface-1 px-6 py-4">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-end gap-6 flex-wrap">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Total Value</p>
            <p className="text-2xl font-semibold tabular-nums">{fmt$$(summary.totalValue)}</p>
          </div>
          <Stat label="Invested" value={fmt$$(summary.totalValue - summary.totalCashBalance)} />
          <Stat label="Cash" value={fmt$$(summary.totalCashBalance)} />
          <Stat label="Today" value={fmt$$(summary.todayGainDollar)} sub={fmtPct(summary.todayGainPercent)} positive={summary.todayGainDollar >= 0} />
          <Stat label="Total Return" value={fmt$$(summary.totalGainDollar)} sub={fmtPct(summary.totalGainPercent)} positive={summary.totalGainDollar >= 0} />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Positions</p>
            <p className="text-lg font-medium tabular-nums">{summary.positionCount}</p>
          </div>
          {summary.watchCount > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Watching</p>
              <p className="text-lg font-medium tabular-nums">{summary.watchCount}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {updatedStr && <p className="text-xs text-zinc-600">CSV from {updatedStr}</p>}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              refreshing ? 'border-zinc-700 text-zinc-600 cursor-wait' : 'border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10'
            )}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Prices'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  const colorClass = positive !== undefined ? gainColor(positive ? 1 : -1) : ''
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn('text-lg font-medium tabular-nums', colorClass)}>{value}</p>
      {sub && <p className={cn('text-xs tabular-nums', colorClass)}>{sub}</p>}
    </div>
  )
}
