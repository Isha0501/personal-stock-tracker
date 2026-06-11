import Papa from 'papaparse'
import type { Position, WatchlistItem } from './types'

function cleanNumber(val: string | undefined | null): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,%+]/g, '').replace(/,/g, '')) || 0
}

function findColumn(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const match = keys.find(k => k.toLowerCase().includes(c.toLowerCase()))
    if (match !== undefined) return row[match]
  }
  return undefined
}

export function parsePositionsCSV(content: string): Position[] {
  // Fidelity positions CSVs have metadata rows at top and bottom — find the header row
  const lines = content.split('\n')
  let headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('symbol') && l.toLowerCase().includes('quantity')
  )
  if (headerIdx === -1) headerIdx = 0
  const trimmed = lines.slice(headerIdx).join('\n')

  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^"|"$/g, ''),
    transform: v => v.trim().replace(/^"|"$/g, ''),
  })

  return result.data
    .filter(row => {
      const sym = findColumn(row, ['Symbol'])
      return sym && sym.length > 0 && sym !== 'Symbol' && !sym.startsWith('--')
    })
    .map(row => ({
      symbol: (findColumn(row, ['Symbol']) ?? '').toUpperCase(),
      description: findColumn(row, ['Description', 'Name']) ?? '',
      quantity: cleanNumber(findColumn(row, ['Quantity', 'Shares'])),
      lastPrice: cleanNumber(findColumn(row, ['Last Price'])),
      lastPriceChange: cleanNumber(findColumn(row, ['Last Price Change'])),
      currentValue: cleanNumber(findColumn(row, ['Current Value'])),
      todayGainDollar: cleanNumber(findColumn(row, ["Today's Gain/Loss Dollar", "Today's G/L $", "Day Gain"])),
      todayGainPercent: cleanNumber(findColumn(row, ["Today's Gain/Loss Percent", "Today's G/L %", "Day Gain %"])),
      totalGainDollar: cleanNumber(findColumn(row, ['Total Gain/Loss Dollar', 'Total G/L $', 'Total Gain'])),
      totalGainPercent: cleanNumber(findColumn(row, ['Total Gain/Loss Percent', 'Total G/L %', 'Total Gain %'])),
      percentOfAccount: cleanNumber(findColumn(row, ['Percent Of Account', '% of Account'])),
      costBasisTotal: cleanNumber(findColumn(row, ['Cost Basis Total', 'Total Cost', 'Cost Basis'])),
      avgCostBasis: cleanNumber(findColumn(row, ['Average Cost Basis', 'Avg Cost', 'Average Cost'])),
      type: findColumn(row, ['Type', 'Security Type']) ?? 'Stock',
    }))
}

export function parseWatchlistCSV(content: string): WatchlistItem[] {
  const lines = content.split('\n')
  let headerIdx = lines.findIndex(l => l.toLowerCase().includes('symbol'))
  if (headerIdx === -1) headerIdx = 0
  const trimmed = lines.slice(headerIdx).join('\n')

  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^"|"$/g, ''),
    transform: v => v.trim().replace(/^"|"$/g, ''),
  })

  return result.data
    .filter(row => {
      const sym = findColumn(row, ['Symbol'])
      return sym && sym.length > 0 && sym !== 'Symbol' && !sym.startsWith('--')
    })
    .map(row => ({
      symbol: (findColumn(row, ['Symbol']) ?? '').toUpperCase(),
      description: findColumn(row, ['Description', 'Company', 'Name', 'Security Name']) ?? '',
      lastPrice: cleanNumber(findColumn(row, ['Last Price', 'Price'])),
      changeDollar: cleanNumber(findColumn(row, ['Change $', 'Change Dollar', 'Change', 'Chg $'])),
      changePercent: cleanNumber(findColumn(row, ['Change %', 'Change Percent', '% Change', 'Chg %'])),
      volume: cleanNumber(findColumn(row, ['Volume', 'Vol'])),
      weekHigh52: cleanNumber(findColumn(row, ['52 Week High', '52-Week High', '52Wk High'])),
      weekLow52: cleanNumber(findColumn(row, ['52 Week Low', '52-Week Low', '52Wk Low'])),
      peRatio: cleanNumber(findColumn(row, ['P/E Ratio', 'PE Ratio', 'P/E'])),
      divYield: cleanNumber(findColumn(row, ['Div/Yield', 'Dividend Yield', 'Yield'])),
    }))
}
