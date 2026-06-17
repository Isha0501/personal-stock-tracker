'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UnifiedStock, QuoteData, HistoryPoint } from '@/lib/types'
import StockCard from './StockCard'
import DetailPanel from './DetailPanel'

type FilterMode = 'all' | 'holdings' | 'watchlist'
type SortKey = 'symbol' | 'price' | 'change' | 'value' | 'totalGain'

const SORT_LABELS: Record<SortKey, string> = {
  symbol: 'Symbol A–Z',
  price: 'Price',
  change: 'Day Change %',
  value: 'Market Value',
  totalGain: 'Total Gain %',
}

interface Props {
  stocks: UnifiedStock[]
  quotes: Record<string, QuoteData>
  sparklines: Record<string, HistoryPoint[]>
}

export default function Dashboard({ stocks, quotes, sparklines }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('value')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const holdingCount = useMemo(() => stocks.filter(s => s.status === 'holding').length, [stocks])
  const watchCount = useMemo(() => stocks.filter(s => s.status === 'watching').length, [stocks])

  const filtered = useMemo(() => {
    const num = (v: number | null | undefined, fallback: number) => v != null ? v : fallback

    return stocks
      .filter(s => {
        if (filter === 'holdings') return s.status === 'holding'
        if (filter === 'watchlist') return s.status === 'watching'
        return true
      })
      .filter(s => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.symbol.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      })
      .slice()
      .sort((a, b) => {
        const qa = quotes[a.symbol] as QuoteData | null | undefined
        const qb = quotes[b.symbol] as QuoteData | null | undefined

        const holdingsFirst = (fn: () => number) => {
          if (a.status !== b.status) return a.status === 'holding' ? -1 : 1
          return fn()
        }

        switch (sort) {
          case 'symbol': return a.symbol.localeCompare(b.symbol)
          case 'price': return num(qb?.price, b.lastPrice) - num(qa?.price, a.lastPrice)
          case 'change': return num(qb?.changePercent, b.changePercent) - num(qa?.changePercent, a.changePercent)
          case 'value': return holdingsFirst(() => (b.currentValue ?? 0) - (a.currentValue ?? 0))
          case 'totalGain': return holdingsFirst(() => (b.totalGainPercent ?? 0) - (a.totalGainPercent ?? 0))
          default: return 0
        }
      })
  }, [stocks, quotes, filter, search, sort])

  const selectedStock = selectedSymbol ? stocks.find(s => s.symbol === selectedSymbol) ?? null : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-3 bg-surface-1 flex-shrink-0 flex-wrap">
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
          {([
            { key: 'all', label: `All (${holdingCount + watchCount})` },
            { key: 'holdings', label: `Holdings (${holdingCount})` },
            { key: 'watchlist', label: `Watchlist (${watchCount})` },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                filter === key ? 'bg-surface-4 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-[280px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-full bg-surface-2 border border-surface-4 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue/50" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowSortMenu(p => !p)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 bg-surface-2 border border-surface-4 rounded-lg transition-colors whitespace-nowrap">
            <SlidersHorizontal size={12} />
            {SORT_LABELS[sort]}
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-surface-4 rounded-lg py-1 z-50 shadow-xl min-w-[160px]">
                {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => { setSort(key); setShowSortMenu(false) }}
                    className={cn('w-full text-left px-3 py-1.5 text-xs transition-colors',
                      sort === key ? 'text-accent-blue bg-accent-blue/5' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-3')}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} stocks</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          'flex flex-col overflow-y-auto border-r border-surface-3 transition-all duration-200',
          selectedStock ? 'w-[55%]' : 'w-full'
        )}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-zinc-600 gap-2 py-20">
              <p className="text-sm">No stocks found</p>
              {search && <button onClick={() => setSearch('')} className="text-xs text-accent-blue hover:underline">Clear search</button>}
            </div>
          ) : (
            filtered.map(stock => (
              <StockCard key={stock.symbol} stock={stock}
                quote={quotes[stock.symbol] ?? null}
                history={sparklines[stock.symbol] ?? []}
                selected={stock.symbol === selectedSymbol}
                onClick={() => setSelectedSymbol(stock.symbol === selectedSymbol ? null : stock.symbol)}
              />
            ))
          )}
        </div>

        {selectedStock && (
          <div className="w-[45%] flex-shrink-0 overflow-hidden bg-surface-1 border-l border-surface-3">
            <DetailPanel stock={selectedStock} quote={quotes[selectedStock.symbol] ?? null}
              onClose={() => setSelectedSymbol(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
