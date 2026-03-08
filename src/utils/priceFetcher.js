// Price fetching utility using Yahoo Finance via CORS proxy
// Cache prices in localStorage to avoid repeated requests

const PRICE_CACHE_KEY = 'trading_journal_price_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

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
  if (cache[key]) {
    const { timestamp, price } = cache[key]
    if (Date.now() - timestamp < CACHE_DURATION) {
      return price
    }
  }
  return null
}

function setCachedPrice(symbol, date, price) {
  const cache = getPriceCache()
  const key = `${symbol}_${date}`
  cache[key] = {
    timestamp: Date.now(),
    price
  }
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

    // Using yfinance-like query via a public API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${Math.floor(startDate.getTime()/1000)}&period2=${Math.floor(endDate.getTime()/1000)}&interval=1d`

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

// Clear price cache (useful for forcing refresh)
export function clearPriceCache() {
  localStorage.removeItem(PRICE_CACHE_KEY)
}
