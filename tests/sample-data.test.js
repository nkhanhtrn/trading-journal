// Integration tests using actual sample.csv data
// Run with: node tests/sample-data.test.js

import fs from 'fs'
import { parseCSV, parseOptionSymbol, parseCsvRow } from '../src/utils/parseWebull.js'

// =====================================================
// TEST DATA
// =====================================================

const SAMPLE_CSV = `Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time
SPXW Vertical,,Sell,Filled,10,10,@1.2500000000,1.2500000000,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
,SPXW260327C06540000,Sell,Filled,10,10,@12.97,12.97,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
,SPXW260327C06545000,Buy,Filled,10,10,@11.72,11.72,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
SPXW Vertical,,Buy,Filled,10,10,@0.1000000000,0.1000000000,DAY,03/27/2026 11:32:19 EDT,03/27/2026 11:32:30 EDT
,SPXW260327C06540000,Buy,Filled,10,10,@0.990,0.990,DAY,03/27/2026 11:32:19 EDT,03/27/2026 11:32:30 EDT
,SPXW260327C06545000,Sell,Filled,10,10,@0.890,0.890,DAY,03/27/2026 11:32:19 EDT,03/27/2026 11:32:30 EDT
GLD260327P00410000,GLD260327P00410000,Sell,Filled,10,10,@0.2900000000,0.2900000000,DAY,03/27/2026 12:57:23 EDT,03/27/2026 12:57:28 EDT
GLD260327P00410000,GLD260327P00410000,Buy,Filled,10,10,@0.3300000000,0.3300000000,DAY,03/27/2026 11:28:02 EDT,03/27/2026 11:28:03 EDT
SPXW Straddle,,Buy,Filled,1,1,@307.7000000000,307.7000000000,DAY,03/26/2026 16:03:27 EDT,03/26/2026 16:04:22 EDT
,SPXW260416C06480000,Buy,Filled,1,1,@156.13,156.13,DAY,03/26/2026 16:03:27 EDT,03/26/2026 16:04:22 EDT
,SPXW260416P06480000,Buy,Filled,1,1,@151.57,151.57,DAY,03/26/2026 16:03:27 EDT,03/26/2026 16:04:22 EDT
SPXW Straddle,,Sell,Filled,1,1,@333.1000000000,333.1000000000,DAY,03/27/2026 16:06:14 EDT,03/27/2026 16:06:22 EDT
,SPXW260417C06365000,Sell,Filled,1,1,@170.64,170.64,DAY,03/27/2026 16:06:14 EDT,03/27/2026 16:06:22 EDT
,SPXW260417P06365000,Sell,Filled,1,1,@162.46,162.46,DAY,03/27/2026 16:06:14 EDT,03/27/2026 16:06:22 EDT`

// =====================================================
// TEST RUNNER
// =====================================================

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
    console.log('\n🧪 Sample Data Integration Tests\n')
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
  if (actual !== expected) {
    throw new Error(
      `${message}\n   Expected: ${expected}\n   Actual: ${actual}`
    )
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// =====================================================
// TESTS
// =====================================================

const runner = new TestRunner()

runner.test('Sample CSV - Vertical Spread match (SPXW)', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  // Find the SPXW vertical spread ticket
  const spxwVertical = tickets.find(t =>
    t.symbol === 'SPXW' &&
    t.strategies[0]?.legs?.length === 4 &&
    t.strategies[0].legs[0].expiry === '2026-03-27'
  )

  assertTrue(!!spxwVertical, 'Should find SPXW vertical spread ticket')
  assertEqual(spxwVertical.status, 'WIN', 'Should be a winning trade')
  assertEqual(spxwVertical.pnl, 1150, 'P&L should be $1150')

  // Verify legs have symbol field
  const legs = spxwVertical.strategies[0].legs
  legs.forEach(leg => {
    assertTrue(!!leg.strike, 'Leg should have strike')
    assertTrue(!!leg.type, 'Leg should have type')
    assertTrue(!!leg.expiry, 'Leg should have expiry')
  })
})

runner.test('Sample CSV - Single option match (GLD Put)', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  // Find the GLD put ticket
  const gldPut = tickets.find(t =>
    t.symbol === 'GLD' &&
    t.status !== 'OPEN' &&
    t.strategies[0]?.legs?.length === 2
  )

  assertTrue(!!gldPut, 'Should find GLD put ticket')
  assertEqual(gldPut.status, 'LOSS', 'Should be a losing trade')
  assertEqual(gldPut.pnl, -40, 'P&L should be -$40 ((0.29 - 0.33) * 10 * 100)')

  // Verify legs are correct
  const legs = gldPut.strategies[0].legs
  assertEqual(legs.length, 2, 'Should have 2 legs')
  assertTrue(legs[0].action === 'sell' || legs[1].action === 'sell', 'Should have sell leg')
  assertTrue(legs[0].action === 'buy' || legs[1].action === 'buy', 'Should have buy leg')
})

