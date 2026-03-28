# Matching Logic Tests by Strategy Type

## Running Tests

```bash
npm test
```

## Test Organization

Tests are organized by strategy type as implemented in the parser:

### [SINGLE] Single Options (Long/Short Calls & Puts)

| Test | Description | Scenario |
|------|-------------|----------|
| Long Call - single entry/exit | Basic matching | Buy 1 @ $5, Sell 1 @ $7 |
| Long Call - multiple entries, single exit | FIFO partial close | Buy 2@5, Buy 3@6, Sell 4@8 |
| Long Call - single entry, multiple exits | Partial closing | Buy 5, Sell 2@7, Sell 3@8 |
| Long Call - complex FIFO | Multiple in/out | Buy 3@4, Buy 2@5, Buy 4@6, Sell 5@8, Sell 3@9 |
| Short Put - sell to open | Short position | Sell 2@3, Buy 2@1 |
| Different strikes | No match | Buy $450, Sell $455 |
| Losing trade | Loss scenario | Buy @ $10, Sell @ $5 |

### [MULTI-LEG] Multi-Leg Strategies (Vertical Spreads, Iron Condors, Straddles, Strangles)

| Test | Description | Scenario |
|------|-------------|----------|
| Straddle - single entry/exit | Basic straddle | Buy straddle @ $190, Sell @ $195 |
| Straddle - multiple entries | FIFO with 2 legs | Buy 2 straddles, Buy 3 straddles, Sell 4 |
| Vertical Spread - credit spread | Spread close | Sell spread @ -$30, Buy to close |
| Different legs | No match | Different strike/expiry combos |
| Iron Condor - 4 legs | 4-leg strategy | Full iron condor entry/exit |

## Matching Key Differences

| Strategy Type | Match Key | Can Match Condition |
|---------------|-----------|---------------------|
| Single Options | Raw symbol (e.g., `SPY260115C00450000`) | Opposite side, same symbol |
| Multi-Leg | All leg symbols sorted & joined (e.g., `SPXW260115C06600000\|SPXW260115P06600000`) | Opposite side, same leg symbols |

## Key Scenarios Tested

### FIFO (First In, First Out)
- Multiple entry prices are closed in chronological order
- Each closed position preserves its original entry price
- Remaining quantities stay open

### Partial Closes
- Single exit closing multiple entry lots
- Single entry closed by multiple exit lots
- Result in multiple tickets with different P&L

### Symbol Matching
- Only identical raw symbols match (strike + type + expiry)
- Different strikes/expiries do NOT match
- Multi-leg must have ALL matching legs

### Position Types
- **Long**: Buy → Sell
- **Short**: Sell → Buy
- **Multi-leg**: All legs matched together
