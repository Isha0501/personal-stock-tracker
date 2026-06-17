import Papa from 'papaparse'
import type { Portfolio, Position, WatchlistItem, Transaction, TransactionType } from './types'

function cleanNumber(val: string | undefined | null): number {
  if (!val || val === '--') return 0
  return parseFloat(val.replace(/[$,%+\s]/g, '').replace(/,/g, '')) || 0
}

function findCol(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const match = keys.find(k => k.toLowerCase().includes(c.toLowerCase()))
    if (match !== undefined) return row[match]
  }
  return undefined
}

function isValidTicker(sym: string): boolean {
  if (!sym || sym.length === 0 || sym.length > 10) return false
  if (sym.includes(' ')) return false
  return /^[A-Z0-9.$^-]+$/i.test(sym)
}

function isCashRow(sym: string): boolean {
  return sym.toUpperCase().startsWith('SPAXX') || sym.toUpperCase().startsWith('FDRXX')
}

// Fidelity account numbers are short alphanumeric strings (e.g. "Z36475858", "257953984")
function isValidAccountNumber(acct: string): boolean {
  return acct.length > 0 && acct.length <= 20 && /^[A-Z0-9]+$/i.test(acct)
}

// ─── Positions CSV → Portfolio[] ────────────────────────────────────────────
// Fidelity exports all accounts into one file. We auto-split by Account Number.
export function parsePortfoliosCSV(content: string): Portfolio[] {
  const lines = content.split('\n')
  // Find the header row — it has both "Symbol" and "Account Number"
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('symbol') && l.toLowerCase().includes('account')
  )
  if (headerIdx === -1) return []

  const trimmed = lines.slice(headerIdx).join('\n')
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^"|"$/g, ''),
    transform: v => v.trim().replace(/^"|"$/g, ''),
  })

  // Group rows by Account Number
  const accountMap = new Map<string, {
    name: string
    cashBalance: number
    positions: Position[]
  }>()

  for (const row of result.data) {
    const accountNum = (findCol(row, ['Account Number']) ?? '').trim()
    const accountName = (findCol(row, ['Account Name']) ?? '').trim()
    const rawSym = (findCol(row, ['Symbol']) ?? '').trim().replace(/\*+$/, '').toUpperCase()

    if (!isValidAccountNumber(accountNum)) continue

    if (!accountMap.has(accountNum)) {
      accountMap.set(accountNum, { name: accountName, cashBalance: 0, positions: [] })
    }

    const account = accountMap.get(accountNum)!

    // Cash / money market rows
    if (isCashRow(rawSym) || !rawSym) {
      const cashVal = cleanNumber(findCol(row, ['Current Value']))
      account.cashBalance += cashVal
      continue
    }

    if (!isValidTicker(rawSym)) continue

    account.positions.push({
      symbol: rawSym,
      description: findCol(row, ['Description', 'Name']) ?? '',
      quantity: cleanNumber(findCol(row, ['Quantity', 'Shares'])),
      lastPrice: cleanNumber(findCol(row, ['Last Price'])),
      lastPriceChange: cleanNumber(findCol(row, ['Last Price Change'])),
      currentValue: cleanNumber(findCol(row, ['Current Value'])),
      todayGainDollar: cleanNumber(findCol(row, ["Today's Gain/Loss Dollar", "Today's G/L $"])),
      todayGainPercent: cleanNumber(findCol(row, ["Today's Gain/Loss Percent", "Today's G/L %"])),
      totalGainDollar: cleanNumber(findCol(row, ['Total Gain/Loss Dollar', 'Total G/L $'])),
      totalGainPercent: cleanNumber(findCol(row, ['Total Gain/Loss Percent', 'Total G/L %'])),
      percentOfAccount: cleanNumber(findCol(row, ['Percent Of Account', '% of Account'])),
      costBasisTotal: cleanNumber(findCol(row, ['Cost Basis Total', 'Cost Basis'])),
      avgCostBasis: cleanNumber(findCol(row, ['Average Cost Basis', 'Avg Cost'])),
      type: findCol(row, ['Type', 'Security Type']) ?? 'Stock',
    })
  }

  return Array.from(accountMap.entries()).map(([accountNumber, data]) => ({
    id: accountNumber,
    name: data.name,
    accountNumber,
    cashBalance: data.cashBalance,
    positions: data.positions,
  }))
}

