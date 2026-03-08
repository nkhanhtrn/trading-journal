import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, '../Webull_Orders_Records_Options.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle quoted fields
function parseCsvRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current || null);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current || null);
  return result;
}

function formatDate(dateStr) {
  // Convert MM/DD/YYYY to YYYY-MM-DD
  if (!dateStr) return null;
  const parts = dateStr.split(' ')[0].split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return dateStr;
}

function parseDateTime(dateStr) {
  // Parse MM/DD/YYYY HH:MM:SS for comparison
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(' ')[0].split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
  }
  return new Date(0);
}

function compareDates(timeA, timeB) {
  const dateA = parseDateTime(timeA);
  const dateB = parseDateTime(timeB);
  return dateA.getTime() - dateB.getTime();
}

function parseOptionSymbol(symbol) {
  if (!symbol) return null;
  // Format: GLD260320P00457000
  // YYMMDD or YYMM + Type(CE/PE) + Strike
  const match = symbol.match(/^([A-Z]+)2?(\d{2})(\d{2})(\d{2})([CP])(\d+)$/);
  if (!match) return null;

  const [, underlying, year, month, day, type, strike] = match;
  const strikePrice = parseInt(strike) / 1000;
  const dateStr = `20${year}-${month}-${day}`;

  return {
    underlying,
    year: `20${year}`,
    month,
    day,
    date: dateStr,
    type: type === 'C' ? 'call' : 'put',
    strike: strikePrice,
    rawSymbol: symbol
  };
}

// Parse all rows
const lines = csvContent.split('\n').filter(line => line.trim());
const allRows = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvRow(lines[i]);
  if (row && row.length >= 11) {
    const [name, symbol, side, status, filled, totalQty, price, avgPrice, tif, placedTime, filledTime] = row;
    allRows.push({
      name,
      symbol,
      side,
      status,
      filled: status === 'Filled' ? parseInt(filled) || 0 : 0,
      totalQty: parseInt(totalQty) || 0,
      price: price ? parseFloat(price.replace('@', '')) || 0 : 0,
      avgPrice: parseFloat(avgPrice) || 0,
      placedTime,
      filledTime,
      rowIndex: i
    });
  }
}

// Group rows by trade - a trade consists of a header row + leg rows
const trades = [];
let i = 0;

while (i < allRows.length) {
  const row = allRows[i];

  // Check if this is a Vertical trade header (has "Vertical" in name, no symbol)
  if (row.name && row.name.includes('Vertical') && !row.symbol) {
    const trade = {
      ticketName: row.name,
      side: row.side,
      quantity: row.filled,
      price: row.avgPrice,
      placedTime: row.placedTime,
      filledTime: row.filledTime,
      status: row.status,
      legs: []
    };

    // Collect leg rows (rows with empty name but have symbol)
    i++;
    while (i < allRows.length) {
      const legRow = allRows[i];
      // Stop if we hit another header or non-leg row
      if (legRow.name || !legRow.symbol) break;

      const optionInfo = parseOptionSymbol(legRow.symbol);
      if (optionInfo) {
        trade.legs.push({
          ...optionInfo,
          side: legRow.side,
          quantity: legRow.filled,
          premium: legRow.avgPrice,
          filledTime: legRow.filledTime
        });
      }
      i++;
    }

    // Only include filled trades with legs
    if (trade.status === 'Filled' && trade.legs.length > 0) {
      trades.push(trade);
    }
  } else {
    i++;
  }
}

// Group by ticket name
const ticketGroups = {};

for (const trade of trades) {
  const key = trade.ticketName;
  trade.ticketName = key; // Ensure ticketName is set
  if (!ticketGroups[key]) {
    ticketGroups[key] = [];
  }
  ticketGroups[key].push(trade);
}

// Match opening and closing trades (with proper consumption tracking)
const matchedTrades = [];
let ticketCounter = 1000;

