import type { Portfolio, WatchlistItem, Transaction } from './types'

const PORTFOLIOS_KEY = 'pt_portfolios'
const WATCHLIST_KEY = 'pt_watchlist'
const TRANSACTIONS_KEY = 'pt_transactions'
const LAST_UPDATED_KEY = 'pt_last_updated'

function stamp() {
  localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
}

export function savePortfolios(portfolios: Portfolio[]) {
  localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios))
  stamp()
}

export function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  stamp()
}

export function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs))
  stamp()
}

export function loadPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function loadLastUpdated(): string | null {
  return localStorage.getItem(LAST_UPDATED_KEY)
}

export function clearAll() {
  [PORTFOLIOS_KEY, WATCHLIST_KEY, TRANSACTIONS_KEY, LAST_UPDATED_KEY,
   'pt_positions' /* legacy */].forEach(k => localStorage.removeItem(k))
}

export function hasData(): boolean {
  return !!(
    localStorage.getItem(PORTFOLIOS_KEY) ||
    localStorage.getItem(WATCHLIST_KEY) ||
    localStorage.getItem('pt_positions')
  )
}
