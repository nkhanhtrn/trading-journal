// Detect options strategy from legs structure
export function detectStrategy(legs) {
  if (!legs || !Array.isArray(legs) || legs.length === 0) {
    return 'unknown'
  }

  const expiryDates = [...new Set(legs.map(l => l.expiry))]
  const callLegs = legs.filter(l => l.type === 'call')
  const putLegs = legs.filter(l => l.type === 'put')
  const uniqueExpiries = expiryDates.length

  // All same expiry
  if (uniqueExpiries === 1) {
    // Single leg - long or short
    if (legs.length === 1) {
      const leg = legs[0]
      return leg.action === 'buy' ? `long_${leg.type}` : `short_${leg.type}`
    }

    // Two legs
    if (legs.length === 2) {
      const [leg1, leg2] = legs

      // Vertical Spread (same type, different strikes, same expiry)
      if (leg1.type === leg2.type && leg1.action !== leg2.action) {
        const type = leg1.type
        return `vertical_${type}`
      }

      // Straddle (same strike, one call one put)
      if (leg1.strike === leg2.strike && leg1.type !== leg2.type) {
        return 'straddle'
      }

      // Strangle (different strikes, one call one put)
      if (leg1.type !== leg2.type && leg1.strike !== leg2.strike) {
        return 'strangle'
      }
    }

    // Three legs
    if (legs.length === 3) {
      // Butterfly (same type, 3 strikes)
      if (callLegs.length === 3 || putLegs.length === 3) {
        const strikes = legs.map(l => l.strike).sort((a, b) => a - b)
        const uniqueStrikes = [...new Set(strikes)]
        if (uniqueStrikes.length === 3) {
          const optionType = callLegs.length === 3 ? 'call' : 'put'
          return `butterfly_${optionType}`
        }
      }
    }

    // Four legs
    if (legs.length === 4) {
      // Iron Condor (2 puts, 2 calls, all same expiry)
      if (callLegs.length === 2 && putLegs.length === 2) {
        const longPut = putLegs.find(l => l.action === 'buy')
        const shortPut = putLegs.find(l => l.action === 'sell')
        const shortCall = callLegs.find(l => l.action === 'sell')
        const longCall = callLegs.find(l => l.action === 'buy')

        if (longPut && shortPut && shortCall && longCall &&
            longPut.strike < shortPut.strike &&
            shortCall.strike < longCall.strike) {
          return 'iron_condor'
        }
      }

      // Iron Butterfly (all same strike, 2 puts, 2 calls)
      const strikes = legs.map(l => l.strike)
      const allSameStrike = strikes.every(s => s === strikes[0])
      if (allSameStrike && callLegs.length === 2 && putLegs.length === 2) {
        return 'iron_butterfly'
      }
    }
  }

  // Calendar Spread (same type, same strike, different expiries)
  if (uniqueExpiries === 2 && legs.length === 2) {
    const [leg1, leg2] = legs
    if (leg1.type === leg2.type && leg1.strike === leg2.strike && leg1.action !== leg2.action) {
      return `calendar_${leg1.type}`
    }
  }

  return 'unknown'
}

// Get display name for strategy
export function getStrategyDisplayName(strategy) {
  const names = {
    'vertical_call': 'Vertical Call Spread',
    'vertical_put': 'Vertical Put Spread',
    'iron_condor': 'Iron Condor',
    'iron_butterfly': 'Iron Butterfly',
    'long_call': 'Long Call',
    'long_put': 'Long Put',
    'short_call': 'Short Call',
    'short_put': 'Short Put',
    'straddle': 'Straddle',
    'strangle': 'Strangle',
    'butterfly_call': 'Butterfly Call',
    'butterfly_put': 'Butterfly Put',
    'calendar_call': 'Calendar Call',
    'calendar_put': 'Calendar Put',
    'unknown': 'Unknown Strategy'
  }
  return names[strategy] || strategy
}

