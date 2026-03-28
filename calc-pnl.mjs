import { tradesData } from './src/data/trades.js';

const wins = tradesData.filter(t => t.status === 'WIN');
const losses = tradesData.filter(t => t.status === 'LOSS');
const open = tradesData.filter(t => t.status === 'OPEN');

const totalWin = wins.reduce((s, t) => s + (t.pnl || 0), 0);
const totalLoss = losses.reduce((s, t) => s + (t.pnl || 0), 0);

console.log('P&L Breakdown:');
console.log('  Total: $' + (totalWin + totalLoss).toLocaleString());
console.log('  Gross Wins: +$' + totalWin.toLocaleString());
console.log('  Gross Losses: $' + totalLoss.toLocaleString());
console.log('');
console.log('By Status:');
console.log('  Wins: ' + wins.length + ' tickets');
console.log('  Losses: ' + losses.length + ' tickets');
console.log('  Open: ' + open.length + ' tickets');
console.log('');

// By symbol
const bySymbol = {};
for (const t of tradesData) {
  if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl: 0, count: 0 };
  bySymbol[t.symbol].pnl += t.pnl || 0;
  bySymbol[t.symbol].count++;
}
console.log('By Symbol:');
for (const [sym, data] of Object.entries(bySymbol)) {
  console.log('  ' + sym + ': $' + data.pnl.toLocaleString() + ' (' + data.count + ' tickets)');
}
