'use client'

import { useCallback, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, TrendingUp, Plus, X } from 'lucide-react'
import { parsePositionsCSV, parseWatchlistCSV } from '@/lib/csvParser'
import { savePortfolios, saveWatchlist } from '@/lib/storage'
import type { Position, Portfolio } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  onComplete: () => void
}

type SlotState = 'idle' | 'loaded' | 'error'

interface PortfolioSlot {
  id: string
  name: string
  state: SlotState
  fileName: string
  count: number
  error?: string
  positions: Position[]
}

interface WatchlistSlot {
  state: SlotState
  fileName: string
  count: number
  error?: string
}

function makeSlot(id: string, name: string): PortfolioSlot {
  return { id, name, state: 'idle', fileName: '', count: 0, positions: [] }
}

export default function UploadScreen({ onComplete }: Props) {
  const [portfolioSlots, setPortfolioSlots] = useState<PortfolioSlot[]>([
    makeSlot('p1', 'Portfolio 1'),
  ])
  const [watchlistSlot, setWatchlistSlot] = useState<WatchlistSlot>({
    state: 'idle', fileName: '', count: 0,
  })

  const updateSlot = (id: string, update: Partial<PortfolioSlot>) => {
    setPortfolioSlots(prev => prev.map(s => s.id === id ? { ...s, ...update } : s))
  }

  const handlePortfolioFile = useCallback((file: File, slotId: string) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      try {
        const parsed = parsePositionsCSV(content)
        if (parsed.length === 0) throw new Error('No positions found — check CSV format')
        updateSlot(slotId, { state: 'loaded', fileName: file.name, count: parsed.length, positions: parsed, error: undefined })
      } catch (err) {
        updateSlot(slotId, { state: 'error', fileName: file.name, count: 0, positions: [], error: String(err) })
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

  const addPortfolio = () => {
    const id = `p${Date.now()}`
    setPortfolioSlots(prev => [...prev, makeSlot(id, `Portfolio ${prev.length + 1}`)])
  }

  const removePortfolio = (id: string) => {
    setPortfolioSlots(prev => prev.filter(s => s.id !== id))
  }

  const handleContinue = () => {
    const portfolios: Portfolio[] = portfolioSlots
      .filter(s => s.state === 'loaded')
      .map(s => ({ id: s.id, name: s.name.trim() || `Portfolio`, positions: s.positions }))
    if (portfolios.length > 0) savePortfolios(portfolios)
    onComplete()
  }

  const hasAnyLoaded = portfolioSlots.some(s => s.state === 'loaded') || watchlistSlot.state === 'loaded'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-accent-blue" size={28} />
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio Tracker</h1>
        </div>
        <p className="text-zinc-400 mb-8 text-sm">
          Upload CSVs from Fidelity. Add one portfolio per account — name them anything you like.
          Your data stays in your browser, nothing is sent to any server.
        </p>

        {/* Portfolio slots */}
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Portfolios</p>
          <div className="space-y-3">
            {portfolioSlots.map(slot => (
              <PortfolioRow
                key={slot.id}
                slot={slot}
                canRemove={portfolioSlots.length > 1}
                onNameChange={name => updateSlot(slot.id, { name })}
                onFile={f => handlePortfolioFile(f, slot.id)}
                onRemove={() => removePortfolio(slot.id)}
              />
            ))}
          </div>

          <button
            onClick={addPortfolio}
            className="mt-3 flex items-center gap-1.5 text-xs text-accent-blue hover:text-blue-400 transition-colors px-3 py-2 rounded-lg border border-dashed border-accent-blue/30 hover:border-accent-blue/60 w-full justify-center"
          >
            <Plus size={12} />
            Add Another Portfolio
          </button>
        </div>

        {/* Watchlist */}
        <div className="mb-6 mt-6">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Watchlist</p>
          <WatchlistRow slot={watchlistSlot} onFile={handleWatchlistFile} />
        </div>

        <div className="text-xs text-zinc-600 mb-6 space-y-1">
          <p className="text-zinc-500">How to export from Fidelity:</p>
          <p>Positions — Portfolio page → &quot;Download&quot; button (top right) → CSV</p>
          <p>Watchlist — Watchlist page → gear icon → &quot;Export Watchlist&quot;</p>
        </div>

        <button
          onClick={handleContinue}
          disabled={!hasAnyLoaded}
          className={cn(
            'w-full py-3 rounded-lg font-medium text-sm transition-all',
            hasAnyLoaded
              ? 'bg-accent-blue text-white hover:opacity-90'
              : 'bg-surface-3 text-zinc-600 cursor-not-allowed'
          )}
        >
          {hasAnyLoaded ? 'Open Dashboard' : 'Upload at least one file to continue'}
        </button>
      </div>
    </div>
  )
}

function PortfolioRow({
  slot, canRemove, onNameChange, onFile, onRemove,
}: {
  slot: PortfolioSlot
  canRemove: boolean
  onNameChange: (n: string) => void
  onFile: (f: File) => void
  onRemove: () => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="flex items-center gap-3 bg-surface-1 border border-surface-3 rounded-xl p-3">
      {/* Name input */}
      <input
        value={slot.name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Portfolio name"
        className="w-36 flex-shrink-0 bg-surface-2 border border-surface-4 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue/50"
      />

      {/* Drop zone */}
      <label
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all text-xs',
          dragging ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-4 hover:border-zinc-600',
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
            <Upload size={14} className="text-zinc-500 flex-shrink-0" />
            <span className="text-zinc-500">Drag CSV or click to browse</span>
          </>
        )}
        {slot.state === 'loaded' && (
          <>
            <CheckCircle size={14} className="text-gain flex-shrink-0" />
            <span className="text-gain">{slot.count} positions</span>
            <span className="text-zinc-600 truncate max-w-[120px]">— {slot.fileName}</span>
            <span className="text-zinc-600 ml-auto">click to replace</span>
          </>
        )}
        {slot.state === 'error' && (
          <>
            <AlertCircle size={14} className="text-loss flex-shrink-0" />
            <span className="text-loss truncate">{slot.error}</span>
          </>
        )}
      </label>

      {/* Remove button */}
      {canRemove && (
        <button onClick={onRemove} className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function WatchlistRow({ slot, onFile }: { slot: WatchlistSlot; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)

  return (
    <label
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all text-xs',
        dragging ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-4 bg-surface-1 hover:border-zinc-600',
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
          <Upload size={14} className="text-zinc-500" />
          <span className="text-zinc-500">Watchlist CSV — drag or click to browse</span>
          <span className="text-zinc-600 ml-auto">optional</span>
        </>
      )}
      {slot.state === 'loaded' && (
        <>
          <CheckCircle size={14} className="text-gain" />
          <span className="text-gain">{slot.count} stocks</span>
          <span className="text-zinc-600 truncate max-w-[200px]">— {slot.fileName}</span>
          <span className="text-zinc-600 ml-auto">click to replace</span>
        </>
      )}
      {slot.state === 'error' && (
        <>
          <AlertCircle size={14} className="text-loss" />
          <span className="text-loss">{slot.error}</span>
        </>
      )}
    </label>
  )
}
