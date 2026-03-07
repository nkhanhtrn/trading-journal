// Read and analyze trades by inferring strategy from legs
const trades = require('./sample-trades.json');

function detectStrategy(legs) {
  const expiryDates = [...new Set(legs.map(l => l.expiry))];
  const callLegs = legs.filter(l => l.type === 'call');
  const putLegs = legs.filter(l => l.type === 'put');
  const uniqueExpiries = expiryDates.length;

  // All same expiry
  if (uniqueExpiries === 1) {
    // Single leg - long or short
    if (legs.length === 1) {
      const leg = legs[0];
      return leg.action === 'buy'
        ? `long_${leg.type}`
        : `short_${leg.type}`;
    }

    // Two legs
    if (legs.length === 2) {
      const [leg1, leg2] = legs;

      // Vertical Spread (same type, different strikes, same expiry)
      if (leg1.type === leg2.type && leg1.action !== leg2.action) {
        const type = leg1.type;
        const lowerStrike = Math.min(leg1.strike, leg2.strike);
        const higherStrike = Math.max(leg1.strike, leg2.strike);
        const longLeg = legs.find(l => l.action === 'buy');

        return `vertical_${type}`;
      }

      // Straddle (same strike, one call one put)
      if (leg1.strike === leg2.strike && leg1.type !== leg2.type) {
        return `straddle`;
      }

      // Strangle (different strikes, one call one put)
      if (leg1.type !== leg2.type && leg1.strike !== leg2.strike) {
        return `strangle`;
      }
    }

    // Three legs
    if (legs.length === 3) {
      // Butterfly (same type, 3 strikes)
      if (callLegs.length === 3 || putLegs.length === 3) {
        const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
        const uniqueStrikes = [...new Set(strikes)];
        if (uniqueStrikes.length === 3) {
          const optionType = callLegs.length === 3 ? 'call' : 'put';
          return `butterfly_${optionType}`;
        }
      }
    }

    // Four legs
    if (legs.length === 4) {
      // Iron Condor (2 puts, 2 calls, all same expiry)
      if (callLegs.length === 2 && putLegs.length === 2) {
        const putStrikes = putLegs.map(l => l.strike).sort((a, b) => a - b);
        const callStrikes = callLegs.map(l => l.strike).sort((a, b) => a - b);

        // Check structure: long lower put, short higher put, short lower call, long higher call
        const longPut = putLegs.find(l => l.action === 'buy');
        const shortPut = putLegs.find(l => l.action === 'sell');
        const shortCall = callLegs.find(l => l.action === 'sell');
        const longCall = callLegs.find(l => l.action === 'buy');

        if (longPut && shortPut && shortCall && longCall &&
            longPut.strike < shortPut.strike &&
            shortCall.strike < longCall.strike) {
          return 'iron_condor';
        }
      }

      // Iron Butterfly (all same strike, 2 puts, 2 calls)
      const strikes = legs.map(l => l.strike);
      const allSameStrike = strikes.every(s => s === strikes[0]);
      if (allSameStrike && callLegs.length === 2 && putLegs.length === 2) {
        return 'iron_butterfly';
      }
    }
  }

  // Calendar Spread (same type, same strike, different expiries)
  if (uniqueExpiries === 2 && legs.length === 2) {
    const [leg1, leg2] = legs;
    if (leg1.type === leg2.type && leg1.strike === leg2.strike && leg1.action !== leg2.action) {
      return `calendar_${leg1.type}`;
    }
  }

  return 'unknown';
}

function groupTradesByStrategy(trades) {
  const grouped = {};

  for (const trade of trades) {
    const strategy = detectStrategy(trade.legs);

    // Add detected strategy to trade for reference
    trade.detected_strategy = strategy;

    if (!grouped[strategy]) {
      grouped[strategy] = [];
    }
    grouped[strategy].push(trade);
  }

  return grouped;
}

// Group the trades
const grouped = groupTradesByStrategy(trades);

// Display results
console.log('='.repeat(60));
console.log('TRADES GROUPED BY STRATEGY');
console.log('='.repeat(60));

Object.entries(grouped).sort().forEach(([strategy, strategyTrades]) => {
  console.log(`\n📊 ${strategy.toUpperCase().replace(/_/g, ' ')}`);
  console.log('─'.repeat(60));
  console.log(`Total trades: ${strategyTrades.length}`);

  strategyTrades.forEach(trade => {
    const legDesc = trade.legs.map(l =>
      `${l.action} ${l.type} $${l.strike}`
    ).join(' + ');

    const costInfo = trade.debit_paid
      ? `Debit: $${trade.debit_paid}`
      : trade.credit_received
        ? `Credit: $${trade.credit_received}`
        : '';

    console.log(`  ID ${trade.id}: ${trade.underlying} | ${legDesc} | ${costInfo} | ${trade.status}`);
  });
});

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
Object.entries(grouped).forEach(([strategy, trades]) => {
  console.log(`${strategy.padEnd(25)} ${trades.length} trade(s)`);
});

module.exports = { detectStrategy, groupTradesByStrategy };
