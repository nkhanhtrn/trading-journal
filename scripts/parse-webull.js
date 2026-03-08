// Modular CSV Parser for Webull Options
// Each strategy is categorized into its own array, then processed independently

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
// UTILITIES
// ============================================

function parseCsvRow(row) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current || null); current = '' }
    else { current += char }
  }
  result.push(current || null)
  return result
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split(' ')[0].split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  return dateStr
}

function compareDates(timeA, timeB) {
  const dateA = timeA ? new Date(timeA) : new Date(0)
  const dateB = timeB ? new Date(timeB) : new Date(0)
  return dateA.getTime() - dateB.getTime()
}

function parseOptionSymbol(symbol) {
  if (!symbol) return null
  const match = symbol.match(/^([A-Z]+)2?(\d{2})(\d{2})(\d{2})([CP])(\d+)$/)
  if (match) {
    const [, underlying, year, month, day, type, strike] = match
    return { underlying, year: `20${year}`, month, day, date: `20${year}-${month}-${day}`, type: type === 'C' ? 'call' : 'put', strike: parseInt(strike) / 1000 }
  }
  return null
}

// ============================================
// CATEGORIZATION
// Divide CSV rows into arrays for each strategy
// ============================================

const strategyBuckets = {
  vertical_spread: [],
  iron_condor: [],
  straddle: [],
  strangle: [],
  long_call: [],
  short_call: [],
  long_put: [],
  short_put: []
}

function categorizeRow(row) {
  const { name, symbol, side, status, filled } = row

  // Skip cancelled orders
  if (status !== 'Filled' || filled === 0) return null

  // Single options: when name equals symbol, it's a single option row (not a multi-leg header)
  if (name && symbol && name === symbol) {
    const opt = parseOptionSymbol(symbol)
    if (!opt) return null
    if (opt.type === 'call') return side === 'Buy' ? 'long_call' : 'short_call'
    else return side === 'Buy' ? 'long_put' : 'short_put'
  }

  // Multi-leg strategies (header row: has name, no symbol)
  if (name && !symbol) {
    const nameLower = name.toLowerCase()
    // Skip diagonal spreads - treat legs as individual single options
    if (nameLower.includes('diagonal')) return null
    if (nameLower.includes('vertical') || nameLower.includes('spread')) return 'vertical_spread'
    if (nameLower.includes('iron condor') || nameLower.includes('condor')) return 'iron_condor'
    if (nameLower.includes('straddle')) return 'straddle'
    if (nameLower.includes('strangle')) return 'strangle'
    return 'vertical_spread' // Default multi-leg to vertical
  }

  // Single options (has symbol, no name)
  if (symbol && !name) {
    const opt = parseOptionSymbol(symbol)
    if (!opt) return null
    if (opt.type === 'call') return side === 'Buy' ? 'long_call' : 'short_call'
    else return side === 'Buy' ? 'long_put' : 'short_put'
  }

  // Debug: check for GLD260302C00480000 buy transaction
  if (symbol === 'GLD260302C00480000' && side === 'Buy') {
    console.log(`  DEBUG BUY: name="${name}", symbol="${symbol}", side="${side}", status="${status}", filled=${filled}`)
  }

  return null
}

function categorizeAllRows(rows) {
  const categorized = { vertical_spread: [], iron_condor: [], straddle: [], strangle: [], long_call: [], short_call: [], long_put: [], short_put: [] }
  let currentHeader = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Single option: name equals symbol (standalone option, not a leg)
    if (row.name && row.symbol && row.name === row.symbol) {
      currentHeader = null // Reset header
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
      continue
    }

    // Header row (has name, no symbol)
    if (row.name && !row.symbol) {
      currentHeader = { ...row, legs: [] }
      const bucket = categorizeRow(row)
      // Skip diagonal headers - don't create a spread ticket
      if (bucket) {
        const nameLower = row.name.toLowerCase()
        if (!nameLower.includes('diagonal')) {
          categorized[bucket].push(currentHeader)
        }
      }
      // For diagonals, set currentHeader but don't add to categorized
      // This allows legs to be processed below as single options
      continue
    }

    // Leg row (has symbol, no name, and we have a header)
    if (row.symbol && !row.name && currentHeader) {
      // Check if this is part of a diagonal spread - if so, treat as single option
      const headerNameLower = currentHeader.name?.toLowerCase() || ''
      if (headerNameLower.includes('diagonal')) {
        // Diagonal legs are treated as independent single options
        currentHeader = null
        const bucket = categorizeRow(row)
        if (bucket) categorized[bucket].push(row)
        continue
      }
      currentHeader.legs.push(row)
      continue
    }

    // Single option (no header, has symbol)
    if (row.symbol && !row.name) {
      currentHeader = null // Reset header
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
    }
  }

  return categorized
}

