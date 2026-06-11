import type { Position, WatchlistItem } from './types'

const POSITIONS_KEY = 'pt_positions'
const WATCHLIST_KEY = 'pt_watchlist'
const LAST_UPDATED_KEY = 'pt_last_updated'

export function savePositions(positions: Position[]) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
  localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
}

export function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
}

export function loadPositions(): Position[] {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    return raw ? JSON.parse(raw) : []
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
  localStorage.removeItem(POSITIONS_KEY)
  localStorage.removeItem(WATCHLIST_KEY)
  localStorage.removeItem(LAST_UPDATED_KEY)
}

export function hasData(): boolean {
  return !!(localStorage.getItem(POSITIONS_KEY) || localStorage.getItem(WATCHLIST_KEY))
}
