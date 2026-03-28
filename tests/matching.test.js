// Tests for matching logic by strategy type
// Run with: npm test

// The test implements the matching logic directly to test it independently
// This mirrors the implementation in parse-webull.js

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function compareDates(timeA, timeB) {
  const dateA = timeA ? new Date(timeA) : new Date(0)
  const dateB = timeB ? new Date(timeB) : new Date(0)
  return dateA.getTime() - dateB.getTime()
}

// ============================================================================
// CORE MATCHING LOGIC (mirrors parse-webull.js implementation)
// ============================================================================

function matchClosingTrades(trades, matchKeyFn, canMatchFn, calcPnLFn, startTicketId = 1000) {
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

function createOpeningTickets(openPositions, startTicketId = 1000) {
  const tickets = []
  let ticketId = startTicketId

  for (const pos of openPositions) {
    if (pos.remaining > 0) {
      tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
    }
  }

  return tickets
}

function createClosedTicket(openTrade, closeTrade, qty, pnl, num) {
  const isOpen = compareDates(openTrade.filledTime, closeTrade.filledTime) < 0
  const first = isOpen ? openTrade : closeTrade
  const second = isOpen ? closeTrade : openTrade
  const legs = []

  for (const l of first.legs) {
    legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })
  }
  for (const l of second.legs) {
    legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })
  }

  return {
    ticket: num,
    date: first.filledTime?.split(' ')[0] || first.date,
    symbol: first.legs[0]?.underlying || first.ticketName?.split(' ')[0],
    status: pnl >= 0 ? 'WIN' : 'LOSS',
    exit_date: second.filledTime?.split(' ')[0] || second.exit_date,
    pnl: Math.round(pnl),
    strategies: [{
      name: first.ticketName,
      legs,
      entry_time: first.filledTime || first.entry_time || '',
      entry_price: null,
      exit_time: second.filledTime || second.exit_time || '',
      exit_price: null
    }],
    notes: first.ticketName
  }
}

function createOpenTicket(trade, qty, num) {
  const legs = trade.legs.map(l => ({
    type: l.type,
    strike: l.strike,
    expiry: l.date,
    premium: l.premium,
    quantity: qty,
    action: l.side.toLowerCase()
  }))
  return {
    ticket: num,
    date: trade.filledTime?.split(' ')[0] || trade.date,
    symbol: trade.legs[0]?.underlying || trade.ticketName?.split(' ')[0],
    status: 'OPEN',
    exit_date: null,
    pnl: 0,
    strategies: [{
      name: trade.ticketName,
      legs,
      entry_time: trade.filledTime || trade.entry_time || '',
      entry_price: null,
      exit_time: '',
      exit_price: null
    }],
    notes: trade.ticketName
  }
}

// ============================================================================
// SINGLE OPTIONS MATCHING (Long/Short Calls & Puts)
// ============================================================================

function matchSingleOptions(tradesList, startTicketId = 1000) {
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

// ============================================================================
// MULTI-LEG STRATEGY MATCHING (Vertical Spreads, Iron Condors, Straddles, Strangles)
// ============================================================================

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

function matchMultiLeg(tradesList, startTicketId = 1000) {
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

// ============================================================================
// TEST DATA BUILDERS
// ============================================================================

function createTrade(ticketName, side, filledTime, legs) {
  return {
    ticketName,
    side,
    status: 'Filled',
    filledTime,
    legs: legs.map(leg => ({ ...leg, filledTime }))
  }
}

function createSingleLeg(symbol, underlying, type, strike, date, side, quantity, premium) {
  return { symbol, underlying, type, strike, date, side, quantity, premium }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

class TestRunner {
  constructor() {
    this.tests = []
    this.passed = 0
    this.failed = 0
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('\n🧪 Matching Logic Tests by Strategy Type\n')
    console.log('='.repeat(60))

    for (const { name, fn } of this.tests) {
      try {
        await fn()
        this.passed++
        console.log(`✅ ${name}`)
      } catch (error) {
        this.failed++
        console.log(`❌ ${name}`)
        console.log(`   ${error.message}`)
      }
    }

    console.log('='.repeat(60))
    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed\n`)

    if (this.failed > 0) {
      process.exit(1)
    }
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`
    )
  }
}

// ============================================================================
// TESTS
// ============================================================================

const runner = new TestRunner()

// ========================================================================
// SINGLE OPTIONS TESTS (Long/Short Calls & Puts)
// ========================================================================

runner.test('[SINGLE] Long Call - single entry/exit', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 1, 5.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 1, 7.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets.length, 1, 'Should create 1 closed ticket')
  assertEqual(tickets[0].pnl, 200, 'P&L should be $200 ((7-5) * 100)')
  assertEqual(tickets[0].status, 'WIN', 'Should be a win')
  assertEqual(tickets[0].strategies[0].legs[0].action, 'buy', 'First leg should be buy')
  assertEqual(tickets[0].strategies[0].legs[1].action, 'sell', 'Second leg should be sell')
})

