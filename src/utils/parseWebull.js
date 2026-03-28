// Webull Options CSV Parser - Browser Compatible Version
// Modular design: categorize → process → match → expire

// =====================================================
// SECTION 1: UTILITY FUNCTIONS
// =====================================================

export function parseCsvRow(row) {
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

export function formatDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split(' ')[0].split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  return dateStr
}

export function compareDates(timeA, timeB) {
  const dateA = timeA ? new Date(timeA) : new Date(0)
  const dateB = timeB ? new Date(timeB) : new Date(0)
  return dateA.getTime() - dateB.getTime()
}

export function parseOptionSymbol(symbol) {
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
// SECTION 2: CATEGORIZATION
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

export function categorizeRow(row) {
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
    if (nameLower.includes('diagonal')) return null
    if (nameLower.includes('vertical') || nameLower.includes('spread')) return 'vertical_spread'
    if (nameLower.includes('iron condor') || nameLower.includes('condor')) return 'iron_condor'
    if (nameLower.includes('straddle')) return 'straddle'
    if (nameLower.includes('strangle')) return 'strangle'
    return 'vertical_spread'
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

export function categorizeAllRows(rows) {
  const categorized = { vertical_spread: [], iron_condor: [], straddle: [], strangle: [], long_call: [], short_call: [], long_put: [], short_put: [] }
  let currentHeader = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (row.name && row.symbol && row.name === row.symbol) {
      currentHeader = null
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
      continue
    }

    if (row.name && !row.symbol) {
      currentHeader = { ...row, legs: [] }
      const bucket = categorizeRow(row)
      if (bucket) {
        const nameLower = row.name.toLowerCase()
        if (!nameLower.includes('diagonal')) {
          categorized[bucket].push(currentHeader)
        }
      }
      continue
    }

    if (row.symbol && !row.name && currentHeader) {
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

    if (row.symbol && !row.name) {
      currentHeader = null
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
    }
  }

  return categorized
}

// =====================================================
// SECTION 3: STRATEGY PROCESSORS
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
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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
    legs: [{ ...opt, symbol: row.symbol, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
  }]
}

// =====================================================
// SECTION 4: MATCHING FUNCTIONS
// =====================================================

function matchClosingTrades(trades, matchKeyFn, canMatchFn, calcPnLFn, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  const groups = {}
  for (const t of trades) {
    const key = matchKeyFn(t)
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }

  const allOpenPositions = []

  for (const group of Object.values(groups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))
    const openPositions = []

    for (const trade of group) {
      const qty = trade.legs[0].quantity
      let remaining = qty

      for (let i = 0; i < openPositions.length && remaining > 0; i++) {
        const pos = openPositions[i]
        if (canMatchFn(pos, trade) && pos.remaining > 0) {
          const closeQty = Math.min(remaining, pos.remaining)
          const pnl = calcPnLFn(pos.trade, trade, closeQty)
          tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
          pos.remaining -= closeQty
          remaining -= closeQty
          if (pos.remaining <= 0) {
            openPositions.splice(i, 1)
            i--
          }
        }
      }

      if (remaining > 0) {
        openPositions.push({ trade, remaining })
      }
    }

    allOpenPositions.push(...openPositions)
  }

  return { tickets, openPositions: allOpenPositions }
}

function createOpeningTickets(openPositions, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  for (const pos of openPositions) {
    if (pos.remaining > 0) {
      tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
    }
  }

  return tickets
}

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

// =====================================================
// SECTION 5: STRATEGY MATCHING FUNCTIONS
// =====================================================

function matchSingleOptions(tradesList, startTicketId) {
  const matchKeyFn = (t) => t.legs[0].symbol
  const canMatchFn = (pos, trade) => {
    return pos.trade.side !== trade.side && pos.trade.legs[0].symbol === trade.legs[0].symbol
  }
  const calcPnLFn = (open, close, qty) => {
    if (open.side === 'Buy') {
      return (close.legs[0].premium - open.legs[0].premium) * qty * 100
    } else {
      return (open.legs[0].premium - close.legs[0].premium) * qty * 100
    }
  }

  const { tickets: closedTickets, openPositions } = matchClosingTrades(
    tradesList,
    matchKeyFn,
    canMatchFn,
    calcPnLFn,
    startTicketId
  )

  const openTickets = createOpeningTickets(openPositions, startTicketId + closedTickets.length)
  return [...closedTickets, ...openTickets]
}

function matchVerticalSpread(tradesList, startTicketId) {
  const matchKeyFn = (t) => t.legs.map(l => l.symbol).sort().join('|')
  const canMatchFn = (pos, trade) => {
    const posSymbols = pos.trade.legs.map(l => l.symbol).sort().join('|')
    const tradeSymbols = trade.legs.map(l => l.symbol).sort().join('|')
    return pos.trade.side !== trade.side && posSymbols === tradeSymbols
  }
  const calcPnLFn = calcPnL

  const { tickets: closedTickets, openPositions } = matchClosingTrades(
    tradesList,
    matchKeyFn,
    canMatchFn,
    calcPnLFn,
    startTicketId
  )

  const openTickets = createOpeningTickets(openPositions, startTicketId + closedTickets.length)
  return [...closedTickets, ...openTickets]
}

