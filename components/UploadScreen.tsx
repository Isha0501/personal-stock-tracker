'use client'

import { useCallback, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { parsePositionsCSV, parseWatchlistCSV } from '@/lib/csvParser'
import { savePositions, saveWatchlist } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface Props {
  onComplete: () => void
}

type FileState = 'idle' | 'loaded' | 'error'

interface FileSlot {
  state: FileState
  name: string
  count: number
  error?: string
}

export default function UploadScreen({ onComplete }: Props) {
  const [positions, setPositions] = useState<FileSlot>({ state: 'idle', name: '', count: 0 })
  const [watchlist, setWatchlist] = useState<FileSlot>({ state: 'idle', name: '', count: 0 })

  const handleFile = useCallback((file: File, type: 'positions' | 'watchlist') => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      try {
        if (type === 'positions') {
          const parsed = parsePositionsCSV(content)
          if (parsed.length === 0) throw new Error('No positions found — check CSV format')
          savePositions(parsed)
          setPositions({ state: 'loaded', name: file.name, count: parsed.length })
        } else {
          const parsed = parseWatchlistCSV(content)
          if (parsed.length === 0) throw new Error('No watchlist items found — check CSV format')
          saveWatchlist(parsed)
          setWatchlist({ state: 'loaded', name: file.name, count: parsed.length })
        }
      } catch (err) {
        const setter = type === 'positions' ? setPositions : setWatchlist
        setter({ state: 'error', name: file.name, count: 0, error: String(err) })
      }
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, type: 'positions' | 'watchlist') => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file, type)
    },
    [handleFile]
  )

  const canContinue = positions.state === 'loaded' || watchlist.state === 'loaded'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-accent-blue" size={28} />
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio Tracker</h1>
        </div>
        <p className="text-zinc-400 mb-10 text-sm">
          Export your CSVs from Fidelity and upload them below. Your data stays in your browser — nothing is sent to any server.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <DropZone
            label="Positions"
            description="Accounts & Trade → Portfolio → Export"
            slot={positions}
            onDrop={e => onDrop(e, 'positions')}
            onFile={f => handleFile(f, 'positions')}
          />
          <DropZone
            label="Watchlist"
            description="News & Research → Watchlists → Export"
            slot={watchlist}
            onDrop={e => onDrop(e, 'watchlist')}
            onFile={f => handleFile(f, 'watchlist')}
          />
        </div>

        <div className="text-xs text-zinc-500 mb-6 space-y-1">
          <p>How to export from Fidelity:</p>
          <p className="text-zinc-600">Positions — Portfolio page → &quot;Download&quot; button (top right) → CSV</p>
          <p className="text-zinc-600">Watchlist — Watchlist page → gear icon → &quot;Export Watchlist&quot;</p>
        </div>

        <button
          onClick={onComplete}
          disabled={!canContinue}
          className={cn(
            'w-full py-3 rounded-lg font-medium text-sm transition-all',
            canContinue
              ? 'bg-accent-blue text-white hover:opacity-90'
              : 'bg-surface-3 text-zinc-600 cursor-not-allowed'
          )}
        >
          {canContinue ? 'Open Dashboard' : 'Upload at least one file to continue'}
        </button>
      </div>
    </div>
  )
}

function DropZone({
  label,
  description,
  slot,
  onDrop,
  onFile,
}: {
  label: string
  description: string
  slot: FileSlot
  onDrop: (e: React.DragEvent) => void
  onFile: (f: File) => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <label
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all',
        dragging ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-4 bg-surface-1 hover:border-zinc-600',
        slot.state === 'loaded' && 'border-gain/40 bg-gain/5',
        slot.state === 'error' && 'border-loss/40 bg-loss/5'
      )}
      onDrop={e => { setDragging(false); onDrop(e) }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
    >
      <input
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />

      {slot.state === 'idle' && (
        <>
          <Upload size={24} className="text-zinc-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">{label}</p>
            <p className="text-xs text-zinc-500 mt-1">{description}</p>
          </div>
          <p className="text-xs text-zinc-600">Drag & drop or click to browse</p>
        </>
      )}

      {slot.state === 'loaded' && (
        <>
          <CheckCircle size={24} className="text-gain" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{slot.count} items loaded</p>
            <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-[160px]">{slot.name}</p>
          </div>
          <p className="text-xs text-zinc-500">Click to replace</p>
        </>
      )}

      {slot.state === 'error' && (
        <>
          <AlertCircle size={24} className="text-loss" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-loss mt-1">{slot.error}</p>
          </div>
          <p className="text-xs text-zinc-500">Click to try again</p>
        </>
      )}
    </label>
  )
}
