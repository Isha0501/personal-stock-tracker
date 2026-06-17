'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Transaction, TransactionType } from '@/lib/types'
import { fmt$$, calcRealizedPnL, gainColor, cn } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
}

const TYPE_LABELS: Record<TransactionType, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  DIVIDEND: 'Dividend',
  REINVESTMENT: 'Reinvest',
  DEPOSIT: 'Deposit',
  CONTRIBUTION: 'Contribution',
  TRANSFER: 'Transfer',
  OTHER: 'Other',
}

const TYPE_COLORS: Record<TransactionType, string> = {
  BUY: 'bg-accent-blue/15 text-accent-blue',
  SELL: 'bg-gain/15 text-gain',
  DIVIDEND: 'bg-accent-purple/15 text-accent-purple',
  REINVESTMENT: 'bg-accent-purple/10 text-accent-purple',
  DEPOSIT: 'bg-zinc-700/50 text-zinc-300',
  CONTRIBUTION: 'bg-zinc-700/50 text-zinc-300',
  TRANSFER: 'bg-zinc-700/50 text-zinc-400',
  OTHER: 'bg-zinc-800/50 text-zinc-500',
}

const ALL_TYPES: TransactionType[] = ['BUY', 'SELL', 'DIVIDEND', 'REINVESTMENT', 'DEPOSIT', 'CONTRIBUTION', 'TRANSFER']

export default function TransactionHistory({ transactions }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [accountFilter, setAccountFilter] = useState<string>('ALL')

  const accounts = useMemo(() => {
    const names = new Set(transactions.map(t => t.accountName).filter(Boolean))
    return Array.from(names)
  }, [transactions])

  // Pre-compute realized P&L for all sell transactions
  const realizedPnLMap = useMemo(() => {
    const sellTxs = transactions.filter(t => t.type === 'SELL' && t.symbol)
    const map = new Map<string, number>()
    for (const tx of sellTxs) {
      const key = `${tx.symbol}-${tx.accountNumber}-${tx.date}`
      const pnl = calcRealizedPnL(transactions, tx.symbol, tx.accountNumber)
      map.set(key, pnl)
    }
    return map
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false
      if (accountFilter !== 'ALL' && t.accountName !== accountFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return t.symbol.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.accountName.toLowerCase().includes(q)
      }
      return true
    })
  }, [transactions, typeFilter, accountFilter, search])

  // Summary stats for filtered view
  const totalBought = filtered.filter(t => t.type === 'BUY' || t.type === 'REINVESTMENT')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalDividends = filtered.filter(t => t.type === 'DIVIDEND')
    .reduce((s, t) => s + t.amount, 0)
  const totalDeposits = filtered.filter(t => t.type === 'DEPOSIT' || t.type === 'CONTRIBUTION')
    .reduce((s, t) => s + t.amount, 0)

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
        <p className="text-sm">No transaction history loaded</p>
        <p className="text-xs">Upload your account history CSV on the upload screen</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-3 bg-surface-1 flex-wrap flex-shrink-0">
        {/* Account filter */}
        <select
          value={accountFilter}
          onChange={e => setAccountFilter(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-accent-blue/50"
        >
          <option value="ALL">All Accounts</option>
          {accounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Type filter pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              typeFilter === 'ALL' ? 'bg-surface-4 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
          >
            All
          </button>
          {ALL_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'ALL' : t)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                typeFilter === t ? 'bg-surface-4 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-[240px] ml-auto">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol, name…"
            className="w-full bg-surface-2 border border-surface-4 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-6 px-5 py-3 border-b border-surface-3 bg-surface-1 text-xs flex-shrink-0 flex-wrap">
        <span className="text-zinc-500">{filtered.length} transactions</span>
        <span className="text-zinc-500">Invested: <span className="text-zinc-300">{fmt$$(totalBought)}</span></span>
        <span className="text-zinc-500">Dividends: <span className="text-gain">{fmt$$(totalDividends)}</span></span>
        <span className="text-zinc-500">Deposits: <span className="text-zinc-300">{fmt$$(totalDeposits)}</span></span>
      </div>

      {/* Transaction table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-2 z-10">
            <tr className="text-zinc-500 text-left">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Symbol</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium text-right">Qty</th>
              <th className="px-4 py-2.5 font-medium text-right">Price</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium text-right">Realized P&L</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => {
              const pnlKey = `${tx.symbol}-${tx.accountNumber}-${tx.date}`
              const realizedPnL = tx.type === 'SELL' && tx.symbol ? realizedPnLMap.get(pnlKey) : undefined
              const amountIsPositive = tx.amount > 0

              return (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-surface-3 transition-colors hover:bg-surface-2',
                    i % 2 === 0 ? 'bg-surface-1' : 'bg-surface-base'
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-400 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{tx.accountName}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[tx.type])}>
                      {TYPE_LABELS[tx.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-zinc-200">
                    {tx.symbol || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 max-w-[200px] truncate">{tx.description}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-400">
                    {tx.quantity !== 0 ? Math.abs(tx.quantity).toFixed(3) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-300">
                    {tx.price > 0 ? fmt$$(tx.price) : '—'}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono', amountIsPositive ? 'text-gain' : 'text-zinc-300')}>
                    {tx.amount !== 0 ? (amountIsPositive ? '+' : '') + fmt$$(tx.amount) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {realizedPnL !== undefined ? (
                      <span className={gainColor(realizedPnL)}>
                        {realizedPnL >= 0 ? '+' : ''}{fmt$$(realizedPnL)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
