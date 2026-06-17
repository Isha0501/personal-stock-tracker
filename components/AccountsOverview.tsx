'use client'

import type { Portfolio, QuoteData } from '@/lib/types'
import { fmt$$, fmtPct, gainColor, cn } from '@/lib/utils'

interface Props {
  portfolios: Portfolio[]
  quotes: Record<string, QuoteData>
}

export default function AccountsOverview({ portfolios, quotes }: Props) {
  if (portfolios.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
        No account data loaded
      </div>
    )
  }

  const allPositions = portfolios.flatMap(p => p.positions)
  const grandTotalInvested = allPositions.reduce((s, p) => s + p.currentValue, 0)
  const grandTotalCash = portfolios.reduce((s, p) => s + p.cashBalance, 0)
  const grandTotal = grandTotalInvested + grandTotalCash
  const grandTodayGain = allPositions.reduce((s, p) => s + p.todayGainDollar, 0)
  const grandTotalGain = allPositions.reduce((s, p) => s + p.totalGainDollar, 0)
  const grandCost = allPositions.reduce((s, p) => s + p.costBasisTotal, 0)
  const grandTotalGainPct = grandCost > 0 ? (grandTotalGain / grandCost) * 100 : 0

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Grand total summary */}
      <div className="bg-surface-2 border border-surface-3 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">All Accounts Combined</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Total Value</p>
            <p className="text-2xl font-semibold tabular-nums">{fmt$$(grandTotal)}</p>
          </div>
          <Stat label="Invested" value={fmt$$(grandTotalInvested)} />
          <Stat label="Cash" value={fmt$$(grandTotalCash)} />
          <Stat
            label="Today"
            value={fmt$$(grandTodayGain)}
            valueClass={gainColor(grandTodayGain)}
          />
          <Stat
            label="Total Return"
            value={fmt$$(grandTotalGain)}
            sub={fmtPct(grandTotalGainPct)}
            valueClass={gainColor(grandTotalGain)}
          />
        </div>
      </div>

      {/* Per-account cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portfolios.map(portfolio => {
          const positions = portfolio.positions
          const invested = positions.reduce((s, p) => s + p.currentValue, 0)
          const totalValue = invested + portfolio.cashBalance
          const cost = positions.reduce((s, p) => s + p.costBasisTotal, 0)
          const totalGain = positions.reduce((s, p) => s + p.totalGainDollar, 0)
          const totalGainPct = cost > 0 ? (totalGain / cost) * 100 : 0
          const todayGain = positions.reduce((s, p) => s + p.todayGainDollar, 0)
          const cashPct = totalValue > 0 ? (portfolio.cashBalance / totalValue) * 100 : 0
          const investedPct = totalValue > 0 ? (invested / totalValue) * 100 : 0

          // Top 5 holdings by value
          const topHoldings = [...positions]
            .sort((a, b) => b.currentValue - a.currentValue)
            .slice(0, 5)

          return (
            <div key={portfolio.id} className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">{portfolio.name}</h3>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">{portfolio.accountNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums">{fmt$$(totalValue)}</p>
                  <p className={cn('text-xs tabular-nums', gainColor(todayGain))}>
                    {fmt$$(todayGain)} today
                  </p>
                </div>
              </div>

              {/* Allocation bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Invested {investedPct.toFixed(0)}%</span>
                  <span>Cash {cashPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-surface-4 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-accent-blue/70 rounded-l-full"
                    style={{ width: `${investedPct}%` }}
                  />
                  <div
                    className="h-full bg-zinc-500/40"
                    style={{ width: `${cashPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>{fmt$$(invested)}</span>
                  <span>{fmt$$(portfolio.cashBalance)} cash</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <Stat label="Cost Basis" value={fmt$$(cost)} />
                <Stat
                  label="Total Return"
                  value={fmt$$(totalGain)}
                  sub={fmtPct(totalGainPct)}
                  valueClass={gainColor(totalGain)}
                />
              </div>

              {/* Top holdings mini-list */}
              {topHoldings.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Top Holdings</p>
                  <div className="space-y-1">
                    {topHoldings.map(pos => {
                      const livePrice = quotes[pos.symbol]?.price
                      const liveChange = quotes[pos.symbol]?.changePercent
                      return (
                        <div key={pos.symbol} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium w-12">{pos.symbol}</span>
                            <div className="h-1 bg-surface-4 rounded-full w-16 overflow-hidden">
                              <div
                                className="h-full bg-accent-blue/50 rounded-full"
                                style={{ width: `${Math.min(pos.percentOfAccount, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-600">{pos.percentOfAccount.toFixed(1)}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono">{fmt$$(livePrice ?? pos.lastPrice)}</span>
                            <span className={cn('text-xs font-mono ml-2', gainColor(liveChange ?? pos.todayGainPercent))}>
                              {fmtPct(liveChange ?? pos.todayGainPercent)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, valueClass }: {
  label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className={cn('text-sm font-medium tabular-nums', valueClass)}>{value}</p>
      {sub && <p className={cn('text-xs tabular-nums', valueClass)}>{sub}</p>}
    </div>
  )
}