function matchIronCondor(tradesList, startTicketId) {
  const matchKeyFn = (t) => t.legs.map(l => l.symbol).sort().join('|')
  const canMatchFn = (pos, trade) => {
    const posSymbols = pos.trade.legs.map(l => l.symbol).sort().join('|')
    const tradeSymbols = trade.legs.map(l => l.symbol).sort().join('|')
    return pos.trade.side !== trade.side && posSymbols === tradeSymbols
  }
  const calcPnLFn = calcPnL

  const { tickets: closedTickets, openPositions } = matchClosingTrades(
    tradesList,
    matchKeyFn,
    canMatchFn,
    calcPnLFn,
    startTicketId
  )

  const openTickets = createOpeningTickets(openPositions, startTicketId + closedTickets.length)
  return [...closedTickets, ...openTickets]
}

function matchStraddle(tradesList, startTicketId) {
  const matchKeyFn = (t) => t.legs.map(l => l.symbol).sort().join('|')
  const canMatchFn = (pos, trade) => {
    const posSymbols = pos.trade.legs.map(l => l.symbol).sort().join('|')
    const tradeSymbols = trade.legs.map(l => l.symbol).sort().join('|')
    return pos.trade.side !== trade.side && posSymbols === tradeSymbols
  }
  const calcPnLFn = calcPnL

  const { tickets: closedTickets, openPositions } = matchClosingTrades(
    tradesList,
    matchKeyFn,
    canMatchFn,
    calcPnLFn,
    startTicketId
  )

  const openTickets = createOpeningTickets(openPositions, startTicketId + closedTickets.length)
  return [...closedTickets, ...openTickets]
}

function matchStrangle(tradesList, startTicketId) {
  const matchKeyFn = (t) => t.legs.map(l => l.symbol).sort().join('|')
  const canMatchFn = (pos, trade) => {
    const posSymbols = pos.trade.legs.map(l => l.symbol).sort().join('|')
    const tradeSymbols = trade.legs.map(l => l.symbol).sort().join('|')
    return pos.trade.side !== trade.side && posSymbols === tradeSymbols
  }
  const calcPnLFn = calcPnL

  const { tickets: closedTickets, openPositions } = matchClosingTrades(
    tradesList,
    matchKeyFn,
    canMatchFn,
    calcPnLFn,
    startTicketId
  )

  const openTickets = createOpeningTickets(openPositions, startTicketId + closedTickets.length)
  return [...closedTickets, ...openTickets]
}

// =====================================================
// SECTION 6: STRATEGY PARSING FUNCTIONS
// =====================================================

function parseVerticalSpreads(verticalSpreadArray, startTicketId) {
  const tradesData = []

  for (const header of verticalSpreadArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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

  return matchVerticalSpread(tradesData, startTicketId)
}

function parseIronCondors(ironCondorArray, startTicketId) {
  const tradesData = []

  for (const header of ironCondorArray) {
    if (!header.legs || header.legs.length < 4) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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

  return matchIronCondor(tradesData, startTicketId)
}

function parseStraddles(straddleArray, startTicketId) {
  const tradesData = []

  for (const header of straddleArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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

  return matchStraddle(tradesData, startTicketId)
}

function parseStrangles(strangleArray, startTicketId) {
  const tradesData = []

  for (const header of strangleArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, symbol: l.symbol, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
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

  return matchStrangle(tradesData, startTicketId)
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
      legs: [{ ...opt, symbol: row.symbol, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
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
      legs: [{ ...opt, symbol: row.symbol, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
    }
  }).filter(t => t !== null)

  return matchSingleOptions([...longTrades, ...shortTrades], startTicketId)
}

// =====================================================
// SECTION 7: MAIN ENTRY POINT
// =====================================================

export async function parseCSV(csvText, startTicketId = 1000, priceFetcher = null) {
  const lines = csvText.split('\n').filter(line => line.trim())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCsvRow(lines[i])
    if (parsed && parsed.length >= 11) {
      const [name, symbol, side, status, filled, totalQty, price, avgPrice, tif, placedTime, filledTime] = parsed
      rows.push({ name: name?.trim() || null, symbol: symbol?.trim() || null, side: side?.trim() || null, status: status?.trim() || null, filled: status === 'Filled' ? parseInt(filled) || 0 : 0, totalQty: parseInt(totalQty) || 0, price: price ? parseFloat(price.replace('@', '')) || 0 : 0, avgPrice: parseFloat(avgPrice) || 0, placedTime: placedTime?.trim() || null, filledTime: filledTime?.trim() || null })
    }
  }

  const categorized = categorizeAllRows(rows)

  const allTickets = []
  let currentTicketId = startTicketId

  const vt = parseVerticalSpreads(categorized.vertical_spread, currentTicketId)
  allTickets.push(...vt)
  currentTicketId += vt.length

  const ic = parseIronCondors(categorized.iron_condor, currentTicketId)
  allTickets.push(...ic)
  currentTicketId += ic.length

  const sd = parseStraddles(categorized.straddle, currentTicketId)
  allTickets.push(...sd)
  currentTicketId += sd.length

  const sg = parseStrangles(categorized.strangle, currentTicketId)
  allTickets.push(...sg)
  currentTicketId += sg.length

  const calls = parseSingleOptions(categorized.long_call, categorized.short_call, currentTicketId)
  allTickets.push(...calls)
  currentTicketId += calls.length

  const puts = parseSingleOptions(categorized.long_put, categorized.short_put, currentTicketId)
  allTickets.push(...puts)
  currentTicketId += puts.length

  return allTickets
}
