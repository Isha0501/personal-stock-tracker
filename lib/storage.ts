import type { Portfolio, Position, WatchlistItem } from './types'

const PORTFOLIOS_KEY = 'pt_portfolios'
const LEGACY_POSITIONS_KEY = 'pt_positions'
const WATCHLIST_KEY = 'pt_watchlist'
const LAST_UPDATED_KEY = 'pt_last_updated'

export function savePortfolios(portfolios: Portfolio[]) {
  localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios))
  localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
}

export function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
}

export function loadPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_KEY)
    if (raw) return JSON.parse(raw)

    // Migrate old single-portfolio format
    const legacy = localStorage.getItem(LEGACY_POSITIONS_KEY)
    if (legacy) {
      const positions: Position[] = JSON.parse(legacy)
      const migrated: Portfolio[] = [{ id: 'default', name: 'My Portfolio', positions }]
      savePortfolios(migrated)
      localStorage.removeItem(LEGACY_POSITIONS_KEY)
      return migrated
    }

    return []
  } catch {
    return []
  }
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function loadLastUpdated(): string | null {
  return localStorage.getItem(LAST_UPDATED_KEY)
}

export function clearAll() {
  localStorage.removeItem(PORTFOLIOS_KEY)
  localStorage.removeItem(LEGACY_POSITIONS_KEY)
  localStorage.removeItem(WATCHLIST_KEY)
  localStorage.removeItem(LAST_UPDATED_KEY)
}

export function hasData(): boolean {
  return !!(
    localStorage.getItem(PORTFOLIOS_KEY) ||
    localStorage.getItem(LEGACY_POSITIONS_KEY) ||
    localStorage.getItem(WATCHLIST_KEY)
  )
}