for (const [ticketName, tradesList] of Object.entries(ticketGroups)) {
  // Sort by filled time
  tradesList.sort((a, b) => {
    const timeA = a.filledTime || a.placedTime || '';
    const timeB = b.filledTime || b.placedTime || '';
    return compareDates(timeA, timeB);
  });

  // Group trades by their leg signatures for matching
  const tradeGroups = [];
  const used = new Set();

  for (let i = 0; i < tradesList.length; i++) {
    if (used.has(i)) continue;

    const trade = tradesList[i];
    const legSignature = trade.legs.map(l => `${l.strike}-${l.type}-${l.date}`).sort().join('|');

    // Find all trades with matching leg signature
    const matchingTrades = [trade];
    used.add(i);

    for (let j = i + 1; j < tradesList.length; j++) {
      if (used.has(j)) continue;
      const candidate = tradesList[j];
      const candidateSig = candidate.legs.map(l => `${l.strike}-${l.type}-${l.date}`).sort().join('|');

      if (legSignature === candidateSig) {
        matchingTrades.push(candidate);
        used.add(j);
      }
    }

    if (matchingTrades.length > 0) {
      tradeGroups.push(matchingTrades);
    }
  }

  // Process each group of matching trades
  for (const group of tradeGroups) {
    // Sort by time
    group.sort((a, b) => {
      const timeA = a.filledTime || a.placedTime || '';
      const timeB = b.filledTime || b.placedTime || '';
      return compareDates(timeA, timeB);
    });

    // Separate into credit (Sell to open) and debit (Buy to open) spreads
    // Credit spreads: first leg is Sell (higher strike for calls, lower for puts)
    // Debit spreads: first leg is Buy (lower strike for calls, higher for puts)
    const creditTrades = [];
    const debitTrades = [];

    for (const trade of group) {
      const isCredit = trade.side === 'Sell';
      if (isCredit) {
        creditTrades.push(trade);
      } else {
        debitTrades.push(trade);
      }
    }

    // Match credits (short) with debits (long) in FIFO order
    // Credits are closed by buying back (debit transaction)
    // Debits are closed by selling back (credit transaction)
    let creditIdx = 0;
    let debitIdx = 0;
    const usedCredits = new Set();
    const usedDebits = new Set();

    // Process all trades in time order
    const allTrades = [...group].sort((a, b) => compareDates(a.filledTime || a.placedTime, b.filledTime || b.placedTime));
    const openPositions = []; // Tracks open positions with their quantities

    for (const trade of allTrades) {
      const isCredit = trade.side === 'Sell';
      const tradeQty = trade.legs[0].quantity;

      if (isCredit) {
        // Check if this closes an existing debit position
        let remainingCreditQty = tradeQty;
        let matched = false;

        // Try to close as many debit positions as possible
        for (let i = 0; i < openPositions.length && remainingCreditQty > 0; i++) {
          const openPos = openPositions[i];
          if (!openPos.isCredit && openPos.remaining > 0) {
            // This credit closes (part of) the debit position
            const closeQty = Math.min(remainingCreditQty, openPos.remaining);
            const pnl = calculatePnL(openPos.trade, trade, closeQty);

            matchedTrades.push(createTicket(openPos.trade, trade, closeQty, pnl, ticketCounter++, ticketName, closeQty));
            openPos.remaining -= closeQty;
            remainingCreditQty -= closeQty;
            matched = true;

            if (openPos.remaining <= 0) {
              openPositions.splice(i, 1);
              i--; // Adjust index after removal
            }
          }
        }

        // If this credit has remaining quantity, it becomes an open position
        if (remainingCreditQty > 0) {
          openPositions.push({ trade, remaining: remainingCreditQty, isCredit: true });
        }
      } else {
        // This is a debit trade
        let remainingDebitQty = tradeQty;
        let matched = false;

        // Try to close as many credit positions as possible
        for (let i = 0; i < openPositions.length && remainingDebitQty > 0; i++) {
          const openPos = openPositions[i];
          if (openPos.isCredit && openPos.remaining > 0) {
            // This debit closes (part of) the credit position
            const closeQty = Math.min(remainingDebitQty, openPos.remaining);
            const pnl = calculatePnL(openPos.trade, trade, closeQty);

            matchedTrades.push(createTicket(openPos.trade, trade, closeQty, pnl, ticketCounter++, ticketName, closeQty));
            openPos.remaining -= closeQty;
            remainingDebitQty -= closeQty;
            matched = true;

            if (openPos.remaining <= 0) {
              openPositions.splice(i, 1);
              i--; // Adjust index after removal
            }
          }
        }

        // If this debit has remaining quantity, it becomes an open position
        if (remainingDebitQty > 0) {
          openPositions.push({ trade, remaining: remainingDebitQty, isCredit: false });
        }
      }
    }

    // Add remaining open positions
    for (const openPos of openPositions) {
      if (openPos.remaining > 0) {
        matchedTrades.push(createOpenTicket(openPos.trade, openPos.remaining, ticketCounter++, ticketName));
      }
    }
  }
}