runner.test('[SINGLE] Long Call - multiple entries, single exit (FIFO)', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 2, 5.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 11:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 3, 6.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 4, 8.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets.length, 3, 'Should create 3 tickets (2 closed, 1 open)')

  // First closed: 2 from first entry @ $5.00
  const closed1 = tickets.find(t => t.status !== 'OPEN' && t.strategies[0].legs[0].premium === 5.00)
  assertEqual(closed1.pnl, 600, 'First: (8-5) * 2 * 100 = 600')
  assertEqual(closed1.strategies[0].legs[0].quantity, 2, 'First quantity')

  // Second closed: 2 from second entry @ $6.00
  const closed2 = tickets.find(t => t.status !== 'OPEN' && t.strategies[0].legs[0].premium === 6.00)
  assertEqual(closed2.pnl, 400, 'Second: (8-6) * 2 * 100 = 400')
  assertEqual(closed2.strategies[0].legs[0].quantity, 2, 'Second quantity')

  // Open position
  const open = tickets.find(t => t.status === 'OPEN')
  assertEqual(open.strategies[0].legs[0].quantity, 1, 'Remaining quantity')
})

runner.test('[SINGLE] Long Call - single entry, multiple exits', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 5, 5.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 2, 7.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-03 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 3, 8.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets.length, 2, 'Should create 2 closed tickets')
  assertEqual(tickets[0].pnl, 400, 'First: (7-5) * 2 * 100 = 400')
  assertEqual(tickets[0].strategies[0].legs[1].premium, 7.00, 'First exit @ $7')
  assertEqual(tickets[1].pnl, 900, 'Second: (8-5) * 3 * 100 = 900')
  assertEqual(tickets[1].strategies[0].legs[1].premium, 8.00, 'Second exit @ $8')
})

runner.test('[SINGLE] Long Call - complex FIFO (multiple in/out)', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 3, 4.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 11:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 2, 5.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 12:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 4, 6.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 5, 8.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-03 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 3, 9.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)
  const closed = tickets.filter(t => t.status !== 'OPEN')
  const open = tickets.filter(t => t.status === 'OPEN')

  assertEqual(closed.length, 3, 'Should create 3 closed tickets')
  assertEqual(open.length, 1, 'Should have 1 open position')

  // FIFO: 3@4 + 2@5 closed by first exit, 3@6 closed by second exit
  assertEqual(closed[0].strategies[0].legs[0].premium, 4.00, 'First closed @ $4')
  assertEqual(closed[1].strategies[0].legs[0].premium, 5.00, 'Second closed @ $5')
  assertEqual(closed[2].strategies[0].legs[0].premium, 6.00, 'Third closed @ $6')
  assertEqual(open[0].strategies[0].legs[0].quantity, 1, '1 remaining @ $6')
})

runner.test('[SINGLE] Short Put - sell to open, buy to close', () => {
  const trades = [
    createTrade('SPY Put $440 01/15', 'Sell', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115P00440000', 'SPY', 'put', 440, '2026-01-15', 'Sell', 2, 3.00)
    ]),
    createTrade('SPY Put $440 01/15', 'Buy', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115P00440000', 'SPY', 'put', 440, '2026-01-15', 'Buy', 2, 1.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets.length, 1, 'Should create 1 closed ticket')
  assertEqual(tickets[0].pnl, 400, 'P&L: (3-1) * 2 * 100 = 400')
  assertEqual(tickets[0].strategies[0].legs[0].action, 'sell', 'First leg is sell (short)')
  assertEqual(tickets[0].strategies[0].legs[1].action, 'buy', 'Second leg is buy (cover)')
})

runner.test('[SINGLE] Different strikes - should NOT match', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 1, 5.00)
    ]),
    createTrade('SPY Call $455 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00455000', 'SPY', 'call', 455, '2026-01-15', 'Sell', 1, 6.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets.filter(t => t.status !== 'OPEN').length, 0, 'No closed tickets')
  assertEqual(tickets.length, 2, 'Both remain open')
})

