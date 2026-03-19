// Price fetching utility using Yahoo Finance via CORS proxy
// Cache prices in localStorage to avoid repeated requests
// Historical prices are immutable, so cache never expires

const PRICE_CACHE_KEY = 'trading_journal_price_cache'

// Symbol mapping for special cases
const SYMBOL_MAP = {
  'VIXW': '^VIX',
  'SPXW': '^SPX',
  'VIX': '^VIX',
  'SPX': '^SPX',
  'NDX': '^NDX',
  'RUT': '^RUT'
}

function getYahooSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol
}

function getPriceCache() {
  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.error('Error reading price cache:', e)
  }
  return {}
}

function savePriceCache(cache) {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('Error saving price cache:', e)
  }
}

function getCachedPrice(symbol, date) {
  const cache = getPriceCache()
  const key = `${symbol}_${date}`
  if (cache[key] !== undefined) {
    return cache[key]
  }
  return null
}

function setCachedPrice(symbol, date, price) {
  const cache = getPriceCache()
  cache[`${symbol}_${date}`] = price
  savePriceCache(cache)
}

// Fetch historical price for a symbol on a specific date
export async function fetchHistoricalPrice(symbol, date) {
  const yahooSymbol = getYahooSymbol(symbol)

  // Check cache first
  const cached = getCachedPrice(yahooSymbol, date)
  if (cached !== null) {
    return cached
  }

  try {
    // Use Yahoo Finance query via CORS proxy
    // Format: YYYY-MM-DD
    const startDate = new Date(date)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 1)

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // Use CORS proxy for Yahoo Finance API
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${Math.floor(startDate.getTime()/1000)}&period2=${Math.floor(endDate.getTime()/1000)}&interval=1d`
    const url = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0]) {
      const price = data.chart.result[0].indicators.quote[0].close[0]
      setCachedPrice(yahooSymbol, date, price)
      return price
    }

    return null
  } catch (error) {
    console.error(`Error fetching price for ${yahooSymbol} on ${date}:`, error)
    return null
  }
}

// Batch fetch prices for multiple symbols/dates
export async function fetchPrices(trades) {
  const prices = {}
  const fetchPromises = []

  // Collect unique symbol/date pairs
  const pairs = new Set()

  trades.forEach(trade => {
    const symbol = getYahooSymbol(trade.symbol)
    if (trade.date) {
      pairs.add(`${symbol}|${trade.date}`)
    }
    if (trade.exit_date) {
      pairs.add(`${symbol}|${trade.exit_date}`)
    }
  })

  // Fetch all prices
  pairs.forEach(pair => {
    const [symbol, date] = pair.split('|')
    const key = `${symbol}_${date}`

    // Check cache first
    const cached = getCachedPrice(symbol, date)
    if (cached !== null) {
      prices[key] = cached
    } else {
      fetchPromises.push(
        fetchHistoricalPrice(symbol, date).then(price => {
          prices[key] = price
        })
      )
    }
  })

  await Promise.all(fetchPromises)
  return prices
}

// Intraday price cache key (separate from daily prices)
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
export async function fetchIntradayPrices(symbol, date) {
  // Use SPY as proxy for SPX/SPXW since Yahoo doesn't provide reliable intraday for indices
  let yahooSymbol = getYahooSymbol(symbol)
  if (yahooSymbol === '^SPX') {
    yahooSymbol = 'SPY' // Use SPY ETF as proxy for S&P 500 index
  } else if (yahooSymbol === '^VIX') {
    yahooSymbol = null // VIX intraday data not available, skip
  }

  if (!yahooSymbol) {
    return []
  }

  // Check cache first
  const cached = getCachedIntraday(yahooSymbol, date)
  if (cached !== null) {
    return cached
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
    const url = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`

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

// Clear price cache (useful for forcing refresh)
export function clearPriceCache() {
  localStorage.removeItem(PRICE_CACHE_KEY)
}

// Clear intraday cache
export function clearIntradayCache() {
  localStorage.removeItem(INTRADAY_CACHE_KEY)
}