function calculatePnL(openTrade, closeTrade, qty) {
  let pnl = 0;
  for (const openLeg of openTrade.legs) {
    const closeLeg = closeTrade.legs.find(l =>
      l.strike === openLeg.strike &&
      l.type === openLeg.type &&
      l.date === openLeg.date
    );

    if (closeLeg) {
      if (openLeg.side === 'Buy') {
        pnl += (closeLeg.premium - openLeg.premium) * qty * 100;
      } else {
        pnl -= (closeLeg.premium - openLeg.premium) * qty * 100;
      }
    }
  }
  return pnl;
}

function createTicket(openTrade, closeTrade, qty, pnl, ticketNum, ticketName, closeQty) {
  const openState = compareDates(openTrade.filledTime, closeTrade.filledTime) < 0 ? openTrade : closeTrade;
  const closeState = compareDates(openTrade.filledTime, closeTrade.filledTime) < 0 ? closeTrade : openTrade;

  const legs = [];
  for (const leg of openState.legs) {
    legs.push({
      type: leg.type,
      strike: leg.strike,
      expiry: leg.date,
      premium: leg.premium,
      quantity: closeQty, // Use the actual closed quantity
      action: leg.side.toLowerCase()
    });
  }
  for (const leg of closeState.legs) {
    legs.push({
      type: leg.type,
      strike: leg.strike,
      expiry: leg.date,
      premium: leg.premium,
      quantity: closeQty, // Use the actual closed quantity
      action: leg.side.toLowerCase()
    });
  }

  return {
    ticket: ticketNum,
    date: formatDate(openState.filledTime),
    symbol: openState.legs[0]?.underlying || ticketName.split(' ')[0],
    status: pnl >= 0 ? 'WIN' : 'LOSS',
    exit_date: formatDate(closeState.filledTime),
    pnl: Math.round(pnl),
    strategies: [{
      name: ticketName,
      legs,
      entry_time: openState.filledTime || openState.placedTime || '',
      entry_price: null,
      exit_time: closeState.filledTime || closeState.placedTime || '',
      exit_price: null
    }],
    notes: ticketName
  };
}

function createOpenTicket(trade, remainingQty, ticketNum, ticketName) {
  const legs = [];
  for (const leg of trade.legs) {
    legs.push({
      type: leg.type,
      strike: leg.strike,
      expiry: leg.date,
      premium: leg.premium,
      quantity: remainingQty, // Use remaining quantity, not original
      action: leg.side.toLowerCase()
    });
  }

  return {
    ticket: ticketNum,
    date: formatDate(trade.filledTime),
    symbol: trade.legs[0]?.underlying || ticketName.split(' ')[0],
    status: 'OPEN',
    exit_date: null,
    pnl: 0,
    strategies: [{
      name: ticketName,
      legs,
      entry_time: trade.filledTime || trade.placedTime || '',
      entry_price: null,
      exit_time: '',
      exit_price: null
    }],
    notes: ticketName
  };
}

// Sort by ticket number descending
matchedTrades.sort((a, b) => b.ticket - a.ticket);

// Convert to trades.js format
const output = `// Options trading data - converted from Webull Vertical trades
export const tradesData = ${JSON.stringify(matchedTrades, null, 2)};

console.log('Loaded', tradesData.length, 'trades');
console.log('Summary:', {
  total: tradesData.length,
  wins: tradesData.filter(t => t.status === 'WIN').length,
  losses: tradesData.filter(t => t.status === 'LOSS').length,
  open: tradesData.filter(t => t.status === 'OPEN').length,
  totalPnL: tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0)
});
`;

// Write to trades.js
fs.writeFileSync(path.join(__dirname, '../src/data/trades.js'), output);

console.log('Parsed', matchedTrades.length, 'vertical trades from Webull CSV');
console.log('Written to src/data/trades.js');
console.log('\nSummary:');
console.log('- Total trades:', matchedTrades.length);
console.log('- Wins:', matchedTrades.filter(t => t.status === 'WIN').length);
console.log('- Losses:', matchedTrades.filter(t => t.status === 'LOSS').length);
console.log('- Open:', matchedTrades.filter(t => t.status === 'OPEN').length);
console.log('- Total P&L: $' + matchedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(0));