// ============================================
// STRATEGY PARSING FUNCTIONS
// Each function takes its categorized array and returns tickets
// ============================================

// Vertical Spread Parser
function parseVerticalSpreads(verticalSpreadArray, startTicketId) {
  const tradesData = []

  for (const header of verticalSpreadArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 2) {
      tradesData.push({
        ticketName: header.name,
        side: header.side,
        status: header.status,
        filledTime: header.filledTime,
        legs: parsedLegs
      })
    }
  }

  return matchMultiLeg(tradesData, startTicketId)
}

// Iron Condor Parser
function parseIronCondors(ironCondorArray, startTicketId) {
  console.log(`  Iron Condors: ${ironCondorArray.length} headers (not yet implemented)`)
  return []
}

// Straddle Parser
function parseStraddles(straddleArray, startTicketId) {
  console.log(`  Straddles: ${straddleArray.length} headers (not yet implemented)`)
  return []
}

// Strangle Parser
function parseStrangles(strangleArray, startTicketId) {
  console.log(`  Strangles: ${strangleArray.length} headers (not yet implemented)`)
  return []
}

// Generate readable name for single option (same for long/short of same option)
function generateSingleOptionName(opt) {
  const capitalType = opt.type.charAt(0).toUpperCase() + opt.type.slice(1)
  // Include expiry month to distinguish same strike/different expiry
  const expiryMonth = opt.date.substring(5, 7) + '/' + opt.date.substring(8, 10)
  return `${opt.underlying} ${capitalType} $${opt.strike} ${expiryMonth}`
}

// Generate readable name for multi-leg strategy
function generateMultiLegName(header) {
  // Use the original header name but make it more readable
  // E.g., "GLD Vertical" → "GLD Vertical Spread"
  // E.g., "SPXW Iron Condor" → "SPXW Iron Condor"
  return header.name
}

// Single Options Parser - combines long/short and matches them
function parseSingleOptions(longArray, shortArray, startTicketId) {
  // Process both arrays into trades data
  const longTrades = longArray.map(row => {
    const opt = parseOptionSymbol(row.symbol)
    if (!opt) return null
    return {
      ticketName: generateSingleOptionName(opt),
      side: row.side,
      status: row.status,
      filledTime: row.filledTime,
      legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
    }
  }).filter(t => t !== null)

  const shortTrades = shortArray.map(row => {
    const opt = parseOptionSymbol(row.symbol)
    if (!opt) return null
    return {
      ticketName: generateSingleOptionName(opt),
      side: row.side,
      status: row.status,
      filledTime: row.filledTime,
      legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
    }
  }).filter(t => t !== null)

  // Combine and match
  return matchSingleOptions([...longTrades, ...shortTrades], startTicketId)
}

// Long Call Parser (now uses combined parser)
function parseLongCalls(longCallArray, startTicketId) {
  return parseSingleOptions(longCallArray, [], startTicketId)
}

// Short Call Parser (now uses combined parser)
function parseShortCalls(shortCallArray, startTicketId) {
  return parseSingleOptions([], shortCallArray, startTicketId)
}

// Long Put Parser (now uses combined parser)
function parseLongPuts(longPutArray, startTicketId) {
  return parseSingleOptions(longPutArray, [], startTicketId)
}

