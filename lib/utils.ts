import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Portfolio, WatchlistItem, UnifiedStock, PortfolioPosition, PortfolioSummary } from './types'

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

export function buildUnifiedList(portfolios: Portfolio[], watchlist: WatchlistItem[]): UnifiedStock[] {
  // Aggregate positions by symbol across all portfolios
  const holdingMap = new Map<string, { desc: string; perPortfolio: (PortfolioPosition & { lastPrice: number; lastPriceChange: number })[] }>()

  // Pre-compute each portfolio's total value for percentOfPortfolio
  const portfolioTotals = new Map<string, number>()
  for (const p of portfolios) {
    portfolioTotals.set(p.id, p.positions.reduce((s, pos) => s + pos.currentValue, 0))
  }

  const allPositionsValue = Array.from(portfolioTotals.values()).reduce((s, v) => s + v, 0)

  for (const portfolio of portfolios) {
    for (const pos of portfolio.positions) {
      const sym = pos.symbol.trim().toUpperCase()
      if (!holdingMap.has(sym)) {
        holdingMap.set(sym, { desc: pos.description, perPortfolio: [] })
      }
      const portfolioTotal = portfolioTotals.get(portfolio.id) ?? 0
      holdingMap.get(sym)!.perPortfolio.push({
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        quantity: pos.quantity,
        currentValue: pos.currentValue,
        costBasisTotal: pos.costBasisTotal,
        avgCostBasis: pos.avgCostBasis,
        totalGainDollar: pos.totalGainDollar,
        totalGainPercent: pos.totalGainPercent,
        todayGainDollar: pos.todayGainDollar,
        percentOfPortfolio: portfolioTotal > 0 ? (pos.currentValue / portfolioTotal) * 100 : 0,
        lastPrice: pos.lastPrice,
        lastPriceChange: pos.lastPriceChange,
      })
    }
  }

  const holdings: UnifiedStock[] = []

  for (const entry of Array.from(holdingMap.entries())) {
    const [symbol, { desc, perPortfolio }] = entry
    const totalQuantity = perPortfolio.reduce((s: number, p: typeof perPortfolio[0]) => s + p.quantity, 0)
    const totalValue = perPortfolio.reduce((s: number, p: typeof perPortfolio[0]) => s + p.currentValue, 0)
    const totalCost = perPortfolio.reduce((s: number, p: typeof perPortfolio[0]) => s + p.costBasisTotal, 0)
    const totalGainDollar = perPortfolio.reduce((s: number, p: typeof perPortfolio[0]) => s + p.totalGainDollar, 0)
    const totalGainPercent = totalCost > 0 ? (totalGainDollar / totalCost) * 100 : 0
    const todayGainDollar = perPortfolio.reduce((s: number, p: typeof perPortfolio[0]) => s + p.todayGainDollar, 0)
    const prevValue = totalValue - todayGainDollar
    const todayGainPercent = prevValue > 0 ? (todayGainDollar / prevValue) * 100 : 0
    const avgCostBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0
    const lastPrice = perPortfolio[0].lastPrice
    const lastPriceChange = perPortfolio[0].lastPriceChange

    // Strip internal fields not in PortfolioPosition
    const portfolioPositions: PortfolioPosition[] = perPortfolio.map(pp => ({
      portfolioId: pp.portfolioId,
      portfolioName: pp.portfolioName,
      quantity: pp.quantity,
      currentValue: pp.currentValue,
      costBasisTotal: pp.costBasisTotal,
      avgCostBasis: pp.avgCostBasis,
      totalGainDollar: pp.totalGainDollar,
      totalGainPercent: pp.totalGainPercent,
      todayGainDollar: pp.todayGainDollar,
      percentOfPortfolio: pp.percentOfPortfolio,
    }))

    holdings.push({
      symbol,
      description: desc,
      status: 'holding',
      lastPrice,
      changePercent: todayGainPercent,
      changeDollar: lastPriceChange,
      portfolioPositions,
      quantity: totalQuantity,
      currentValue: totalValue,
      totalGainDollar,
      totalGainPercent,
      todayGainDollar,
      todayGainPercent,
      percentOfAccount: allPositionsValue > 0 ? (totalValue / allPositionsValue) * 100 : 0,
      costBasisTotal: totalCost,
      avgCostBasis,
    })
  }

  const holdingSymbols = new Set(holdings.map(h => h.symbol))

  const watches: UnifiedStock[] = watchlist
    .filter(w => !holdingSymbols.has(w.symbol.trim().toUpperCase()))
    .map(w => ({
      symbol: w.symbol.trim().toUpperCase(),
      description: w.description,
      status: 'watching',
      lastPrice: w.lastPrice,
      changePercent: w.changePercent,
      changeDollar: w.changeDollar,
      portfolioPositions: [],
      weekHigh52: w.weekHigh52,
      weekLow52: w.weekLow52,
      peRatio: w.peRatio,
      volume: w.volume,
    }))

  return [...holdings, ...watches]
}

export function calcPortfolioSummary(portfolios: Portfolio[]): PortfolioSummary {
  const allPositions = portfolios.flatMap(p => p.positions)

  // Unique symbols for position count
  const uniqueSymbols = new Set(allPositions.map(p => p.symbol))

  const totalValue = allPositions.reduce((s, p) => s + p.currentValue, 0)
  const totalCost = allPositions.reduce((s, p) => s + p.costBasisTotal, 0)
  const totalGainDollar = allPositions.reduce((s, p) => s + p.totalGainDollar, 0)
  const totalGainPercent = totalCost > 0 ? (totalGainDollar / totalCost) * 100 : 0
  const todayGainDollar = allPositions.reduce((s, p) => s + p.todayGainDollar, 0)
  const prevValue = totalValue - todayGainDollar
  const todayGainPercent = prevValue > 0 ? (todayGainDollar / prevValue) * 100 : 0

  return {
    totalValue,
    totalCost,
    totalGainDollar,
    totalGainPercent,
    todayGainDollar,
    todayGainPercent,
    positionCount: uniqueSymbols.size,
    watchCount: 0,
  }
}