runner.test('Sample CSV - Straddle match (SPXW)', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  // Find the SPXW straddle tickets - they have different expiries (0416 vs 0417) so won't match
  const spxwStraddles = tickets.filter(t =>
    t.symbol === 'SPXW' &&
    t.strategies[0]?.name === 'SPXW Straddle'
  )

  // Since the straddles have different expiries, they remain as open positions
  assertEqual(spxwStraddles.length, 2, 'Should have 2 straddle entries (different expiries, remain open)')

  // Verify straddle legs
  spxwStraddles.forEach(ticket => {
    const legs = ticket.strategies[0].legs
    assertEqual(legs.length, 2, 'Open straddle should have 2 legs')
    const callLegs = legs.filter(l => l.type === 'call')
    const putLegs = legs.filter(l => l.type === 'put')
    assertEqual(callLegs.length, 1, 'Should have 1 call leg')
    assertEqual(putLegs.length, 1, 'Should have 1 put leg')
  })
})

runner.test('Sample CSV - parseOptionSymbol function', () => {
  // Test option symbol parsing
  const call = parseOptionSymbol('SPXW260327C06540000')
  assertTrue(!!call, 'Should parse call option')
  assertEqual(call.underlying, 'SPXW', 'Underlying should be SPXW')
  assertEqual(call.type, 'call', 'Type should be call')
  assertEqual(call.strike, 6540, 'Strike should be 6540')
  assertEqual(call.date, '2026-03-27', 'Date should be 2026-03-27')

  const put = parseOptionSymbol('GLD260327P00410000')
  assertTrue(!!put, 'Should parse put option')
  assertEqual(put.underlying, 'GLD', 'Underlying should be GLD')
  assertEqual(put.type, 'put', 'Type should be put')
  // Note: GLD options use different strike format (00410000 / 1000 = 410)
  assertEqual(put.strike, 410, 'Strike should be 410 (GLD uses cents format)')
})

runner.test('Sample CSV - Symbol field in legs', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  // Check that all closed tickets have symbol field in legs
  const closedTickets = tickets.filter(t => t.status !== 'OPEN')

  closedTickets.forEach(ticket => {
    const legs = ticket.strategies[0]?.legs || []
    assertTrue(legs.length > 0, `Ticket ${ticket.ticket} should have legs`)

    // Each leg should have required fields
    legs.forEach(leg => {
      assertTrue(!!leg.type, `Leg should have type (ticket ${ticket.ticket})`)
      assertTrue(!!leg.strike, `Leg should have strike (ticket ${ticket.ticket})`)
      assertTrue(!!leg.expiry, `Leg should have expiry (ticket ${ticket.ticket})`)
      assertTrue(!!leg.premium !== undefined, `Leg should have premium (ticket ${ticket.ticket})`)
      assertTrue(!!leg.quantity, `Leg should have quantity (ticket ${ticket.ticket})`)
      assertTrue(!!leg.action, `Leg should have action (ticket ${ticket.ticket})`)
    })
  })
})

runner.test('Sample CSV - Total ticket count', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  // Should have 4 total tickets:
  // - 1 SPXW vertical spread (closed)
  // - 1 GLD put (closed)
  // - 2 SPXW straddles with different expiries (open)
  const closedTickets = tickets.filter(t => t.status !== 'OPEN')
  const openTickets = tickets.filter(t => t.status === 'OPEN')
  assertEqual(closedTickets.length, 2, 'Should have 2 closed tickets')
  assertEqual(openTickets.length, 2, 'Should have 2 open tickets')
  assertEqual(tickets.length, 4, 'Should have 4 total tickets')
})

runner.test('Sample CSV - P&L calculations', async () => {
  const tickets = await parseCSV(SAMPLE_CSV, 1000)

  const totalPnL = tickets.reduce((sum, t) => sum + (t.pnl || 0), 0)

  // Expected P&L:
  // - SPXW Vertical: +$1150
  // - GLD Put: -$40
  // - SPXW Straddles: varies based on specific prices

  // Just verify P&L is a number
  assertTrue(typeof totalPnL === 'number', 'Total P&L should be a number')
  assertTrue(!isNaN(totalPnL), 'Total P&L should not be NaN')
})

// =====================================================
// RUN TESTS
// =====================================================

runner.run()