// Short Put Parser (now uses combined parser)
function parseShortPuts(shortPutArray, startTicketId) {
  return parseSingleOptions([], shortPutArray, startTicketId)
}

// ============================================
// MATCHING FUNCTIONS
// ============================================

function matchMultiLeg(tradesList, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  // Group by leg signature
  const sigGroups = {}
  for (const t of tradesList) {
    const sig = t.legs.map(l => `${l.strike}-${l.type}-${l.date}`).sort().join('|')
    if (!sigGroups[sig]) sigGroups[sig] = []
    sigGroups[sig].push(t)
  }

  for (const group of Object.values(sigGroups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))
    const openPositions = []

    for (const trade of group) {
      const isCredit = trade.side === 'Sell'
      const qty = trade.legs[0].quantity

      if (isCredit) {
        let remaining = qty
        for (let i = 0; i < openPositions.length && remaining > 0; i++) {
          const pos = openPositions[i]
          if (!pos.isCredit && pos.remaining > 0) {
            const closeQty = Math.min(remaining, pos.remaining)
            const pnl = calcPnL(pos.trade, trade, closeQty)
            tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
            pos.remaining -= closeQty
            remaining -= closeQty
            if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
          }
        }
        if (remaining > 0) openPositions.push({ trade, remaining, isCredit: true })
      } else {
        let remaining = qty
        for (let i = 0; i < openPositions.length && remaining > 0; i++) {
          const pos = openPositions[i]
          if (pos.isCredit && pos.remaining > 0) {
            const closeQty = Math.min(remaining, pos.remaining)
            const pnl = calcPnL(pos.trade, trade, closeQty)
            tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
            pos.remaining -= closeQty
            remaining -= closeQty
            if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
          }
        }
        if (remaining > 0) openPositions.push({ trade, remaining, isCredit: false })
      }
    }

    for (const pos of openPositions) {
      if (pos.remaining > 0) {
        tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
      }
    }
  }

  return tickets
}

function matchSingleOptions(tradesList, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  // Group by symbol
  const symbolGroups = {}
  for (const t of tradesList) {
    const sym = t.ticketName
    if (!symbolGroups[sym]) symbolGroups[sym] = []
    symbolGroups[sym].push(t)
  }

  // Debug: show group sizes
  for (const [sym, group] of Object.entries(symbolGroups)) {
    if (sym === 'GLD Call $480' || sym.includes('GLD260302')) {
      console.log(`  DEBUG: ${sym} has ${group.length} trades`)
      group.forEach(t => console.log(`    ${t.side} ${t.filledTime}`))
    }
  }

  for (const [symbol, group] of Object.entries(symbolGroups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))

    const openPositions = [] // Tracks all open positions (long or short)

    for (const trade of group) {
      const isLong = trade.side === 'Buy'
      const qty = trade.legs[0].quantity
      let remaining = qty

      // Try to close opposite positions
      for (let i = 0; i < openPositions.length && remaining > 0; i++) {
        const pos = openPositions[i]
        // Long trade closes short positions, short trade closes long positions
        if (pos.isLong !== isLong && pos.remaining > 0) {
          const closeQty = Math.min(remaining, pos.remaining)
          // P&L calculation
          let pnl = 0
          if (pos.isLong) {
            // We're closing a long position with a sell
            pnl = (trade.legs[0].premium - pos.trade.legs[0].premium) * closeQty * 100
          } else {
            // We're closing a short position with a buy
            pnl = (pos.trade.legs[0].premium - trade.legs[0].premium) * closeQty * 100
          }
          tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
          pos.remaining -= closeQty
          remaining -= closeQty
          if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
        }
      }

      // Any remaining quantity opens a new position
      if (remaining > 0) {
        openPositions.push({ trade, remaining, isLong })
      }
    }

    // Remaining open positions
    for (const pos of openPositions) {
      if (pos.remaining > 0) {
        tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
      }
    }
  }

  return tickets
}

// ============================================
// TICKET CREATION
// ============================================

