// Price fetching utility with layered caching (localStorage -> Firestore -> Yahoo API)
// Requires a CORS proxy URL to be configured in settings

import { db } from './firebase.js'
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'

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

// Local storage keys
const INTRADAY_CACHE_KEY = 'trading_journal_intraday_cache'
const PRICE_CACHE_KEY = 'trading_journal_price_cache'

// ============================================================================
// LOCAL STORAGE CACHE
// ============================================================================

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

function getCachedIntradayFromLocal(symbol, date) {
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

function setCachedIntradayToLocal(symbol, date, data) {
  const cache = getIntradayCache()
  cache[`${symbol}_${date}`] = data
  saveIntradayCache(cache)
}

// ============================================================================
// FIRESTORE CACHE
// ============================================================================

// Get Firestore document path for market data
// Format: users/{userId}/market_data/{symbol}_{date}
function getMarketDataDoc(userId, symbol, date) {
  return doc(db, 'users', userId, 'market_data', `${symbol}_${date}`)
}

// Fetch intraday prices from Firestore cache
async function getCachedIntradayFromFirestore(userId, symbol, date) {
  if (!db || !userId) return null

  try {
    const docRef = getMarketDataDoc(userId, symbol, date)
    const snapshot = await getDoc(docRef)

    if (snapshot.exists()) {
      const data = snapshot.data()
      // Convert Firestore timestamps back to Dates
      return data.points.map(point => ({
        ...point,
        time: point.time.toDate ? point.time.toDate() : new Date(point.time)
      }))
    }
  } catch (e) {
    console.error('Error reading intraday from Firestore:', e)
  }
  return null
}

// Save intraday prices to Firestore cache
async function setCachedIntradayToFirestore(userId, symbol, date, data) {
  if (!db || !userId) return

  try {
    const docRef = getMarketDataDoc(userId, symbol, date)
    await setDoc(docRef, {
      points: data,
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('Error saving intraday to Firestore:', e)
  }
}

// Fetch all cached intraday data from Firestore for a user (for new device sync)
export async function syncIntradayFromFirestore(userId) {
  if (!db || !userId) return

  try {
    const collectionRef = collection(db, 'users', userId, 'market_data')
    const snapshot = await getDocs(collectionRef)

    const localCache = getIntradayCache()
    let syncedCount = 0

    for (const docSnapshot of snapshot.docs) {
      const key = docSnapshot.id
      const data = docSnapshot.data()

      // Document IDs are in format: SYMBOL_DATE (e.g., "GLD_2026-03-19")
      if (data.points) {
        // Convert dates and store locally
        const points = data.points.map(point => ({
          ...point,
          time: point.time.toDate ? point.time.toDate() : new Date(point.time)
        }))

        localCache[key] = points
        syncedCount++
      }
    }

    if (syncedCount > 0) {
      saveIntradayCache(localCache)
      console.log(`Synced ${syncedCount} intraday datasets from Firestore`)
    }
  } catch (e) {
    console.error('Error syncing intraday from Firestore:', e)
  }
}


// ============================================================================
// LAYERED CACHE FETCHING
// ============================================================================

// Fetch intraday prices with layered caching: Local -> Firestore -> Yahoo API
export async function fetchIntradayPrices(symbol, date, proxyUrl, userId) {
  let yahooSymbol = getYahooSymbol(symbol)

  if (!yahooSymbol) {
    return []
  }

  // Layer 1: Check localStorage cache (fastest)
  const localCached = getCachedIntradayFromLocal(yahooSymbol, date)
  if (localCached !== null) {
    console.log(`%c[Market Data] ${yahooSymbol} ${date} - from localStorage`, 'color: #10b981')
    return localCached
  }

  // Layer 2: Check Firestore cache (cloud backup)
  const firestoreCached = await getCachedIntradayFromFirestore(userId, yahooSymbol, date)
  if (firestoreCached !== null) {
    console.log(`%c[Market Data] ${yahooSymbol} ${date} - from Firestore`, 'color: #f59e0b')
    // Save to localStorage for future use
    setCachedIntradayToLocal(yahooSymbol, date, firestoreCached)
    return firestoreCached
  }

  // Layer 3: Fetch from Yahoo API
  console.log(`%c[Market Data] ${yahooSymbol} ${date} - fetching from Yahoo API`, 'color: #3b82f6')

  // Layer 3: Fetch from Yahoo API
  if (!proxyUrl?.trim()) {
    console.warn(`No proxy URL configured for intraday prices. Please set a proxy URL in Settings.`)
    return []
  }

  try {
    // Parse the date and get start/end timestamps (use market timezone: Eastern)
    // Market hours: 9:30 AM - 4:00 PM Eastern
    const startDate = new Date(date + 'T09:30:00') // 9:30 AM Eastern
    const endDate = new Date(date + 'T16:00:00')   // 4:00 PM Eastern

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

      // Save to both localStorage and Firestore
      setCachedIntradayToLocal(yahooSymbol, date, intradayData)
      await setCachedIntradayToFirestore(userId, yahooSymbol, date, intradayData)
      console.log(`%c[Market Data] ${yahooSymbol} ${date} - cached ${intradayData.length} points`, 'color: #8b5cf6')

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

// Clear intraday cache (both local and Firestore)
export async function clearIntradayCache(userId) {
  // Clear localStorage
  localStorage.removeItem(INTRADAY_CACHE_KEY)
  console.log('[Market Data] Cleared localStorage cache')

  // Clear Firestore cache
  if (db && userId) {
    try {
      const collectionRef = collection(db, 'users', userId, 'market_data')
      const snapshot = await getDocs(collectionRef)

      // Delete all documents in the batch
      const batch = []
      for (const docSnapshot of snapshot.docs) {
        batch.push(deleteDoc(docSnapshot.ref))
      }

      await Promise.all(batch)
      console.log(`[Market Data] Cleared ${batch.length} documents from Firestore`)
    } catch (e) {
      console.error('Error clearing Firestore cache:', e)
    }
  }
}
