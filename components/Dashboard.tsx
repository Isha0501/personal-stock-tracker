'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, SlidersHorizontal, TrendingUp, Upload, X } from 'lucide-react'
import { loadPositions, loadWatchlist, loadLastUpdated, clearAll } from '@/lib/storage'
import { buildUnifiedList, calcPortfolioSummary, cn } from '@/lib/utils'
import type { UnifiedStock, QuoteData, HistoryPoint, PortfolioSummary } from '@/lib/types'
import PortfolioSummaryBar from './PortfolioSummary'
import StockCard from './StockCard'
import DetailPanel from './DetailPanel'

type FilterMode = 'all' | 'holdings' | 'watchlist'
type SortKey = 'symbol' | 'price' | 'change' | 'value' | 'totalGain'

interface Props {
  onReset: () => void
}

export default function Dashboard({ onReset }: Props) {
  const [stocks, setStocks] = useState<UnifiedStock[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({})
  const [sparklines, setSparklines] = useState<Record<string, HistoryPoint[]>>({})
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0, totalCost: 0, totalGainDollar: 0, totalGainPercent: 0,
    todayGainDollar: 0, todayGainPercent: 0, positionCount: 0, watchCount: 0,
  })
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('value')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const load = useCallback(() => {
    const positions = loadPositions()
    const watchlist = loadWatchlist()
    const unified = buildUnifiedList(positions, watchlist)
    const s = calcPortfolioSummary(positions)
    s.watchCount = watchlist.filter(w => !positions.find(p => p.symbol === w.symbol)).length
    setStocks(unified)
    setSummary(s)
    setLastUpdated(loadLastUpdated())
    return unified
  }, [])

  const fetchQuotes = useCallback(async (list: UnifiedStock[]) => {
    if (!list.length) return
    const symbols = list.map(s => s.symbol).join(',')
    try {
      const res = await fetch(`/api/quotes?symbols=${symbols}`)
      const data = await res.json()
      setQuotes(data)
    } catch (err) {
      console.error('Failed to fetch quotes', err)
    }
  }, [])

  const fetchSparklines = useCallback(async (list: UnifiedStock[]) => {
    const results: Record<string, HistoryPoint[]> = {}
    await Promise.allSettled(
      list.map(async s => {
        try {
          const res = await fetch(`/api/history?symbol=${s.symbol}&range=1M`)
          const data = await res.json()
          results[s.symbol] = Array.isArray(data) ? data : []
        } catch {
          results[s.symbol] = []
        }
      })
    )
    setSparklines(results)
  }, [])

  useEffect(() => {
    const unified = load()
    fetchQuotes(unified)
    fetchSparklines(unified)
  }, [load, fetchQuotes, fetchSparklines])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchQuotes(stocks)
    setRefreshing(false)
  }

  const handleReset = () => {
    clearAll()
    onReset()
  }

  const filtered = useMemo(() => {
    // null-safe helper: API can return null (not just undefined) for missing fields
    const num = (v: number | null | undefined, fallback: number) =>
      v != null ? v : fallback

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
        switch (sort) {
          case 'symbol':
            return a.symbol.localeCompare(b.symbol)
          case 'price':
            return num(qb?.price, b.lastPrice) - num(qa?.price, a.lastPrice)
          case 'change':
            return num(qb?.changePercent, b.changePercent) - num(qa?.changePercent, a.changePercent)
          case 'value': {
            const va = a.currentValue ?? 0
            const vb = b.currentValue ?? 0
            if (vb !== va) return vb - va
            return num(qb?.price, b.lastPrice) - num(qa?.price, a.lastPrice)
          }
          case 'totalGain':
            return (b.totalGainPercent ?? 0) - (a.totalGainPercent ?? 0)
          default:
            return 0
        }
      })
  }, [stocks, quotes, filter, search, sort])

  const selectedStock = selectedSymbol ? stocks.find(s => s.symbol === selectedSymbol) ?? null : null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3 bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-accent-blue" />
          <span className="font-semibold text-sm tracking-tight">Portfolio Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-3"
          >
            <Upload size={12} />
            Re-upload CSVs
          </button>
        </div>
      </div>

      {/* Portfolio summary */}
      <PortfolioSummaryBar
        summary={summary}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Controls */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-3 bg-surface-1 flex-shrink-0 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
          {(['all', 'holdings', 'watchlist'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-surface-4 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-[280px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-full bg-surface-2 border border-surface-4 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(prev => !prev)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 bg-surface-2 border border-surface-4 rounded-lg transition-colors"
          >
            <SlidersHorizontal size={12} />
            Sort: {sort === 'totalGain' ? 'total gain' : sort}
          </button>
          {showSortMenu && (
            <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-surface-4 rounded-lg py-1 z-50 shadow-xl min-w-[140px]">
              {(['symbol', 'price', 'change', 'value', 'totalGain'] as SortKey[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setSort(s); setShowSortMenu(false) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs capitalize transition-colors',
                    sort === s ? 'text-accent-blue' : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-3'
                  )}
                >
                  {s === 'totalGain' ? 'Total Gain %' : s}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} stocks</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stock list */}
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
              <StockCard
                key={stock.symbol}
                stock={stock}
                quote={quotes[stock.symbol] ?? null}
                history={sparklines[stock.symbol] ?? []}
                selected={stock.symbol === selectedSymbol}
                onClick={() => setSelectedSymbol(
                  stock.symbol === selectedSymbol ? null : stock.symbol
                )}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedStock && (
          <div className="w-[45%] flex-shrink-0 overflow-hidden bg-surface-1 border-l border-surface-3">
            <DetailPanel
              stock={selectedStock}
              quote={quotes[selectedStock.symbol] ?? null}
              onClose={() => setSelectedSymbol(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
