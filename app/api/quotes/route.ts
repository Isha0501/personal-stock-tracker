import { NextRequest, NextResponse } from 'next/server'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json',
}

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 60 } })
  if (!res.ok) return null
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) return null
  return meta
}

async function fetchSummary(symbol: string) {
  const modules = 'price,summaryDetail,defaultKeyStatistics,assetProfile'
  const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=${modules}`
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 300 } })
  if (!res.ok) return null
  const json = await res.json()
  return json?.quoteSummary?.result?.[0] ?? null
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols')
  if (!symbols) return NextResponse.json({ error: 'symbols required' }, { status: 400 })

  const list = symbols.split(',').map(s => s.trim()).filter(Boolean)

  const results = await Promise.allSettled(
    list.map(async sym => {
      const [meta, summary] = await Promise.allSettled([fetchQuote(sym), fetchSummary(sym)])
      const m = meta.status === 'fulfilled' ? meta.value : null
      const s = summary.status === 'fulfilled' ? summary.value : null

      return {
        symbol: sym,
        price: m?.regularMarketPrice ?? null,
        change: m?.regularMarketPrice != null && m?.chartPreviousClose != null
          ? m.regularMarketPrice - m.chartPreviousClose : null,
        changePercent: m?.regularMarketPrice != null && m?.chartPreviousClose != null && m.chartPreviousClose !== 0
          ? ((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 100 : null,
        previousClose: m?.chartPreviousClose ?? null,
        dayHigh: m?.regularMarketDayHigh ?? null,
        dayLow: m?.regularMarketDayLow ?? null,
        open: m?.regularMarketOpen ?? null,
        volume: m?.regularMarketVolume ?? null,
        shortName: m?.shortName ?? sym,
        longName: m?.longName ?? null,
        weekHigh52: m?.fiftyTwoWeekHigh ?? null,
        weekLow52: m?.fiftyTwoWeekLow ?? null,
        marketCap: s?.price?.marketCap?.raw ?? null,
        peRatio: s?.summaryDetail?.trailingPE?.raw ?? null,
        forwardPE: s?.summaryDetail?.forwardPE?.raw ?? null,
        avgVolume: s?.summaryDetail?.averageVolume?.raw ?? null,
        dividendYield: s?.summaryDetail?.dividendYield?.raw != null
          ? s.summaryDetail.dividendYield.raw * 100 : null,
        beta: s?.summaryDetail?.beta?.raw ?? null,
        eps: s?.defaultKeyStatistics?.trailingEps?.raw ?? null,
        sector: s?.assetProfile?.sector ?? null,
        industry: s?.assetProfile?.industry ?? null,
      }
    })
  )

  const data: Record<string, unknown> = {}
  results.forEach((r, i) => {
    data[list[i]] = r.status === 'fulfilled' ? r.value : null
  })

  return NextResponse.json(data)
}
