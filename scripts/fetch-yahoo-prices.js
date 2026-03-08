import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yahoo Finance historical data URL
function getYahooHistoryUrl(symbol, startDate, endDate) {
  // Yahoo Finance uses timestamp in seconds
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);
  return `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${start}&period2=${end}&interval=1d&events=history`;
}

// Symbols and expiry dates we need
const positions = [
  { symbol: 'DJT', expiry: '2025-08-29' },
  { symbol: 'DJT', expiry: '2025-07-25' },
  { symbol: 'DJT', expiry: '2025-06-27' },
  { symbol: 'DJT', expiry: '2025-07-18' },
  { symbol: 'SOFI', expiry: '2025-02-21' },
  { symbol: 'VIX', expiry: '2026-05-19' },
  { symbol: 'VIX', expiry: '2025-07-16' },
  { symbol: 'VIX', expiry: '2025-04-16' },
  { symbol: '^VIX', expiry: '2025-07-16' },  // Try ^VIX for VIX index
  { symbol: '^VIX', expiry: '2025-04-16' },
  { symbol: 'GLD', expiry: '2026-03-20' },
];

// SPXW uses SPX index
const spxwPositions = [
  { symbol: '^GSPC', expiry: '2025-10-24' },
  { symbol: '^GSPC', expiry: '2025-04-14' },
  { symbol: '^GSPC', expiry: '2025-04-11' },
  { symbol: '^GSPC', expiry: '2025-04-10' },
  { symbol: '^GSPC', expiry: '2025-02-18' },
];

// VIXW - try VIX index as proxy
const vixwPositions = [
  { symbol: '^VIX', expiry: '2026-03-03' },
  { symbol: '^VIX', expiry: '2025-07-23' },
  { symbol: '^VIX', expiry: '2025-06-03' },
  { symbol: '^VIX', expiry: '2025-04-23' },
];

async function fetchPrice(symbol, date) {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const url = getYahooHistoryUrl(symbol, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.text();
    const lines = data.split('\n').slice(1); // Skip header

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      const rowDate = parts[0];
      const close = parseFloat(parts[4]); // Close price is column 4 (index 4)

      if (rowDate === date) {
        return close;
      }
    }

    // If exact date not found, return closest
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      const close = parseFloat(parts[4]);
      return close;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${symbol}: ${error.message}`);
    return null;
  }
}

async function main() {
  const allPositions = [...positions, ...spxwPositions, ...vixwPositions];
  const prices = {};

  console.log('Fetching prices from Yahoo Finance...\n');

  for (const pos of allPositions) {
    const key = `${pos.symbol.replace('^', '')}|${pos.expiry}`;
    const price = await fetchPrice(pos.symbol, pos.expiry);

    if (price) {
      prices[key] = price;
      console.log(`✓ ${pos.symbol} ${pos.expiry}: $${price}`);
    } else {
      console.log(`✗ ${pos.symbol} ${pos.expiry}: Not found`);
    }

    // Rate limiting - sleep between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== Prices object for update-expired-positions.js ===\n');
  console.log('const historicalPrices = {');
  for (const [key, price] of Object.entries(prices)) {
    console.log(`  '${key}': ${price},`);
  }
  console.log('};');

  // Save to file
  const pricesPath = path.join(__dirname, '../historical-prices.json');
  fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));
  console.log(`\nSaved to ${pricesPath}`);
}

main().catch(console.error);
