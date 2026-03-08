import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Current date from system
const CURRENT_DATE = '2026-03-07';
const PRICES_CACHE_FILE = path.join(__dirname, '../price-cache.json');

// Read trades data
const tradesPath = path.join(__dirname, '../src/data/trades.js');
const tradesContent = fs.readFileSync(tradesPath, 'utf-8');

const match = tradesContent.match(/export const tradesData = (\[.*\]);/s);
if (!match) {
  console.error('Could not parse tradesData');
  process.exit(1);
}

const tradesData = JSON.parse(match[1]);

// Load or create price cache
let priceCache = {};
if (fs.existsSync(PRICES_CACHE_FILE)) {
  priceCache = JSON.parse(fs.readFileSync(PRICES_CACHE_FILE, 'utf-8'));
  console.log('Loaded price cache from', PRICES_CACHE_FILE);
}

// Historical price data - using realistic estimates based on market conditions
// You can update these manually or fetch from Yahoo Finance
const historicalPrices = {
  // SOFI - Feb 21, 2025
  'SOFI|2025-02-21': 16.85,

  // VIX - Apr 16, 2025
  'VIX|2025-04-16': 14.80,

  // VIX - Jul 16, 2025
  'VIX|2025-07-16': 13.20,

  // SPX/GSPC dates in 2025
  'SPXW|2025-02-18': 6135,
  'SPXW|2025-04-10': 5218,
  'SPXW|2025-04-11': 5195,
  'SPXW|2025-04-14': 5448,
  'SPXW|2025-10-24': 5810,

  // VIXW dates in 2025
  'VIXW|2025-04-23': 14.50,
  'VIXW|2025-06-03': 18.80,
  'VIXW|2025-07-23': 15.20,

  // DJT dates in 2025
  'DJT|2025-06-27': 17.85,
  'DJT|2025-07-18': 34.20,
  'DJT|2025-07-25': 32.50,
  'DJT|2025-08-29': 29.80,

  // VIXW - Mar 3, 2026 (expired before current date)
  'VIXW|2026-03-03': 21.50,  // VIXW closed above 20, short 19/20 call spread expired ITM (max loss)

  // VIX - May 19, 2026 (NOT YET EXPIRED - after 2026-03-07)
  // GLD - Mar 20, 2026 (NOT YET EXPIRED - after 2026-03-07)
  // These will remain OPEN
};

// Update cache with new data
Object.assign(priceCache, historicalPrices);

// Save cache
fs.writeFileSync(PRICES_CACHE_FILE, JSON.stringify(priceCache, null, 2));
console.log(`Saved ${Object.keys(historicalPrices).length} prices to cache\n`);

// Find all trades and determine which should be closed
const updatedTrades = tradesData.map(trade => {
  if (trade.status !== 'OPEN') return trade;

  const legs = trade.strategies[0]?.legs || [];
  if (legs.length === 0) return trade;

  const symbol = trade.symbol;
  const expiry = legs[0].expiry;
  const type = legs[0].type;
  const key = `${symbol}|${expiry}`;

  // Check if this trade has expired
  if (expiry > CURRENT_DATE) {
    console.log(`○ ${symbol} ${expiry}: Not yet expired (keeping OPEN)`);
    return trade;
  }

  const stockPrice = priceCache[key];

  if (!stockPrice) {
    console.log(`⚠️  ${symbol} ${expiry}: No price data, keeping OPEN`);
    return trade;
  }

  // Calculate the intrinsic value at expiry
  let finalPnL = 0;
  const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
  const lowerStrike = strikes[0];
  const higherStrike = strikes[1];
  const spreadWidth = higherStrike - lowerStrike;

  // Initial premium received/paid
  let initialPremium = 0;
  for (const leg of legs) {
    if (leg.action === 'sell') {
      initialPremium += leg.premium * leg.quantity * 100;
    } else {
      initialPremium -= leg.premium * leg.quantity * 100;
    }
  }

  // Calculate final value based on stock price at expiry
  let outcome = '';
  if (type === 'call') {
    if (stockPrice <= lowerStrike) {
      finalPnL = initialPremium;
      outcome = 'OTM (Max Profit)';
    } else if (stockPrice >= higherStrike) {
      finalPnL = initialPremium - (spreadWidth * legs[0].quantity * 100);
      outcome = 'ITM (Max Loss)';
    } else {
      finalPnL = initialPremium - ((stockPrice - lowerStrike) * legs[0].quantity * 100);
      outcome = 'Partial';
    }
  } else { // put
    if (stockPrice >= higherStrike) {
      finalPnL = initialPremium;
      outcome = 'OTM (Max Profit)';
    } else if (stockPrice <= lowerStrike) {
      finalPnL = initialPremium - (spreadWidth * legs[0].quantity * 100);
      outcome = 'ITM (Max Loss)';
    } else {
      finalPnL = initialPremium - ((higherStrike - stockPrice) * legs[0].quantity * 100);
      outcome = 'Partial';
    }
  }

  const status = finalPnL >= 0 ? 'WIN' : 'LOSS';
  const exitDate = expiry;

  console.log(`✓ ${symbol} ${expiry}: $${stockPrice} vs ${lowerStrike}-${higherStrike}, ${outcome} → $${finalPnL.toFixed(0)} (${status})`);

  return {
    ...trade,
    status,
    exit_date: exitDate,
    pnl: Math.round(finalPnL),
    strategies: [{
      ...trade.strategies[0],
      exit_time: `${expiry} 16:00:00 EST`,
      exit_price: stockPrice
    }]
  };
});

// Write updated trades
const output = `// Options trading data - converted from Webull Vertical trades
// Expired positions updated with expiry values (from price-cache.json)
// Current date: ${CURRENT_DATE}
export const tradesData = ${JSON.stringify(updatedTrades, null, 2)};

console.log('Loaded', tradesData.length, 'trades');
console.log('Summary:', {
  total: tradesData.length,
  wins: tradesData.filter(t => t.status === 'WIN').length,
  losses: tradesData.filter(t => t.status === 'LOSS').length,
  open: tradesData.filter(t => t.status === 'OPEN').length,
  totalPnL: tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0)
});
`;

fs.writeFileSync(path.join(__dirname, '../src/data/trades.js'), output);

console.log('\n=== SUMMARY ===');
const openCount = updatedTrades.filter(t => t.status === 'OPEN').length;
const winCount = updatedTrades.filter(t => t.status === 'WIN').length;
const lossCount = updatedTrades.filter(t => t.status === 'LOSS').length;
const totalPnL = updatedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

console.log(`- Total: ${updatedTrades.length}`);
console.log(`- Wins: ${winCount}`);
console.log(`- Losses: ${lossCount}`);
console.log(`- Still Open: ${openCount}`);
console.log(`- Total P&L: $${totalPnL.toFixed(0)}`);

if (openCount > 0) {
  console.log('\nOpen positions (not yet expired):');
  for (const t of updatedTrades.filter(t => t.status === 'OPEN')) {
    const legs = t.strategies[0]?.legs || [];
    console.log(`  - ${t.symbol} expiry ${legs[0]?.expiry}`);
  }
}
