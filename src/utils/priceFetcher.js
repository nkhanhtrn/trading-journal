// Price fetching utility for Yahoo Finance
// Requires a CORS proxy URL to be configured in settings

// Symbol mapping for special cases
const SYMBOL_MAP = {
  'VIXW': '^VIX',
  'SPXW': '^SPX',
  'XSP': '^SPX',
  'VIX': '^VIX',
  'SPX': '^SPX',
  'NDX': '^NDX',
  'RUT': '^RUT'
}

function getYahooSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol
}

// Intraday price cache key
const INTRADAY_CACHE_KEY = 'trading_journal_intraday_cache'

function getIntradayCache() {
  try {
    const cached = localStorage.getItem(INTRADAY_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.error('Error reading intraday cache:', e)
  }
  return {}
}

function saveIntradayCache(cache) {
  try {
    localStorage.setItem(INTRADAY_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('Error saving intraday cache:', e)
  }
}

function getCachedIntraday(symbol, date) {
  const cache = getIntradayCache()
  const key = `${symbol}_${date}`
  if (cache[key] !== undefined) {
    // Convert time strings back to Date objects (localStorage serializes Dates)
    return cache[key].map(point => ({
      ...point,
      time: new Date(point.time)
    }))
  }
  return null
}

function setCachedIntraday(symbol, date, data) {
  const cache = getIntradayCache()
  cache[`${symbol}_${date}`] = data
  saveIntradayCache(cache)
}

// Fetch intraday prices for a symbol on a specific date (5-minute intervals)
// Requires proxyUrl from settings (format: https://proxy.com/?url={url})
export async function fetchIntradayPrices(symbol, date, proxyUrl) {
  let yahooSymbol = getYahooSymbol(symbol)

  if (!yahooSymbol) {
    return []
  }

  // Check cache first
  const cached = getCachedIntraday(yahooSymbol, date)
  if (cached !== null) {
    return cached
  }

  if (!proxyUrl?.trim()) {
    console.warn(`No proxy URL configured for intraday prices. Please set a proxy URL in Settings.`)
    return []
  }

  try {
    // Parse the date and get start/end timestamps (use market timezone: Eastern)
    // Market hours: 9:30 AM - 4:00 PM Eastern
    const startDate = new Date(date + 'T09:30:00-05:00') // 9:30 AM Eastern (EST)
    const endDate = new Date(date + 'T16:00:00-05:00')   // 4:00 PM Eastern (EST)

    // Use Yahoo Finance query via CORS proxy for 5m interval data
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=5m`

    // Use custom proxy URL from settings (replace {url} placeholder)
    const url = proxyUrl.trim().replace('{url}', encodeURIComponent(yahooUrl))

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.timestamp && data.chart?.result?.[0]?.indicators?.quote?.[0]) {
      const timestamps = data.chart.result[0].timestamp
      const quote = data.chart.result[0].indicators.quote[0]

      // Map to array of { time, open, high, low, close, volume }
      const intradayData = timestamps.map((ts, i) => ({
        time: new Date(ts * 1000),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i]
      })).filter(point => point.close !== null) // Filter out null values

      setCachedIntraday(yahooSymbol, date, intradayData)
      return intradayData
    }

    return []
  } catch (error) {
    console.error(`Error fetching intraday prices for ${yahooSymbol} on ${date}:`, error)
    return []
  }
}

// Aggregate 5-minute data to a larger timeframe
// intervalMinutes: 15, 30, or 60
export function aggregateToTimeframe(data, intervalMinutes) {
  if (!data || data.length === 0) return []

  const intervalsPerGroup = intervalMinutes / 5 // 5m is the base interval

  const aggregated = []
  let currentGroup = []

  for (let i = 0; i < data.length; i++) {
    currentGroup.push(data[i])

    // When we have enough intervals, or this is the last item, create a candle
    if (currentGroup.length === intervalsPerGroup || i === data.length - 1) {
      const open = currentGroup[0].open
      const close = currentGroup[currentGroup.length - 1].close
      const high = Math.max(...currentGroup.map(d => d.high))
      const low = Math.min(...currentGroup.map(d => d.low))
      const volume = currentGroup.reduce((sum, d) => sum + (d.volume || 0), 0)
      const time = currentGroup[0].time

      aggregated.push({
        time,
        open,
        high,
        low,
        close,
        volume
      })

      currentGroup = []
    }
  }

  return aggregated
}

// Clear intraday cache
export function clearIntradayCache() {
  localStorage.removeItem(INTRADAY_CACHE_KEY)
}