runner.test('[SINGLE] Losing trade', () => {
  const trades = [
    createTrade('SPY Call $450 01/15', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Buy', 1, 10.00)
    ]),
    createTrade('SPY Call $450 01/15', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPY260115C00450000', 'SPY', 'call', 450, '2026-01-15', 'Sell', 1, 5.00)
    ])
  ]

  const tickets = matchSingleOptions(trades)

  assertEqual(tickets[0].pnl, -500, 'P&L: (5-10) * 100 = -500')
  assertEqual(tickets[0].status, 'LOSS', 'Should be LOSS')
})

// ========================================================================
// MULTI-LEG STRATEGY TESTS (Vertical Spreads, Iron Condors, Straddles, Strangles)
// ========================================================================

runner.test('[MULTI-LEG] Straddle - single entry/exit', () => {
  const trades = [
    createTrade('SPXW Straddle', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Buy', 1, 100.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Buy', 1, 90.00)
    ]),
    createTrade('SPXW Straddle', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Sell', 1, 110.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Sell', 1, 85.00)
    ])
  ]

  const tickets = matchMultiLeg(trades)

  assertEqual(tickets.length, 1, 'Should create 1 closed ticket')
  // Call P&L: (110-100) * 100 = 1000
  // Put P&L: (85-90) * 100 = -500
  // Total: 1000 - 500 = 500
  assertEqual(tickets[0].pnl, 500, 'P&L: 1000 + (-500) = 500')
  assertEqual(tickets[0].strategies[0].legs.length, 4, '4 legs (2 entry + 2 exit)')
})

runner.test('[MULTI-LEG] Straddle - multiple entries, single exit', () => {
  const trades = [
    createTrade('SPXW Straddle', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Buy', 2, 100.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Buy', 2, 90.00)
    ]),
    createTrade('SPXW Straddle', 'Buy', '2026-01-01 11:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Buy', 3, 105.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Buy', 3, 95.00)
    ]),
    createTrade('SPXW Straddle', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Sell', 4, 110.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Sell', 4, 85.00)
    ])
  ]

  const tickets = matchMultiLeg(trades)
  const closed = tickets.filter(t => t.status !== 'OPEN')
  const open = tickets.filter(t => t.status === 'OPEN')

  assertEqual(closed.length, 2, '2 closed tickets')
  assertEqual(open.length, 1, '1 open position')

  // First close: 2 from first entry
  // Call: (110-100)*2*100 = 2000, Put: (85-90)*2*100 = -1000, Total: 1000
  assertEqual(closed[0].pnl, 1000, 'First close P&L')
  assertEqual(closed[0].strategies[0].legs[0].quantity, 2, 'First close quantity')

  // Second close: 2 from second entry
  // Call: (110-105)*2*100 = 1000, Put: (85-95)*2*100 = -2000, Total: -1000
  assertEqual(closed[1].pnl, -1000, 'Second close P&L')

  // Remaining: 1 from second entry
  assertEqual(open[0].strategies[0].legs[0].quantity, 1, 'Remaining quantity')
})

