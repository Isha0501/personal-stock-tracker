export interface Position {
  symbol: string
  description: string
  quantity: number
  lastPrice: number
  lastPriceChange: number
  currentValue: number
  todayGainDollar: number
  todayGainPercent: number
  totalGainDollar: number
  totalGainPercent: number
  percentOfAccount: number
  costBasisTotal: number
  avgCostBasis: number
  type: string
}

export interface Portfolio {
  id: string
  name: string
  positions: Position[]
}

export interface PortfolioPosition {
  portfolioId: string
  portfolioName: string
  quantity: number
  currentValue: number
  costBasisTotal: number
  avgCostBasis: number
  totalGainDollar: number
  totalGainPercent: number
  todayGainDollar: number
  percentOfPortfolio: number
}

export interface WatchlistItem {
  symbol: string
  description: string
  lastPrice: number
  changeDollar: number
  changePercent: number
  volume?: number
  weekHigh52?: number
  weekLow52?: number
  peRatio?: number
  divYield?: number
}

export type StockStatus = 'holding' | 'watching'

export interface UnifiedStock {
  symbol: string
  description: string
  status: StockStatus
  lastPrice: number
  changePercent: number
  changeDollar: number
  portfolioPositions: PortfolioPosition[]
  // holding aggregates
  quantity?: number
  currentValue?: number
  totalGainDollar?: number
  totalGainPercent?: number
  todayGainDollar?: number
  todayGainPercent?: number
  percentOfAccount?: number
  costBasisTotal?: number
  avgCostBasis?: number
  // watchlist-only
  weekHigh52?: number
  weekLow52?: number
  peRatio?: number
  volume?: number
}

export interface QuoteData {
  symbol: string
  price: number
  change: number
  changePercent: number
  marketCap?: number
  peRatio?: number
  forwardPE?: number
  weekHigh52?: number
  weekLow52?: number
  volume?: number
  avgVolume?: number
  dividendYield?: number
  beta?: number
  eps?: number
  sector?: string
  industry?: string
  shortName?: string
  longName?: string
  open?: number
  previousClose?: number
  dayHigh?: number
  dayLow?: number
}

export interface HistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalGainDollar: number
  totalGainPercent: number
  todayGainDollar: number
  todayGainPercent: number
  positionCount: number
  watchCount: number
}