function calcPnL(open, close, qty) {
  let pnl = 0
  for (const ol of open.legs) {
    const cl = close.legs.find(l => l.strike === ol.strike && l.type === ol.type && l.date === ol.date)
    if (cl) {
      if (ol.side === 'Buy') pnl += (cl.premium - ol.premium) * qty * 100
      else pnl -= (cl.premium - ol.premium) * qty * 100
    }
  }
  return pnl
}

function createClosedTicket(openTrade, closeTrade, qty, pnl, num) {
  const isOpen = compareDates(openTrade.filledTime, closeTrade.filledTime) < 0
  const first = isOpen ? openTrade : closeTrade
  const second = isOpen ? closeTrade : openTrade
  const legs = []

  for (const l of first.legs) legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })
  for (const l of second.legs) legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })

  return { ticket: num, date: formatDate(first.filledTime), symbol: first.legs[0]?.underlying || first.ticketName.split(' ')[0], status: pnl >= 0 ? 'WIN' : 'LOSS', exit_date: formatDate(second.filledTime), pnl: Math.round(pnl), strategies: [{ name: first.ticketName, legs, entry_time: first.filledTime || first.placedTime || '', entry_price: null, exit_time: second.filledTime || second.placedTime || '', exit_price: null }], notes: first.ticketName }
}

function createOpenTicket(trade, qty, num) {
  const legs = trade.legs.map(l => ({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() }))
  return { ticket: num, date: formatDate(trade.filledTime), symbol: trade.legs[0]?.underlying || trade.ticketName.split(' ')[0], status: 'OPEN', exit_date: null, pnl: 0, strategies: [{ name: trade.ticketName, legs, entry_time: trade.filledTime || trade.placedTime || '', entry_price: null, exit_time: '', exit_price: null }], notes: trade.ticketName }
}

// Symbol mapping for Yahoo Finance
const SYMBOL_MAP = {
  'VIXW': '^VIX',
  'SPXW': '^GSPC',
  'VIX': '^VIX',
  'SPX': '^GSPC',
  'NDX': '^NDX',
  'RUT': '^RUT'
}

function getYahooSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol
}

// In-memory price cache
const priceCache = {}

// Get historical price from cache or fetch from Yahoo Finance
// Returns price in cents or null if not found
async function getHistoricalPrice(symbol, dateStr) {
  const cacheKey = `${symbol}_${dateStr}`

  // Check memory cache first
  if (priceCache[cacheKey] !== undefined) {
    return priceCache[cacheKey]
  }

  // Check file cache
  try {
    const cachePath = path.join(__dirname, '../historical-prices.json')
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      // Check both original symbol and Yahoo symbol
      const yahooSymbol = getYahooSymbol(symbol).replace('^', '')
      const price = cache[symbol]?.[dateStr] || cache[yahooSymbol]?.[dateStr] || cache[`${symbol}|${dateStr}`]
      if (price) {
        priceCache[cacheKey] = price
        return price
      }
    }
  } catch (e) {
    // Fall through to fetch
  }

  // Fetch from Yahoo Finance using chart endpoint (works better from Node.js)
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    const targetDate = new Date(dateStr)
    const startDate = new Date(targetDate)
    startDate.setDate(startDate.getDate() - 5)
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + 5)

    const start = Math.floor(startDate.getTime() / 1000)
    const end = Math.floor(endDate.getTime() / 1000)

    // Use the chart endpoint - more reliable for historical data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${start}&period2=${end}&interval=1d`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.timestamp) {
      const timestamps = data.chart.result[0].timestamp
      const closes = data.chart.result[0].indicators.quote[0].close

      // Find the closest date to our target
      const targetTimestamp = Math.floor(targetDate.getTime() / 1000)
      let closestTimestamp = null
      let closestDiff = Infinity
      let closestPrice = null

      for (let i = 0; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTimestamp)
        if (diff < closestDiff) {
          closestDiff = diff
          closestTimestamp = timestamps[i]
          closestPrice = closes[i]
        }
      }

      if (closestPrice !== null && closestPrice !== undefined) {
        const priceInCents = Math.round(closestPrice * 100)
        priceCache[cacheKey] = priceInCents
        savePriceToFile(symbol, dateStr, priceInCents)
        return priceInCents
      }
    }

    priceCache[cacheKey] = null
    return null
  } catch (error) {
    console.error(`  Error fetching price for ${symbol} on ${dateStr}: ${error.message}`)
    priceCache[cacheKey] = null
    return null
  }
}