runner.test('[MULTI-LEG] Vertical Spread - credit spread close', () => {
  const trades = [
    createTrade('SPXW Vertical Spread', 'Sell', '2026-01-01 10:00:00', [
      createSingleLeg('SPXW260115C06650000', 'SPXW', 'call', 6650, '2026-01-15', 'Sell', 2, 100.00),
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Buy', 2, 130.00)
    ]),
    createTrade('SPXW Vertical Spread', 'Buy', '2026-01-02 10:00:00', [
      createSingleLeg('SPXW260115C06650000', 'SPXW', 'call', 6650, '2026-01-15', 'Buy', 2, 80.00),
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Sell', 2, 110.00)
    ])
  ]

  const tickets = matchMultiLeg(trades)

  // Entry: Debit of 30 per spread (130-100), sold 2 = -60 * 100 = -6000
  // Exit: Credit of 30 per spread (110-80), bought 2 = 60 * 100 = 6000
  // P&L = 6000 - (-6000) = 12000? Let me recalculate...
  // Credit spread entry: Sell 6650 @ 100, Buy 6600 @ 130 = net debit 30, so this is actually a DEBIT spread
  // Exit: Buy 6650 @ 80, Sell 6600 @ 110 = net credit 30
  // P&L = (30 - 30) * 2 * 100 = 0 for the spread change?
  // Actually for legs:
  // Short 6650: (100 - 80) * 2 * 100 = 4000 (short profit)
  // Long 6600: (110 - 130) * 2 * 100 = -4000 (long loss)
  // Wait, calcPnL does: if Buy => (close - open), if Sell => -(close - open) = (open - close)
  // Short 6650: -(80-100)*2*100 = 4000
  // Long 6600: (110-130)*2*100 = -4000
  // Total = 0

  assertEqual(tickets.length, 1, '1 closed ticket')
  assertEqual(tickets[0].pnl, 0, 'Breakeven spread')
})

runner.test('[MULTI-LEG] Different legs - should NOT match', () => {
  const trades = [
    createTrade('SPXW Straddle 6600', 'Buy', '2026-01-01 10:00:00', [
      createSingleLeg('SPXW260115C06600000', 'SPXW', 'call', 6600, '2026-01-15', 'Buy', 1, 100.00),
      createSingleLeg('SPXW260115P06600000', 'SPXW', 'put', 6600, '2026-01-15', 'Buy', 1, 90.00)
    ]),
    createTrade('SPXW Straddle 6650', 'Sell', '2026-01-02 10:00:00', [
      createSingleLeg('SPXW260115C06650000', 'SPXW', 'call', 6650, '2026-01-15', 'Sell', 1, 110.00),
      createSingleLeg('SPXW260115P06650000', 'SPXW', 'put', 6650, '2026-01-15', 'Sell', 1, 85.00)
    ])
  ]

  const tickets = matchMultiLeg(trades)

  assertEqual(tickets.filter(t => t.status !== 'OPEN').length, 0, 'No closed tickets')
  assertEqual(tickets.length, 2, 'Both remain open (different strikes)')
})

runner.test('[MULTI-LEG] Iron Condor - 4 legs', () => {
  const trades = [
    createTrade('SPXW Iron Condor', 'Sell', '2026-01-01 10:00:00', [
      createSingleLeg('SPXW260115C06650000', 'SPXW', 'call', 6650, '2026-01-15', 'Sell', 1, 80.00),
      createSingleLeg('SPXW260115C06700000', 'SPXW', 'call', 6700, '2026-01-15', 'Buy', 1, 60.00),
      createSingleLeg('SPXW260115P06550000', 'SPXW', 'put', 6550, '2026-01-15', 'Sell', 1, 70.00),
      createSingleLeg('SPXW260115P06500000', 'SPXW', 'put', 6500, '2026-01-15', 'Buy', 1, 50.00)
    ]),
    createTrade('SPXW Iron Condor', 'Buy', '2026-01-02 10:00:00', [
      createSingleLeg('SPXW260115C06650000', 'SPXW', 'call', 6650, '2026-01-15', 'Buy', 1, 40.00),
      createSingleLeg('SPXW260115C06700000', 'SPXW', 'call', 6700, '2026-01-15', 'Sell', 1, 30.00),
      createSingleLeg('SPXW260115P06550000', 'SPXW', 'put', 6550, '2026-01-15', 'Buy', 1, 35.00),
      createSingleLeg('SPXW260115P06500000', 'SPXW', 'put', 6500, '2026-01-15', 'Sell', 1, 25.00)
    ])
  ]

  const tickets = matchMultiLeg(trades)

  assertEqual(tickets.length, 1, '1 closed ticket')
  // Iron condor P&L calculation with all 4 legs
  // Short 6650 Call: (80-40)*100 = 4000
  // Long 6700 Call: (30-60)*100 = -3000
  // Short 6550 Put: (70-35)*100 = 3500
  // Long 6500 Put: (25-50)*100 = -2500
  // Total = 4000 - 3000 + 3500 - 2500 = 2000
  assertEqual(tickets[0].pnl, 2000, 'Iron condor P&L')
  assertEqual(tickets[0].strategies[0].legs.length, 8, '8 legs (4 entry + 4 exit)')
})

// Run all tests
runner.run()
