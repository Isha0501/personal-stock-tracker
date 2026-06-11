import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Position, WatchlistItem, UnifiedStock, PortfolioSummary } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt$$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return fmt$$(n)
}

export function fmtVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

export function gainColor(n: number): string {
  if (n > 0) return 'text-gain'
  if (n < 0) return 'text-loss'
  return 'text-zinc-400'
}

export function gainBg(n: number): string {
  if (n > 0) return 'bg-gain/10 border-gain/20'
  if (n < 0) return 'bg-loss/10 border-loss/20'
  return 'bg-zinc-800/40 border-zinc-700/40'
}

export function buildUnifiedList(positions: Position[], watchlist: WatchlistItem[]): UnifiedStock[] {
  const holdingSymbols = new Set(positions.map(p => p.symbol))

  const holdings: UnifiedStock[] = positions.map(p => ({
    symbol: p.symbol,
    description: p.description,
    status: 'holding',
    lastPrice: p.lastPrice,
    changePercent: p.todayGainPercent,
    changeDollar: p.lastPriceChange,
    quantity: p.quantity,
    currentValue: p.currentValue,
    totalGainDollar: p.totalGainDollar,
    totalGainPercent: p.totalGainPercent,
    todayGainDollar: p.todayGainDollar,
    todayGainPercent: p.todayGainPercent,
    percentOfAccount: p.percentOfAccount,
    costBasisTotal: p.costBasisTotal,
    avgCostBasis: p.avgCostBasis,
  }))

  const watches: UnifiedStock[] = watchlist
    .filter(w => !holdingSymbols.has(w.symbol))
    .map(w => ({
      symbol: w.symbol,
      description: w.description,
      status: 'watching',
      lastPrice: w.lastPrice,
      changePercent: w.changePercent,
      changeDollar: w.changeDollar,
      weekHigh52: w.weekHigh52,
      weekLow52: w.weekLow52,
      peRatio: w.peRatio,
      volume: w.volume,
    }))

  return [...holdings, ...watches]
}

export function calcPortfolioSummary(positions: Position[]): PortfolioSummary {
  return {
    totalValue: positions.reduce((s, p) => s + p.currentValue, 0),
    totalCost: positions.reduce((s, p) => s + p.costBasisTotal, 0),
    totalGainDollar: positions.reduce((s, p) => s + p.totalGainDollar, 0),
    totalGainPercent:
      positions.reduce((s, p) => s + p.costBasisTotal, 0) > 0
        ? (positions.reduce((s, p) => s + p.totalGainDollar, 0) /
            positions.reduce((s, p) => s + p.costBasisTotal, 0)) *
          100
        : 0,
    todayGainDollar: positions.reduce((s, p) => s + p.todayGainDollar, 0),
    todayGainPercent:
      positions.reduce((s, p) => s + (p.currentValue - p.todayGainDollar), 0) > 0
        ? (positions.reduce((s, p) => s + p.todayGainDollar, 0) /
            positions.reduce((s, p) => s + (p.currentValue - p.todayGainDollar), 0)) *
          100
        : 0,
    positionCount: positions.length,
    watchCount: 0,
  }
}