function savePriceToFile(symbol, dateStr, price) {
  try {
    const cachePath = path.join(__dirname, '../historical-prices.json')
    let cache = {}
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    }
    if (!cache[symbol]) cache[symbol] = {}
    cache[symbol][dateStr] = price
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  } catch (e) {
    // Ignore save errors
  }
}

// Calculate intrinsic value of an option at expiration
function calculateIntrinsicValue(type, strike, stockPrice) {
  if (!stockPrice) return null

  stockPrice = stockPrice / 100 // Convert from cents to dollars

  if (type === 'call') {
    return Math.max(0, stockPrice - strike)
  } else {
    return Math.max(0, strike - stockPrice)
  }
}

// Create a ticket for an expired position with actual P&L calculation
async function createExpiredTicket(ticket, expiryDate, num) {
  const legs = ticket.strategies[0].legs
  const symbol = ticket.symbol

  // Get historical stock price at expiration
  const stockPrice = await getHistoricalPrice(symbol, expiryDate)

  let pnl = 0
  let hasValidPrices = stockPrice !== null

  // Calculate P&L at expiration using actual stock price
  for (const leg of legs) {
    const intrinsicValue = calculateIntrinsicValue(leg.type, leg.strike, stockPrice)

    if (intrinsicValue === null) {
      hasValidPrices = false
      break
    }

    if (leg.action === 'buy') {
      // Long option: (intrinsic value at expiration - premium paid) * qty * 100
      pnl += (intrinsicValue - leg.premium) * leg.quantity * 100
    } else {
      // Short option: (premium received - intrinsic value at expiration) * qty * 100
      pnl += (leg.premium - intrinsicValue) * leg.quantity * 100
    }
  }

  // If no price data available, fall back to worthless calculation
  if (!hasValidPrices) {
    pnl = 0
    for (const leg of legs) {
      if (leg.action === 'buy') {
        pnl -= leg.premium * leg.quantity * 100
      } else {
        pnl += leg.premium * leg.quantity * 100
      }
    }
  }

  return {
    ticket: num,
    date: ticket.date,
    symbol: ticket.symbol,
    status: pnl >= 0 ? 'WIN' : 'LOSS',
    exit_date: expiryDate,
    pnl: Math.round(pnl),
    strategies: [{
      name: ticket.strategies[0].name,
      legs: legs,
      entry_time: ticket.strategies[0].entry_time,
      entry_price: null,
      exit_time: '',
      exit_price: stockPrice !== null ? (stockPrice / 100).toFixed(2) : null
    }],
    notes: ticket.notes + (stockPrice !== null ? ` (Expired @ $${(stockPrice / 100).toFixed(2)})` : ' (Expired - no price data)')
  }
}

// Process expired positions
async function processExpiredTickets(tickets, startTicketId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiredTickets = []
  const stillOpenTickets = []
  let ticketId = startTicketId

  for (const ticket of tickets) {
    if (ticket.status !== 'OPEN') {
      continue  // Skip already closed tickets
    }

    // Get expiry date from first leg
    const legs = ticket.strategies[0].legs
    if (legs.length === 0) {
      stillOpenTickets.push(ticket)
      continue
    }

    const expiryDateStr = legs[0].expiry
    if (!expiryDateStr) {
      stillOpenTickets.push(ticket)
      continue
    }

    const expiryDate = new Date(expiryDateStr)
    expiryDate.setHours(0, 0, 0, 0)

    // Check if expired
    if (expiryDate < today) {
      const expiredTicket = await createExpiredTicket(ticket, expiryDateStr, ticketId++)
      expiredTickets.push(expiredTicket)
    } else {
      stillOpenTickets.push(ticket)
    }
  }

  return { expired: expiredTickets, open: stillOpenTickets, nextTicketId: ticketId }
}

