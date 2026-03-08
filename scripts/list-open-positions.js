import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tradesPath = path.join(__dirname, '../src/data/trades.js');
const tradesContent = fs.readFileSync(tradesPath, 'utf-8');

const match = tradesContent.match(/export const tradesData = (\[.*\]);/s);
const tradesData = JSON.parse(match[1]);

const openPositions = tradesData.filter(t => t.status === 'OPEN');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                    OPEN POSITIONS');
console.log('═══════════════════════════════════════════════════════════════════\n');

openPositions.sort((a, b) => new Date(a.strategies[0]?.legs[0]?.expiry) - new Date(b.strategies[0]?.legs[0]?.expiry));

for (const pos of openPositions) {
  const legs = pos.strategies[0]?.legs || [];
  if (legs.length === 0) continue;

  const symbol = pos.symbol;
  const date = pos.date;
  const expiry = legs[0].expiry;
  const type = legs[0].type.toUpperCase();
  const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
  const lowerStrike = strikes[0];
  const higherStrike = strikes[1];

  // Calculate days to expiry
  const daysToExpiry = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));

  // Calculate initial premium
  let initialPremium = 0;
  for (const leg of legs) {
    if (leg.action === 'sell') {
      initialPremium += leg.premium * leg.quantity * 100;
    } else {
      initialPremium -= leg.premium * leg.quantity * 100;
    }
  }

  const isCredit = initialPremium > 0;

  console.log(`┌─────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ Ticket #${pos.ticket}    ${symbol.toString().padEnd(6)}    ${type} VERTICAL          │`);
  console.log(`├─────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ Open Date:    ${date}                                                  │`);
  console.log(`│ Expiry Date:   ${expiry}    (${daysToExpiry > 0 ? daysToExpiry + ' days' : 'EXPIRED'})              │`);
  console.log(`│                                                                             │`);
  console.log(`│ Position:     ${isCredit ? 'CREDIT' : 'DEBIT'} ${type} SPREAD                                │`);
  console.log(`│               Sell ${legs.find(l => l.action === 'sell')?.strike || '-'} @ $${legs.find(l => l.action === 'sell')?.premium.toFixed(2) || '-'}   │`);
  console.log(`│               Buy  ${legs.find(l => l.action === 'buy')?.strike || '-'} @ $${legs.find(l => l.action === 'buy')?.premium.toFixed(2) || '-'}   │`);
  console.log(`│                                                                             │`);
  console.log(`│ Contracts:    ${legs[0]?.quantity || '-'}                                                 │`);
  console.log(`│ Spread Width: $${(higherStrike - lowerStrike).toFixed(2)}                            │`);
  console.log(`│                                                                             │`);
  console.log(`│ Net Premium: ${initialPremium >= 0 ? '+$' : '-$'}${Math.abs(initialPremium).toFixed(2)}              │`);
  console.log(`│ Max Profit:   ${isCredit ? '+$' + Math.abs(initialPremium).toFixed(2) : '$0.00'}            │`);
  console.log(`│ Max Loss:     ${isCredit ? '-$' + ((higherStrike - lowerStrike) * legs[0]?.quantity * 100 - Math.abs(initialPremium)).toFixed(2) : '-$' + Math.abs(initialPremium).toFixed(2)} │`);
  console.log(`└─────────────────────────────────────────────────────────────────────┘`);
  console.log('');
}

console.log(`═══════════════════════════════════════════════════════════════════`);
console.log(`Total Open Positions: ${openPositions.length}`);
console.log(`═══════════════════════════════════════════════════════════════════`);