// ─── Watchlist CSV ────────────────────────────────────────────────────────────
export function parseWatchlistCSV(content: string): WatchlistItem[] {
  const lines = content.split('\n')
  // Skip metadata rows — find the actual column header row (has Symbol + Description + Price)
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('symbol') && l.toLowerCase().includes('description') && l.toLowerCase().includes('price')
  )
  if (headerIdx === -1) return []

  const trimmed = lines.slice(headerIdx).join('\n')
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^"|"$/g, ''),
    transform: v => v.trim().replace(/^"|"$/g, ''),
  })

  return result.data
    .filter(row => {
      const sym = (findCol(row, ['Symbol']) ?? '').trim().toUpperCase()
      return isValidTicker(sym)
    })
    .map(row => ({
      symbol: (findCol(row, ['Symbol']) ?? '').trim().toUpperCase(),
      description: findCol(row, ['Description', 'Company', 'Name']) ?? '',
      lastPrice: cleanNumber(findCol(row, ['Last Price', 'Price'])),
      // Fidelity watchlist uses "Last Price Change" for the change $ column
      changeDollar: cleanNumber(findCol(row, ['Last Price Change', 'Change $', 'Chg $', 'Change Dollar'])),
      // "Today's Gain/Loss Percent" is the day change %
      changePercent: cleanNumber(findCol(row, ["Today's Gain/Loss Percent", 'Change %', '% Change', 'Chg %'])),
      volume: cleanNumber(findCol(row, ['Volume', 'Vol'])) || undefined,
      weekHigh52: cleanNumber(findCol(row, ['52-week High', '52 Week High', '52Wk High'])) || undefined,
      weekLow52: cleanNumber(findCol(row, ['52-week Low', '52 Week Low', '52Wk Low'])) || undefined,
      peRatio: cleanNumber(findCol(row, ['P/E Ratio', 'PE Ratio', 'P/E'])) || undefined,
      divYield: cleanNumber(findCol(row, ['Div/Yield', 'Dividend Yield', 'Yield'])) || undefined,
    }))
}

// ─── Account History CSV ──────────────────────────────────────────────────────
function detectTxType(action: string): TransactionType {
  const a = action.toUpperCase()
  if (a.includes('YOU BOUGHT') || a.includes('PERIODIC INVESTMENT') || a.includes('PROSPECTUS')) return 'BUY'
  if (a.includes('YOU SOLD')) return 'SELL'
  if (a.includes('DIVIDEND RECEIVED')) return 'DIVIDEND'
  if (a.includes('REINVESTMENT')) return 'REINVESTMENT'
  if (a.includes('ELECTRONIC FUNDS TRANSFER') || a.includes('EFT')) return 'DEPOSIT'
  if (a.includes('CASH CONTRIBUTION')) return 'CONTRIBUTION'
  if (a.includes('TRANSFERRED')) return 'TRANSFER'
  return 'OTHER'
}

export function parseAccountHistoryCSV(content: string): Transaction[] {
  const lines = content.split('\n')
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('run date') || (l.toLowerCase().includes('date') && l.toLowerCase().includes('action'))
  )
  if (headerIdx === -1) return []

  const trimmed = lines.slice(headerIdx).join('\n')
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^"|"$/g, '').replace(/\s*\(\$\)\s*/g, ''),
    transform: v => v.trim().replace(/^"|"$/g, ''),
  })

  return result.data
    .filter(row => {
      const date = findCol(row, ['Run Date', 'Date'])
      const action = findCol(row, ['Action'])
      return date && action && date.match(/\d+\/\d+\/\d+/)
    })
    .map(row => {
      const action = findCol(row, ['Action']) ?? ''
      const symbol = (findCol(row, ['Symbol']) ?? '').trim().toUpperCase()
      const qty = cleanNumber(findCol(row, ['Quantity']))
      const price = cleanNumber(findCol(row, ['Price']))
      const amount = cleanNumber(findCol(row, ['Amount']))

      return {
        date: findCol(row, ['Run Date', 'Date']) ?? '',
        accountName: findCol(row, ['Account']) ?? '',
        accountNumber: findCol(row, ['Account Number']) ?? '',
        type: detectTxType(action),
        symbol: isValidTicker(symbol) ? symbol : '',
        description: findCol(row, ['Description']) ?? '',
        price,
        quantity: qty,
        amount,
        action,
      }
    })
    // sort newest first
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
