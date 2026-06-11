import { NextRequest, NextResponse } from 'next/server'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json',
}

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '1W': { range: '5d', interval: '1d' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1wk' },
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  const rangeKey = req.nextUrl.searchParams.get('range') ?? '3M'

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { range, interval } = RANGE_MAP[rangeKey] ?? RANGE_MAP['3M']
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`

  try {
    const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 300 } })
    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 })

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return NextResponse.json([], { status: 200 })

    const timestamps: number[] = result.timestamp ?? []
    const ohlcv = result.indicators?.quote?.[0] ?? {}
    const opens: number[] = ohlcv.open ?? []
    const highs: number[] = ohlcv.high ?? []
    const lows: number[] = ohlcv.low ?? []
    const closes: number[] = ohlcv.close ?? []
    const volumes: number[] = ohlcv.volume ?? []

    const data = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: opens[i] ?? null,
        high: highs[i] ?? null,
        low: lows[i] ?? null,
        close: closes[i] ?? null,
        volume: volumes[i] ?? null,
      }))
      .filter(d => d.close !== null)

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
