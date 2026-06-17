'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { TrendingUp, Upload, LayoutDashboard, Briefcase, History } from 'lucide-react'
import { hasData, loadPortfolios, loadWatchlist, loadTransactions, loadLastUpdated, clearAll } from '@/lib/storage'
import { buildUnifiedList, calcPortfolioSummary, cn } from '@/lib/utils'
import type { UnifiedStock, QuoteData, HistoryPoint, Portfolio, Transaction } from '@/lib/types'
import UploadScreen from '@/components/UploadScreen'
import PortfolioSummaryBar from '@/components/PortfolioSummary'
import Dashboard from '@/components/Dashboard'
import AccountsOverview from '@/components/AccountsOverview'
import TransactionHistory from '@/components/TransactionHistory'

type View = 'dashboard' | 'accounts' | 'history'

export default function Home() {
  const [ready, setReady] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [view, setView] = useState<View>('dashboard')

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [stocks, setStocks] = useState<UnifiedStock[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({})
  const [sparklines, setSparklines] = useState<Record<string, HistoryPoint[]>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const summary = useMemo(() => {
    const s = calcPortfolioSummary(portfolios)
    const holdingSymbols = new Set(portfolios.flatMap(p => p.positions.map(pos => pos.symbol)))
    const watchlist = loadWatchlist()
    s.watchCount = watchlist.filter(w => !holdingSymbols.has(w.symbol)).length
    return s
  }, [portfolios])

  const load = useCallback(() => {
    const p = loadPortfolios()
    const wl = loadWatchlist()
    const txs = loadTransactions()
    const unified = buildUnifiedList(p, wl)
    setPortfolios(p)
    setStocks(unified)
    setTransactions(txs)
    setLastUpdated(loadLastUpdated())
    return unified
  }, [])

  const fetchQuotes = useCallback(async (list: UnifiedStock[]) => {
    if (!list.length) return
    try {
      const res = await fetch(`/api/quotes?symbols=${list.map(s => s.symbol).join(',')}`)
      setQuotes(await res.json())
    } catch (err) { console.error(err) }
  }, [])

  const fetchSparklines = useCallback(async (list: UnifiedStock[]) => {
    const results: Record<string, HistoryPoint[]> = {}
    await Promise.allSettled(list.map(async s => {
      try {
        const res = await fetch(`/api/history?symbol=${s.symbol}&range=1M`)
        const data = await res.json()
        results[s.symbol] = Array.isArray(data) ? data : []
      } catch { results[s.symbol] = [] }
    }))
    setSparklines(results)
  }, [])

  useEffect(() => {
    const uploaded = hasData()
    setHasUploaded(uploaded)
    setReady(true)
    if (uploaded) {
      const unified = load()
      fetchQuotes(unified)
      fetchSparklines(unified)
    }
  }, [load, fetchQuotes, fetchSparklines])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchQuotes(stocks)
    setRefreshing(false)
  }

  const handleReset = () => {
    clearAll()
    setHasUploaded(false)
    setPortfolios([])
    setStocks([])
    setQuotes({})
    setSparklines({})
    setTransactions([])
  }

  const handleUploadComplete = () => {
    setHasUploaded(true)
    const unified = load()
    fetchQuotes(unified)
    fetchSparklines(unified)
  }

  if (!ready) return null
  if (!hasUploaded) return <UploadScreen onComplete={handleUploadComplete} />

  const NAV: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    { key: 'accounts', label: 'Accounts', icon: <Briefcase size={14} /> },
    { key: 'history', label: 'History', icon: <History size={14} /> },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-surface-3 bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 mr-2">
            <TrendingUp size={16} className="text-accent-blue" />
            <span className="font-semibold text-sm tracking-tight">Portfolio Tracker</span>
          </div>
          <div className="flex gap-1">
            {NAV.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setView(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  view === key ? 'bg-surface-3 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-2'
                )}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-3">
          <Upload size={12} /> Re-upload
        </button>
      </div>

      <PortfolioSummaryBar summary={summary} lastUpdated={lastUpdated} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex-1 overflow-hidden">
        {view === 'dashboard' && <Dashboard stocks={stocks} quotes={quotes} sparklines={sparklines} />}
        {view === 'accounts' && <AccountsOverview portfolios={portfolios} quotes={quotes} />}
        {view === 'history' && <TransactionHistory transactions={transactions} />}
      </div>
    </div>
  )
}
