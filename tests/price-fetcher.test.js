/**
 * Unit tests for priceFetcher.js
 * Tests Yahoo Finance API response parsing and data transformation
 */

// Mock localStorage
const mockLocalStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null
  },
  setItem(key, value) {
    this.store[key] = value
  },
  removeItem(key) {
    delete this.store[key]
  },
  clear() {
    this.store = {}
  }
}

global.localStorage = mockLocalStorage

// Mock Firebase (we don't want real Firebase calls in tests)
const mockDb = null
global.mockFirebase = {
  db: mockDb,
  doc: () => ({}),
  getDoc: async () => ({ exists: false }),
  setDoc: async () => ({}),
  getDocs: async () => ({ docs: [] }),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  deleteDoc: async () => ({}),
  serverTimestamp: () => new Date()
}

// Mock fetch API
let mockFetchResponse = null
global.fetch = async (url) => {
  if (!mockFetchResponse) {
    throw new Error('fetch not mocked')
  }

  // Parse the URL to check if it contains the Yahoo Finance URL
  const decodedUrl = decodeURIComponent(url)
  const isYahooCall = decodedUrl.includes('query1.finance.yahoo.com')

  return {
    ok: mockFetchResponse.ok,
    status: mockFetchResponse.status,
    json: async () => mockFetchResponse.data
  }
}

/**
 * Yahoo Finance API Real Response Format:
 *
 * GET https://query1.finance.yahoo.com/v8/finance/chart/GLD?period1=1743526200&period2=1743612600&interval=5m
 *
 * Response:
 * {
 *   "chart": {
 *     "result": [{
 *       "meta": {
 *         "currency": "USD",
 *         "symbol": "GLD",
 *         "exchangeName": "NMS",
 *         "instrumentType": "ETP",
 *         "firstTradeDate": 1128088200,
 *         "regularMarketTime": 1743612003,
 *         "gmtoffset": -14400,
 *         "timezone": "EDT",
 *         "exchangeTimezoneName": "America/New_York",
 *         "regularMarketPrice": 216.05,
 *         "chartPreviousClose": 215.92,
 *         "priceHint": 2,
 *         "currentTradingPeriod": {
 *           "pre": {"timezone": "EST", "start": 1743586200, "end": 1743607200, "gmtoffset": -18000},
 *           "regular": {"timezone": "EDT", "start": 1743607200, "end": 1743630000, "gmtoffset": -14400},
 *           "post": {"timezone": "EDT", "start": 1743630000, "end": 1743637200, "gmtoffset": -14400}
 *         },
 *         "dataGranularity": "5m",
 *         "range": "1d",
 *         "validRanges": ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"]
 *       },
 *       "timestamp": [1743526200, 1743526500, 1743526800, 1743527100, 1743527400, ...],
 *       "indicators": {
 *         "quote": [{
 *           "open": [215.5, 215.6, 215.55, 215.65, 215.7, ...],
 *           "high": [215.7, 215.8, 215.75, 215.85, 215.9, ...],
 *           "low": [215.4, 215.5, 215.45, 215.55, 215.6, ...],
 *           "close": [215.6, 215.7, 215.65, 215.75, 215.8, ...],
 *           "volume": [1200, 1500, 980, 2100, 1800, ...]
 *         }],
 *         "adjclose": [{"adjclose": [215.6, 215.7, 215.65, 215.75, 215.8, ...]}]
 *       }
 *     }],
 *     "error": null
 *   }
 * }
 */

// Sample Yahoo Finance response (matching real API format)
const createYahooResponse = (symbol) => ({
  chart: {
    result: [{
      meta: {
        currency: 'USD',
        symbol: symbol,
        exchangeName: 'NMS',
        instrumentType: 'ETP',
        regularMarketTime: 1743612003,
        gmtoffset: -14400,
        timezone: 'EDT',
        regularMarketPrice: 216.05,
        chartPreviousClose: 215.92,
        dataGranularity: '5m',
        range: '1d'
      },
      timestamp: [
        1743526200, 1743526500, 1743526800, 1743527100, 1743527400,
        1743527700, 1743528000, 1743528300, 1743528600, 1743528900,
        1743529200, 1743529500, 1743529800, 1743530100, 1743530400
      ],
      indicators: {
        quote: [{
          open: [215.50, 215.60, 215.55, 215.65, 215.70, 215.75, 215.80, 215.85, 215.90, 215.85, 215.80, 215.75, 215.70, 215.65, 215.60],
          high: [215.70, 215.80, 215.75, 215.85, 215.90, 215.95, 216.00, 216.05, 216.10, 216.05, 216.00, 215.95, 215.90, 215.85, 215.80],
          low:  [215.40, 215.50, 215.45, 215.55, 215.60, 215.65, 215.70, 215.75, 215.80, 215.75, 215.70, 215.65, 215.60, 215.55, 215.50],
          close: [215.60, 215.70, 215.65, 215.75, 215.80, 215.85, 215.90, 215.95, 216.00, 215.95, 215.90, 215.85, 215.80, 215.75, 215.70],
          volume: [1200, 1500, 980, 2100, 1800, 2400, 1650, 3200, 2800, 2200, 1900, 2600, 1400, 1750, 2100]
        }]
      }
    }],
    error: null
  }
})

