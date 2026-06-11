'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ExternalLink } from 'lucide-react'
import type { UnifiedStock, QuoteData, HistoryPoint } from '@/lib/types'
import { fmt$$, fmtPct, fmtCompact, fmtVolume, gainColor, cn } from '@/lib/utils'
import PriceChart from './PriceChart'

interface Props {
  stock: UnifiedStock
  quote: QuoteData | null
  onClose: () => void
}

export default function DetailPanel({ stock, quote, onClose }: Props) {
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [range, setRange] = useState('3M')
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchHistory = useCallback(async (r: string) => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/history?symbol=${stock.symbol}&range=${r}`)
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [stock.symbol])

  useEffect(() => {
    fetchHistory(range)
  }, [fetchHistory, range])

  const price = quote?.price ?? stock.lastPrice
  const changePct = quote?.changePercent ?? stock.changePercent
  const change$ = quote?.change ?? stock.changeDollar

  const weekHigh = quote?.weekHigh52 ?? stock.weekHigh52
  const weekLow = quote?.weekLow52 ?? stock.weekLow52
  const rangePos =
    weekHigh && weekLow && weekHigh !== weekLow
      ? ((price - weekLow) / (weekHigh - weekLow)) * 100
      : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-surface-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-mono font-bold text-xl">{stock.symbol}</h2>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              stock.status === 'holding' ? 'bg-accent-blue/15 text-accent-blue' : 'bg-zinc-700/50 text-zinc-400'
            )}>
              {stock.status === 'holding' ? 'HOLDING' : 'WATCHING'}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{quote?.longName ?? stock.description}</p>
          {quote?.sector && (
            <p className="text-xs text-zinc-600 mt-0.5">{quote.sector} · {quote.industry}</p>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Price hero */}
        <div className="px-5 pt-5 pb-4 border-b border-surface-3">
          <div className="flex items-end gap-3 mb-1">
            <p className="text-3xl font-mono font-semibold">{fmt$$(price)}</p>
            <p className={cn('font-mono text-sm mb-0.5', gainColor(changePct))}>
              {change$ >= 0 ? '+' : ''}{fmt$$(change$)} ({fmtPct(changePct)}) today
            </p>
          </div>

          {loadingHistory ? (
            <div className="h-48 bg-surface-3 rounded-lg animate-pulse mt-4" />
          ) : (
            <PriceChart
              data={history}
              avgCostBasis={stock.status === 'holding' ? stock.avgCostBasis : undefined}
              range={range}
              onRangeChange={r => { setRange(r); fetchHistory(r) }}
            />
          )}
        </div>

        {/* Holding stats */}
        {stock.status === 'holding' && (
          <div className="px-5 py-4 border-b border-surface-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Your Position</h3>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Shares" value={stock.quantity?.toLocaleString() ?? '—'} />
              <Stat label="Avg Cost" value={fmt$$(stock.avgCostBasis ?? 0)} />
              <Stat label="Cost Basis" value={fmt$$(stock.costBasisTotal ?? 0)} />
              <Stat label="Market Value" value={fmt$$(stock.currentValue ?? 0)} />
              <Stat
                label="Total Return"
                value={fmt$$(stock.totalGainDollar ?? 0)}
                sub={fmtPct(stock.totalGainPercent ?? 0)}
                valueClass={gainColor(stock.totalGainDollar ?? 0)}
              />
              <Stat
                label="Today's Return"
                value={fmt$$(stock.todayGainDollar ?? 0)}
                sub={fmtPct(stock.todayGainPercent ?? 0)}
                valueClass={gainColor(stock.todayGainDollar ?? 0)}
              />
            </div>

            {stock.percentOfAccount !== undefined && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Portfolio weight</span>
                  <span className="text-zinc-300 font-medium">{stock.percentOfAccount.toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-surface-4 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-blue/70 rounded-full"
                    style={{ width: `${Math.min(stock.percentOfAccount, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 52W range */}
        {weekHigh && weekLow && rangePos !== null && (
          <div className="px-5 py-4 border-b border-surface-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">52-Week Range</h3>
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>{fmt$$(weekLow)} Low</span>
              <span className="text-zinc-300 font-mono">{fmt$$(price)}</span>
              <span>High {fmt$$(weekHigh)}</span>
            </div>
            <div className="h-2 bg-surface-4 rounded-full relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-200 border-2 border-surface-base shadow"
                style={{ left: `clamp(0%, ${rangePos}%, calc(100% - 12px))` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {rangePos.toFixed(0)}% from 52-week low
            </p>
          </div>
        )}

        {/* Market data */}
        {quote && (
          <div className="px-5 py-4 border-b border-surface-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Market Data</h3>
            <div className="grid grid-cols-2 gap-3">
              {quote.marketCap && <Stat label="Market Cap" value={fmtCompact(quote.marketCap)} />}
              {quote.peRatio && <Stat label="P/E Ratio" value={quote.peRatio.toFixed(2)} />}
              {quote.forwardPE && <Stat label="Fwd P/E" value={quote.forwardPE.toFixed(2)} />}
              {quote.eps && <Stat label="EPS (TTM)" value={fmt$$(quote.eps)} />}
              {quote.beta && <Stat label="Beta" value={quote.beta.toFixed(2)} />}
              {quote.dividendYield !== undefined && quote.dividendYield > 0 && (
                <Stat label="Div Yield" value={`${quote.dividendYield.toFixed(2)}%`} />
              )}
              {quote.volume && <Stat label="Volume" value={fmtVolume(quote.volume)} />}
              {quote.avgVolume && <Stat label="Avg Volume" value={fmtVolume(quote.avgVolume)} />}
              {quote.open && <Stat label="Open" value={fmt$$(quote.open)} />}
              {quote.previousClose && <Stat label="Prev Close" value={fmt$$(quote.previousClose)} />}
              {quote.dayHigh && <Stat label="Day High" value={fmt$$(quote.dayHigh)} />}
              {quote.dayLow && <Stat label="Day Low" value={fmt$$(quote.dayLow)} />}
            </div>
          </div>
        )}

        {/* Watchlist: what-if context */}
        {stock.status === 'watching' && quote && (
          <div className="px-5 py-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Watch Notes</h3>
            <p className="text-xs text-zinc-500">
              This stock is on your watchlist. Open the chart above to evaluate momentum before adding to your portfolio.
            </p>
            <a
              href={`https://finance.yahoo.com/quote/${stock.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-accent-blue hover:underline"
            >
              View on Yahoo Finance <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label, value, sub, valueClass,
}: {
  label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <div className="bg-surface-2 rounded-lg px-3 py-2.5">
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className={cn('font-mono text-sm font-medium', valueClass)}>{value}</p>
      {sub && <p className={cn('font-mono text-xs', valueClass)}>{sub}</p>}
    </div>
  )
}
