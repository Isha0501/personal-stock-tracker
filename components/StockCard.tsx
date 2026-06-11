'use client'

import type { UnifiedStock, QuoteData, HistoryPoint } from '@/lib/types'
import { fmt$$, fmtPct, gainColor, cn } from '@/lib/utils'
import Sparkline from './Sparkline'

interface Props {
  stock: UnifiedStock
  quote: QuoteData | null
  history: HistoryPoint[]
  selected: boolean
  onClick: () => void
}

export default function StockCard({ stock, quote, history, selected, onClick }: Props) {
  const price = quote?.price ?? stock.lastPrice
  const changePct = quote?.changePercent ?? stock.changePercent
  const change$ = quote?.change ?? stock.changeDollar
  const positive = changePct >= 0

  const weekHigh = quote?.weekHigh52 ?? stock.weekHigh52
  const weekLow = quote?.weekLow52 ?? stock.weekLow52
  const rangePosition =
    weekHigh && weekLow && weekHigh !== weekLow
      ? ((price - weekLow) / (weekHigh - weekLow)) * 100
      : null

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-5 py-4 border-b border-surface-3 cursor-pointer transition-colors flex items-center gap-4',
        selected ? 'bg-surface-3' : 'bg-surface-1 hover:bg-surface-2'
      )}
    >
      {/* Status badge */}
      <div className="w-1.5 self-stretch rounded-full flex-shrink-0"
        style={{ background: stock.status === 'holding' ? '#4f8ef7' : '#6b7280' }} />

      {/* Symbol + name */}
      <div className="w-24 flex-shrink-0">
        <p className="font-mono font-semibold text-sm tracking-wide">{stock.symbol}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5 max-w-[90px]">
          {quote?.shortName ?? stock.description ?? '—'}
        </p>
      </div>

      {/* Sparkline */}
      <div className="flex-shrink-0 hidden sm:block">
        <Sparkline data={history} positive={positive} />
      </div>

      {/* Price + change */}
      <div className="w-28 flex-shrink-0 text-right">
        <p className="font-mono text-sm font-medium">{fmt$$(price)}</p>
        <p className={cn('font-mono text-xs', gainColor(changePct))}>
          {change$ >= 0 ? '+' : ''}{fmt$$(change$)} ({fmtPct(changePct)})
        </p>
      </div>

      {/* Holding-specific */}
      {stock.status === 'holding' && (
        <div className="hidden md:flex items-center gap-6 flex-1">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Value</p>
            <p className="font-mono text-sm">{fmt$$(stock.currentValue ?? 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Total P&L</p>
            <p className={cn('font-mono text-sm', gainColor(stock.totalGainDollar ?? 0))}>
              {fmt$$(stock.totalGainDollar ?? 0)}
            </p>
            <p className={cn('font-mono text-xs', gainColor(stock.totalGainPercent ?? 0))}>
              {fmtPct(stock.totalGainPercent ?? 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Today</p>
            <p className={cn('font-mono text-sm', gainColor(stock.todayGainDollar ?? 0))}>
              {fmt$$(stock.todayGainDollar ?? 0)}
            </p>
          </div>
          {stock.percentOfAccount !== undefined && (
            <div className="flex-1 min-w-[80px]">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Portfolio</span>
                <span>{stock.percentOfAccount.toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-blue/70"
                  style={{ width: `${Math.min(stock.percentOfAccount, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watchlist-specific */}
      {stock.status === 'watching' && (
        <div className="hidden md:flex items-center gap-6 flex-1">
          {rangePosition !== null && (
            <div className="flex-1 min-w-[120px]">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{fmt$$(weekLow!)}</span>
                <span className="text-zinc-400">52W Range</span>
                <span>{fmt$$(weekHigh!)}</span>
              </div>
              <div className="h-1.5 bg-surface-4 rounded-full relative overflow-visible">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-300 border-2 border-surface-base"
                  style={{ left: `clamp(0%, ${rangePosition}%, 100%)` }}
                />
              </div>
            </div>
          )}
          {quote?.peRatio && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">P/E</p>
              <p className="font-mono text-sm">{quote.peRatio.toFixed(1)}</p>
            </div>
          )}
          {quote?.marketCap && (
            <div className="text-right hidden lg:block">
              <p className="text-xs text-zinc-500">Mkt Cap</p>
              <p className="font-mono text-sm">
                {quote.marketCap >= 1e12
                  ? `$${(quote.marketCap / 1e12).toFixed(2)}T`
                  : `$${(quote.marketCap / 1e9).toFixed(1)}B`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status label */}
      <div className="flex-shrink-0 ml-auto">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          stock.status === 'holding'
            ? 'bg-accent-blue/15 text-accent-blue'
            : 'bg-zinc-700/50 text-zinc-400'
        )}>
          {stock.status === 'holding' ? 'HOLDING' : 'WATCHING'}
        </span>
      </div>
    </div>
  )
}