// ============================================
// MAIN
// ============================================

async function parseWebullCSV() {
  const csvPath = path.join(__dirname, '../Webull_Orders_Records_Options.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())

  // Parse all rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCsvRow(lines[i])
    if (parsed && parsed.length >= 11) {
      const [name, symbol, side, status, filled, totalQty, price, avgPrice, tif, placedTime, filledTime] = parsed
      rows.push({ name: name?.trim() || null, symbol: symbol?.trim() || null, side: side?.trim() || null, status: status?.trim() || null, filled: status === 'Filled' ? parseInt(filled) || 0 : 0, totalQty: parseInt(totalQty) || 0, price: price ? parseFloat(price.replace('@', '')) || 0 : 0, avgPrice: parseFloat(avgPrice) || 0, placedTime: placedTime?.trim() || null, filledTime: filledTime?.trim() || null })
    }
  }

  console.log(`Loaded ${rows.length} rows from CSV`)

  // STEP 1: Categorize into strategy arrays
  const categorized = categorizeAllRows(rows)

  console.log('Categorization:')
  for (const [bucket, data] of Object.entries(categorized)) {
    if (data.length > 0) {
      const count = bucket.includes('_') ? data.filter(d => d.name).length : data.length
      console.log(`  ${bucket}: ${count}`)
    }
  }

  // STEP 2: Process each strategy array independently
  const allTickets = []
  let currentTicketId = 1000

  // Multi-leg strategies
  console.log('\nProcessing:')
  const vt = parseVerticalSpreads(categorized.vertical_spread, currentTicketId)
  console.log(`  Vertical Spreads: ${vt.length} tickets`)
  allTickets.push(...vt)
  currentTicketId += vt.length

  const ic = parseIronCondors(categorized.iron_condor, currentTicketId)
  allTickets.push(...ic)
  currentTicketId += ic.length

  const st = parseStraddles(categorized.straddle, currentTicketId)
  allTickets.push(...st)
  currentTicketId += st.length

  const sg = parseStrangles(categorized.strangle, currentTicketId)
  allTickets.push(...sg)
  currentTicketId += sg.length

  // Single options - combine long/short for proper matching
  const calls = parseSingleOptions(categorized.long_call, categorized.short_call, currentTicketId)
  console.log(`  Calls (long+short): ${calls.length} tickets`)
  allTickets.push(...calls)
  currentTicketId += calls.length

  const puts = parseSingleOptions(categorized.long_put, categorized.short_put, currentTicketId)
  console.log(`  Puts (long+short): ${puts.length} tickets`)
  allTickets.push(...puts)
  currentTicketId += puts.length

  // STEP 3: Process expired positions
  const { expired, open: stillOpen } = await processExpiredTickets(allTickets, currentTicketId)

  if (expired.length > 0) {
    console.log(`\nExpired Positions: ${expired.length} tickets`)
  }

  // Combine closed, expired, and still-open tickets
  const finalTickets = [...allTickets.filter(t => t.status !== 'OPEN'), ...expired, ...stillOpen]

  // Sort by ticket number
  finalTickets.sort((a, b) => a.ticket - b.ticket)

  return finalTickets
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tickets = await parseWebullCSV()
  const output = `// Options trading data from Webull
export const tradesData = ${JSON.stringify(tickets, null, 2)};`
  fs.writeFileSync(path.join(__dirname, '../src/data/trades.js'), output)

  console.log('\n✅ Complete! Total tickets:', tickets.length)
  console.log('  Wins:', tickets.filter(t => t.status === 'WIN').length)
  console.log('  Losses:', tickets.filter(t => t.status === 'LOSS').length)
  console.log('  Open:', tickets.filter(t => t.status === 'OPEN').length)
  console.log('  P&L: $' + tickets.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(0))
}