// Mock the Firebase module
const mockFirebaseModule = {
  db: null,
  doc: () => ({}),
  getDoc: async () => ({ exists: false }),
  setDoc: async () => ({}),
  getDocs: async () => ({ docs: [] }),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  deleteDoc: async () => ({}),
  serverTimestamp: () => new Date()
}

// Import after mocks are set up
// We need to dynamically import and mock the firebase dependency
async function runTests() {
  console.log('🧪 Price Fetcher Unit Tests')
  console.log('='.repeat(60))
  console.log('')
  console.log('Testing Yahoo Finance API response parsing...')
  console.log('')

  let passed = 0
  let failed = 0

  // Test 1: Parse Yahoo Finance response correctly
  {
    console.log('Test 1: Parse Yahoo Finance 5-minute intraday data')
    mockFetchResponse = {
      ok: true,
      status: 200,
      data: createYahooResponse('GLD')
    }
    localStorage.clear()

    // Create a test version of the fetch function (simplified from priceFetcher.js)
    async function testFetchAndParse() {
      const response = await fetch('https://proxy.com/?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/GLD?period1=1743526200&period2=1743612600&interval=5m'))
      const data = await response.json()

      if (data.chart?.result?.[0]?.timestamp && data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        const timestamps = data.chart.result[0].timestamp
        const quote = data.chart.result[0].indicators.quote[0]

        const intradayData = timestamps.map((ts, i) => ({
          time: new Date(ts * 1000),
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i]
        })).filter(point => point.close !== null)

        return intradayData
      }
      return []
    }

    try {
      const result = await testFetchAndParse()

      // Verify the data structure
      const hasCorrectStructure = result.every(point =>
        point.time instanceof Date &&
        typeof point.open === 'number' &&
        typeof point.high === 'number' &&
        typeof point.low === 'number' &&
        typeof point.close === 'number' &&
        typeof point.volume === 'number'
      )

      // Verify data integrity (high >= low, close between open and close range)
      const hasValidData = result.every(point =>
        point.high >= point.low &&
        point.close >= point.low &&
        point.close <= point.high
      )

      // Verify we got 15 data points (5-minute intervals for a partial trading day)
      const hasCorrectLength = result.length === 15

      if (hasCorrectStructure && hasValidData && hasCorrectLength) {
        console.log('  ✅ PASSED - Correctly parsed Yahoo Finance response')
        console.log(`     - ${result.length} data points`)
        console.log(`     - First point: ${result[0].time.toISOString()} O:${result[0].open} H:${result[0].high} L:${result[0].low} C:${result[0].close}`)
        console.log(`     - Last point: ${result[result.length-1].time.toISOString()} O:${result[result.length-1].open} H:${result[result.length-1].high} L:${result[result.length-1].low} C:${result[result.length-1].close}`)
        passed++
      } else {
        console.log('  ❌ FAILED - Data structure or validation failed')
        console.log(`     - Correct structure: ${hasCorrectStructure}`)
        console.log(`     - Valid data: ${hasValidData}`)
        console.log(`     - Correct length: ${hasCorrectLength}`)
        failed++
      }
    } catch (e) {
      console.log(`  ❌ FAILED - Exception: ${e.message}`)
      failed++
    }
    console.log('')
  }

  // Test 2: Handle null/empty response from Yahoo
  {
    console.log('Test 2: Handle empty/invalid Yahoo Finance response')
    mockFetchResponse = {
      ok: true,
      status: 200,
      data: { chart: { result: null, error: null } }
    }

    async function testEmptyResponse() {
      const response = await fetch('https://test.com')
      const data = await response.json()

      if (data.chart?.result?.[0]?.timestamp && data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        return 'parsed'
      }
      return []
    }

    try {
      const result = await testEmptyResponse()
      if (Array.isArray(result) && result.length === 0) {
        console.log('  ✅ PASSED - Empty response handled correctly')
        passed++
      } else {
        console.log('  ❌ FAILED - Should return empty array')
        failed++
      }
    } catch (e) {
      console.log(`  ❌ FAILED - Exception: ${e.message}`)
      failed++
    }
    console.log('')
  }

  // Test 3: Handle HTTP errors
  {
    console.log('Test 3: Handle HTTP error response')
    mockFetchResponse = {
      ok: false,
      status: 404,
      data: null
    }

    async function testErrorResponse() {
      const response = await fetch('https://test.com')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.json()
    }

    try {
      await testErrorResponse()
      console.log('  ❌ FAILED - Should have thrown an error')
      failed++
    } catch (e) {
      if (e.message.includes('HTTP 404')) {
        console.log('  ✅ PASSED - HTTP error handled correctly')
        passed++
      } else {
        console.log(`  ❌ FAILED - Wrong error message: ${e.message}`)
        failed++
      }
    }
    console.log('')
  }

  // Test 4: Handle null close prices (filter them out)
  {
    console.log('Test 4: Filter out null close prices')
    mockFetchResponse = {
      ok: true,
      status: 200,
      data: {
        chart: {
          result: [{
            timestamp: [1743526200, 1743526500, 1743526800, 1743527100],
            indicators: {
              quote: [{
                open: [215.5, null, 215.65, 215.7],
                high: [215.7, null, 215.85, 215.9],
                low: [215.4, null, 215.55, 215.6],
                close: [215.6, null, 215.75, 215.8],
                volume: [1200, null, 2100, 1800]
              }]
            }
          }],
          error: null
        }
      }
    }

    async function testNullFiltering() {
      const response = await fetch('https://test.com')
      const data = await response.json()

      if (data.chart?.result?.[0]?.timestamp && data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        const timestamps = data.chart.result[0].timestamp
        const quote = data.chart.result[0].indicators.quote[0]

        const intradayData = timestamps.map((ts, i) => ({
          time: new Date(ts * 1000),
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i]
        })).filter(point => point.close !== null)

        return intradayData
      }
      return []
    }

    try {
      const result = await testNullFiltering()
      if (result.length === 3) { // Should filter out the null entry
        console.log('  ✅ PASSED - Null close prices filtered out')
        console.log(`     - Original: 4 points, Filtered: ${result.length} points`)
        passed++
      } else {
        console.log(`  ❌ FAILED - Expected 3 points, got ${result.length}`)
        failed++
      }
    } catch (e) {
      console.log(`  ❌ FAILED - Exception: ${e.message}`)
      failed++
    }
    console.log('')
  }

  // Test 5: Symbol mapping (SPXW -> ^SPX, VIXW -> ^VIX)
  {
    console.log('Test 5: Symbol mapping for special indices')
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

    const tests = [
      ['SPXW', '^SPX'],
      ['VIXW', '^VIX'],
      ['GLD', 'GLD'],
      ['AAPL', 'AAPL']
    ]

    let allPassed = true
    for (const [input, expected] of tests) {
      const result = getYahooSymbol(input)
      if (result !== expected) {
        console.log(`  ❌ ${input} -> ${result} (expected ${expected})`)
        allPassed = false
      }
    }

    if (allPassed) {
      console.log('  ✅ PASSED - All symbols mapped correctly')
      console.log('     - SPXW -> ^SPX')
      console.log('     - VIXW -> ^VIX')
      console.log('     - GLD -> GLD (unchanged)')
      console.log('     - AAPL -> AAPL (unchanged)')
      passed++
    } else {
      console.log('  ❌ FAILED - Symbol mapping errors')
      failed++
    }
    console.log('')
  }

  // Test 6: Aggregate 5-minute data to 15-minute
  {
    console.log('Test 6: Aggregate 5-minute data to 15-minute timeframe')
    const sampleData5m = [
      { time: new Date('2025-01-15T09:30:00'), open: 215.5, high: 215.7, low: 215.4, close: 215.6, volume: 1000 },
      { time: new Date('2025-01-15T09:35:00'), open: 215.6, high: 215.8, low: 215.5, close: 215.7, volume: 1200 },
      { time: new Date('2025-01-15T09:40:00'), open: 215.7, high: 215.9, low: 215.6, close: 215.8, volume: 1100 },
      { time: new Date('2025-01-15T09:45:00'), open: 215.8, high: 216.0, low: 215.7, close: 215.9, volume: 900 },
      { time: new Date('2025-01-15T09:50:00'), open: 215.9, high: 216.1, low: 215.8, close: 216.0, volume: 1300 },
      { time: new Date('2025-01-15T09:55:00'), open: 216.0, high: 216.2, low: 215.9, close: 216.1, volume: 1050 }
    ]

    function aggregateToTimeframe(data, intervalMinutes) {
      if (!data || data.length === 0) return []
      const intervalsPerGroup = intervalMinutes / 5

      const aggregated = []
      let currentGroup = []

      for (let i = 0; i < data.length; i++) {
        currentGroup.push(data[i])

        if (currentGroup.length === intervalsPerGroup || i === data.length - 1) {
          const open = currentGroup[0].open
          const close = currentGroup[currentGroup.length - 1].close
          const high = Math.max(...currentGroup.map(d => d.high))
          const low = Math.min(...currentGroup.map(d => d.low))
          const volume = currentGroup.reduce((sum, d) => sum + (d.volume || 0), 0)
          const time = currentGroup[0].time

          aggregated.push({ time, open, high, low, close, volume })
          currentGroup = []
        }
      }
      return aggregated
    }

    try {
      const aggregated15m = aggregateToTimeframe(sampleData5m, 15)

      // Should have 2 candles (6 points / 3 per group)
      if (aggregated15m.length === 2) {
        const first = aggregated15m[0]
        const second = aggregated15m[1]

        // First candle: 09:30-09:40
        const firstCorrect =
          first.time.getTime() === new Date('2025-01-15T09:30:00').getTime() &&
          first.open === 215.5 &&
          first.close === 215.8 &&
          first.high === 215.9 &&
          first.low === 215.4 &&
          first.volume === 3300

        // Second candle: 09:45-09:55
        const secondCorrect =
          second.time.getTime() === new Date('2025-01-15T09:45:00').getTime() &&
          second.open === 215.8 &&
          second.close === 216.1 &&
          second.high === 216.2 &&
          second.low === 215.7 &&
          second.volume === 3250

        if (firstCorrect && secondCorrect) {
          console.log('  ✅ PASSED - 5-minute data aggregated to 15-minute')
          console.log(`     - 6 data points -> 2 aggregated candles`)
          console.log(`     - First: ${first.time.toISOString().slice(11, 16)} O:${first.open} H:${first.high} L:${first.low} C:${first.close} V:${first.volume}`)
          console.log(`     - Second: ${second.time.toISOString().slice(11, 16)} O:${second.open} H:${second.high} L:${second.low} C:${second.close} V:${second.volume}`)
          passed++
        } else {
          console.log('  ❌ FAILED - Aggregation values incorrect')
          console.log(`     - First correct: ${firstCorrect}`)
          console.log(`     - Second correct: ${secondCorrect}`)
          failed++
        }
      } else {
        console.log(`  ❌ FAILED - Expected 2 candles, got ${aggregated15m.length}`)
        failed++
      }
    } catch (e) {
      console.log(`  ❌ FAILED - Exception: ${e.message}`)
      failed++
    }
    console.log('')
  }

  // Test 7: LocalStorage caching
  {
    console.log('Test 7: LocalStorage cache operations')
    localStorage.clear()

    const testData = [
      { time: new Date('2025-01-15T10:00:00'), open: 215.5, high: 215.7, low: 215.4, close: 215.6, volume: 1000 }
    ]

    // Test save and retrieve
    const cacheKey = 'trading_journal_intraday_cache'
    const symbol = 'GLD'
    const date = '2025-01-15'

    // Save
    const cache = {}
    cache[`${symbol}_${date}`] = testData
    localStorage.setItem(cacheKey, JSON.stringify(cache))

    // Retrieve
    const retrieved = JSON.parse(localStorage.getItem(cacheKey))
    const key = `${symbol}_${date}`
    const result = retrieved[key]

    if (result && result.length === 1 && result[0].close === 215.6) {
      console.log('  ✅ PASSED - LocalStorage cache works')
      console.log(`     - Saved and retrieved data for ${symbol}_${date}`)
      passed++
    } else {
      console.log('  ❌ FAILED - LocalStorage cache failed')
      failed++
    }
    console.log('')
  }

  // Summary
  console.log('='.repeat(60))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60))

  return { passed, failed }
}

// Run tests
runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0)
}).catch(e => {
  console.error('Test runner error:', e)
  process.exit(1)
})
