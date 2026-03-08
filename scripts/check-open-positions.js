import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read trades data
const tradesPath = path.join(__dirname, '../src/data/trades.js');
const tradesContent = fs.readFileSync(tradesPath, 'utf-8');

// Extract tradesData array
const match = tradesContent.match(/export const tradesData = (\[.*\]);/s);
if (!match) {
  console.error('Could not parse tradesData');
  process.exit(1);
}

const tradesData = JSON.parse(match[1]);

// Filter open positions
const openPositions = tradesData.filter(t => t.status === 'OPEN');

console.log(`Found ${openPositions.length} open positions\n`);

// Group by symbol and expiry for efficient querying
const bySymbolAndExpiry = {};

for (const pos of openPositions) {
  const legs = pos.strategies[0]?.legs || [];
  if (legs.length === 0) continue;

  const symbol = pos.symbol;
  const expiry = legs[0].expiry;
  const key = `${symbol}|${expiry}`;

  if (!bySymbolAndExpiry[key]) {
    bySymbolAndExpiry[key] = [];
  }
  bySymbolAndExpiry[key].push(pos);
}

console.log('Positions to check:');
for (const [key, positions] of Object.entries(bySymbolAndExpiry)) {
  const [symbol, expiry] = key.split('|');
  const totalPnL = positions.reduce((sum, p) => {
    const legs = p.strategies[0]?.legs || [];
    let pnl = 0;
    for (const leg of legs) {
      if (leg.action === 'sell') {
        pnl += leg.premium * leg.quantity * 100;
      } else {
        pnl -= leg.premium * leg.quantity * 100;
      }
    }
    return sum + pnl;
  }, 0);
  console.log(`  ${symbol} expiry ${expiry}: ${positions.length} position(s), net premium: $${totalPnL.toFixed(0)}`);
}

console.log('\nNeed to fetch historical prices for expiry dates to determine final P&L');
console.log('For each position, if OTM at expiry: P&L = premium received (credit) or -premium paid (debit)');

// Output a summary for manual checking or API use
console.log('\n=== SUMMARY FOR YAHOO FINANCE QUERIES ===\n');
const processedKeys = new Set();

for (const pos of openPositions) {
  const legs = pos.strategies[0]?.legs || [];
  if (legs.length === 0) continue;

  const symbol = pos.symbol;
  const expiry = legs[0].expiry;
  const key = `${symbol}|${expiry}`;

  if (processedKeys.has(key)) continue;
  processedKeys.add(key);

  // Find the lower and higher strikes
  const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
  const type = legs[0].type; // call or put
  const lowerStrike = strikes[0];
  const higherStrike = strikes[1];

  console.log(`${symbol} - Expiry: ${expiry} (${type})`);
  console.log(`  Strikes: ${lowerStrike} / ${higherStrike}`);
  console.log(`  Need stock price at market close on ${expiry}`);
  console.log(`  For ${type} vertical:`);
  if (type === 'call') {
    console.log(`    - If stock ≤ ${lowerStrike}: MAX PROFIT (expires OTM)`);
    console.log(`    - If stock ≥ ${higherStrike}: MAX LOSS (expires ITM)`);
    console.log(`    - If between: partial P&L`);
  } else {
    console.log(`    - If stock ≥ ${higherStrike}: MAX PROFIT (expires OTM)`);
    console.log(`    - If stock ≤ ${lowerStrike}: MAX LOSS (expires ITM)`);
    console.log(`    - If between: partial P&L`);
  }
  console.log('');
}

// Create a CSV file for easy checking
const csvRows = [['Symbol', 'Expiry', 'Type', 'LowerStrike', 'HigherStrike', 'NeedPriceAt']];

for (const pos of openPositions) {
  const legs = pos.strategies[0]?.legs || [];
  if (legs.length === 0) continue;

  const symbol = pos.symbol;
  const expiry = legs[0].expiry;
  const type = legs[0].type;
  const strikes = legs.map(l => l.strike).sort((a, b) => a - b);

  csvRows.push([symbol, expiry, type, strikes[0], strikes[1], expiry]);
}

// Remove duplicates
const uniqueRows = [csvRows[0]];
const seen = new Set();
seen.add(csvRows[0].join(','));

for (let i = 1; i < csvRows.length; i++) {
  const key = csvRows[i].join(',');
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRows.push(csvRows[i]);
  }
}

const csvContent = uniqueRows.map(row => row.join(',')).join('\n');
fs.writeFileSync(path.join(__dirname, '../open-positions-check.csv'), csvContent);
console.log('Saved open-positions-check.csv for reference');
