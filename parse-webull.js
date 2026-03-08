// Webull Options CSV Parser
// Modular design: categorize → process → match → expire

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =====================================================
// SECTION 1: UTILITY FUNCTIONS
// =====================================================

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

function generateSingleOptionName(opt) {
  const capitalType = opt.type.charAt(0).toUpperCase() + opt.type.slice(1)
  const expiryMonth = opt.date.substring(5, 7) + '/' + opt.date.substring(8, 10)
  return `${opt.underlying} ${capitalType} $${opt.strike} ${expiryMonth}`
}

// =====================================================
// SECTION 2: SYMBOL MAPPING & PRICE FETCHING
// =====================================================

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

const priceCache = {}

async function getHistoricalPrice(symbol, dateStr) {
  const cacheKey = `${symbol}_${dateStr}`

  if (priceCache[cacheKey] !== undefined) {
    return priceCache[cacheKey]
  }

  // Check file cache
  try {
    const cachePath = path.join(__dirname, '../historical-prices.json')
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
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

  // Fetch from Yahoo Finance using chart endpoint
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    const targetDate = new Date(dateStr)
    const startDate = new Date(targetDate)
    startDate.setDate(startDate.getDate() - 5)
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + 5)

    const start = Math.floor(startDate.getTime() / 1000)
    const end = Math.floor(endDate.getTime() / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${start}&period2=${end}&interval=1d`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.timestamp) {
      const timestamps = data.chart.result[0].timestamp
      const closes = data.chart.result[0].indicators.quote[0].close

      let closestDiff = Infinity
      let closestPrice = null

      for (let i = 0; i < timestamps.length; i++) {
        const targetTimestamp = Math.floor(targetDate.getTime() / 1000)
        const diff = Math.abs(timestamps[i] - targetTimestamp)
        if (diff < closestDiff && closes[i] !== null) {
          closestDiff = diff
          closestPrice = closes[i]
        }
      }

      if (closestPrice !== null) {
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

// =====================================================
// SECTION 3: CATEGORIZATION
// =====================================================

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

  // Single options: when name equals symbol
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

  return null
}

function categorizeAllRows(rows) {
  const categorized = { vertical_spread: [], iron_condor: [], straddle: [], strangle: [], long_call: [], short_call: [], long_put: [], short_put: [] }
  let currentHeader = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Single option: name equals symbol
    if (row.name && row.symbol && row.name === row.symbol) {
      currentHeader = null
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
      continue
    }

    // Leg row (has symbol, no name, and we have a header)
    if (row.symbol && !row.name && currentHeader) {
      // For diagonals, treat legs as single options
      const headerNameLower = currentHeader.name?.toLowerCase() || ''
      if (headerNameLower.includes('diagonal')) {
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
      currentHeader = null
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
    }
  }

  return categorized
}

// =====================================================
// SECTION 4: STRATEGY PROCESSORS
// =====================================================

function processVerticalSpread(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processIronCondor(header) {
  if (!header.legs || header.legs.length < 4) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processStraddle(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processStrangle(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processSingleOption(row) {
  const opt = parseOptionSymbol(row.symbol)
  if (!opt) return []

  return [{
    ticketName: generateSingleOptionName(opt),
    side: row.side,
    status: row.status,
    filledTime: row.filledTime,
    legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
  }]
}

// =====================================================
// SECTION 5: MATCHING FUNCTIONS
// =====================================================

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

  for (const [symbol, group] of Object.entries(symbolGroups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))

    const openPositions = []

    for (const trade of group) {
      const isLong = trade.side === 'Buy'
      const qty = trade.legs[0].quantity
      let remaining = qty

      // Try to close opposite positions
      for (let i = 0; i < openPositions.length && remaining > 0; i++) {
        const pos = openPositions[i]
        if (pos.isLong !== isLong && pos.remaining > 0) {
          const closeQty = Math.min(remaining, pos.remaining)
          let pnl = 0
          if (pos.isLong) {
            pnl = (trade.legs[0].premium - pos.trade.legs[0].premium) * closeQty * 100
          } else {
            pnl = (pos.trade.legs[0].premium - trade.legs[0].premium) * closeQty * 100
          }
          tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
          pos.remaining -= closeQty
          remaining -= closeQty
          if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
        }
      }

      if (remaining > 0) {
        openPositions.push({ trade, remaining, isLong })
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

// =====================================================
// SECTION 6: P&L CALCULATION
// =====================================================

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

function calculateIntrinsicValue(type, strike, stockPrice) {
  if (!stockPrice) return null
  stockPrice = stockPrice / 100
  if (type === 'call') return Math.max(0, stockPrice - strike)
  else return Math.max(0, strike - stockPrice)
}

// =====================================================
// SECTION 7: TICKET CREATION
// =====================================================

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

async function createExpiredTicket(ticket, expiryDate, num) {
  const legs = ticket.strategies[0].legs
  const symbol = ticket.symbol
  const stockPrice = await getHistoricalPrice(symbol, expiryDate)

  let pnl = 0
  let hasValidPrices = stockPrice !== null

  for (const leg of legs) {
    const intrinsicValue = calculateIntrinsicValue(leg.type, leg.strike, stockPrice)
    if (intrinsicValue === null) {
      hasValidPrices = false
      break
    }
    if (leg.action === 'buy') pnl += (intrinsicValue - leg.premium) * leg.quantity * 100
    else pnl += (leg.premium - intrinsicValue) * leg.quantity * 100
  }

  if (!hasValidPrices) {
    pnl = 0
    for (const leg of legs) {
      if (leg.action === 'buy') pnl -= leg.premium * leg.quantity * 100
      else pnl += leg.premium * leg.quantity * 100
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

async function processExpiredTickets(tickets, startTicketId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiredTickets = []
  const stillOpenTickets = []
  let ticketId = startTicketId

  for (const ticket of tickets) {
    if (ticket.status !== 'OPEN') {
      continue
    }

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

    if (expiryDate < today) {
      const expiredTicket = await createExpiredTicket(ticket, expiryDateStr, ticketId++)
      expiredTickets.push(expiredTicket)
    } else {
      stillOpenTickets.push(ticket)
    }
  }

  return { expired: expiredTickets, open: stillOpenTickets, nextTicketId: ticketId }
}

// =====================================================
// SECTION 8: STRATEGY PARSING FUNCTIONS
// Each takes its categorized array and returns tickets
// =====================================================

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

function parseIronCondors(ironCondorArray, startTicketId) {
  const tradesData = []

  for (const header of ironCondorArray) {
    if (!header.legs || header.legs.length < 4) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 4) {
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

function parseStraddles(straddleArray, startTicketId) {
  const tradesData = []

  for (const header of straddleArray) {
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

function parseStrangles(strangleArray, startTicketId) {
  const tradesData = []

  for (const header of strangleArray) {
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

function parseSingleOptions(longArray, shortArray, startTicketId) {
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

  return matchSingleOptions([...longTrades, ...shortTrades], startTicketId)
}

// =====================================================
// SECTION 9: MAIN ENTRY POINT
// =====================================================

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
  console.log(`  Iron Condors: ${ic.length} tickets`)
  allTickets.push(...ic)
  currentTicketId += ic.length

  const sd = parseStraddles(categorized.straddle, currentTicketId)
  console.log(`  Straddles: ${sd.length} tickets`)
  allTickets.push(...sd)
  currentTicketId += sd.length

  const sg = parseStrangles(categorized.strangle, currentTicketId)
  console.log(`  Strangles: ${sg.length} tickets`)
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
