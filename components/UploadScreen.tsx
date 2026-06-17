'use client'

import { useCallback, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react'
import { parsePortfoliosCSV, parseWatchlistCSV, parseAccountHistoryCSV } from '@/lib/csvParser'
import { savePortfolios, saveWatchlist, saveTransactions } from '@/lib/storage'
import type { Portfolio } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  onComplete: () => void
}

type SlotState = 'idle' | 'loaded' | 'error'

interface UploadSlot {
  state: SlotState
  fileName: string
  count: number
  error?: string
}

function emptySlot(): UploadSlot {
  return { state: 'idle', fileName: '', count: 0 }
}

export default function UploadScreen({ onComplete }: Props) {
  const [positionsSlot, setPositionsSlot] = useState<UploadSlot>(emptySlot())
  const [detectedPortfolios, setDetectedPortfolios] = useState<Portfolio[]>([])
  const [portfolioNames, setPortfolioNames] = useState<Record<string, string>>({})

  const [watchlistSlot, setWatchlistSlot] = useState<UploadSlot>(emptySlot())
  const [historySlot, setHistorySlot] = useState<UploadSlot>(emptySlot())

  const handlePositionsFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      try {
        const portfolios = parsePortfoliosCSV(content)
        if (portfolios.length === 0) throw new Error('No accounts detected — check CSV format')
        const totalPositions = portfolios.reduce((s, p) => s + p.positions.length, 0)
        setDetectedPortfolios(portfolios)
        const names: Record<string, string> = {}
        portfolios.forEach(p => { names[p.id] = p.name })
        setPortfolioNames(names)
        setPositionsSlot({ state: 'loaded', fileName: file.name, count: totalPositions })
      } catch (err) {
        setPositionsSlot({ state: 'error', fileName: file.name, count: 0, error: String(err) })
      }
    }
    reader.readAsText(file)
  }, [])

  const handleWatchlistFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      try {
        const parsed = parseWatchlistCSV(content)
        if (parsed.length === 0) throw new Error('No watchlist items found — check CSV format')
        saveWatchlist(parsed)
        setWatchlistSlot({ state: 'loaded', fileName: file.name, count: parsed.length })
      } catch (err) {
        setWatchlistSlot({ state: 'error', fileName: file.name, count: 0, error: String(err) })
      }
    }
    reader.readAsText(file)
  }, [])

  const handleHistoryFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      try {
        const txs = parseAccountHistoryCSV(content)
        if (txs.length === 0) throw new Error('No transactions found — check CSV format')
        saveTransactions(txs)
        setHistorySlot({ state: 'loaded', fileName: file.name, count: txs.length })
      } catch (err) {
        setHistorySlot({ state: 'error', fileName: file.name, count: 0, error: String(err) })
      }
    }
    reader.readAsText(file)
  }, [])

  const handleContinue = () => {
    if (detectedPortfolios.length > 0) {
      const renamed = detectedPortfolios.map(p => ({
        ...p,
        name: (portfolioNames[p.id] ?? p.name).trim() || p.name,
      }))
      savePortfolios(renamed)
    }
    onComplete()
  }

  const canContinue = positionsSlot.state === 'loaded' || watchlistSlot.state === 'loaded'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-accent-blue" size={28} />
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio Tracker</h1>
        </div>
        <p className="text-zinc-400 mb-8 text-sm">
          Upload your Fidelity CSV exports. Multiple accounts are auto-detected from a single positions file.
          Everything stays in your browser — nothing is sent anywhere.
        </p>

        {/* Step 1: Positions */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-accent-blue text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
            <p className="text-sm font-medium text-zinc-300">Portfolio Positions</p>
            <span className="text-xs text-zinc-600 ml-1">required</span>
          </div>
          <DropZone
            description="Accounts & Trade → Portfolio → Download (CSV)"
            slot={positionsSlot}
            onFile={handlePositionsFile}
          />

          {/* Account name editor */}
          {detectedPortfolios.length > 0 && (
            <div className="mt-3 bg-surface-1 border border-surface-3 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">
                {detectedPortfolios.length} account{detectedPortfolios.length > 1 ? 's' : ''} detected — rename if you like:
              </p>
              <div className="space-y-2">
                {detectedPortfolios.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 font-mono w-24 flex-shrink-0">{p.accountNumber}</span>
                    <input
                      value={portfolioNames[p.id] ?? p.name}
                      onChange={e => setPortfolioNames(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 bg-surface-2 border border-surface-4 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent-blue/50"
                    />
                    <span className="text-xs text-zinc-600">{p.positions.length} positions · ${p.cashBalance.toFixed(2)} cash</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Watchlist */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-surface-3 text-zinc-400 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
            <p className="text-sm font-medium text-zinc-300">Watchlist</p>
            <span className="text-xs text-zinc-600 ml-1">optional</span>
          </div>
          <DropZone
            description="News & Research → Watchlists → Export (gear icon)"
            slot={watchlistSlot}
            onFile={handleWatchlistFile}
          />
        </div>

        {/* Step 3: History */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-surface-3 text-zinc-400 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
            <p className="text-sm font-medium text-zinc-300">Account History</p>
            <span className="text-xs text-zinc-600 ml-1">optional · enables transaction tracking</span>
          </div>
          <DropZone
            description="Accounts & Trade → History → Download (select all accounts)"
            slot={historySlot}
            onFile={handleHistoryFile}
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            'w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2',
            canContinue
              ? 'bg-accent-blue text-white hover:opacity-90'
              : 'bg-surface-3 text-zinc-600 cursor-not-allowed'
          )}
        >
          {canContinue ? (
            <><span>Open Dashboard</span><ChevronRight size={16} /></>
          ) : (
            'Upload at least one file to continue'
          )}
        </button>
      </div>
    </div>
  )
}

function DropZone({
  description, slot, onFile,
}: {
  description: string
  slot: UploadSlot
  onFile: (f: File) => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <label
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all',
        dragging && 'border-accent-blue bg-accent-blue/5',
        !dragging && slot.state === 'idle' && 'border-surface-4 bg-surface-1 hover:border-zinc-600',
        slot.state === 'loaded' && 'border-gain/40 bg-gain/5',
        slot.state === 'error' && 'border-loss/40 bg-loss/5'
      )}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
    >
      <input type="file" accept=".csv" className="sr-only"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />

      {slot.state === 'idle' && (
        <>
          <Upload size={16} className="text-zinc-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-400">{description}</p>
          </div>
          <p className="text-xs text-zinc-600 flex-shrink-0">drag or click</p>
        </>
      )}
      {slot.state === 'loaded' && (
        <>
          <CheckCircle size={16} className="text-gain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gain font-medium">{slot.count} records loaded</p>
            <p className="text-xs text-zinc-600 truncate">{slot.fileName}</p>
          </div>
          <p className="text-xs text-zinc-600 flex-shrink-0">click to replace</p>
        </>
      )}
      {slot.state === 'error' && (
        <>
          <AlertCircle size={16} className="text-loss flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-loss">{slot.error}</p>
          </div>
        </>
      )}
    </label>
  )
}
