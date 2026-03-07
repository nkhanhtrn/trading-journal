# Trading Journal

A Vue.js trading journal application for tracking your trades, analyzing performance, and improving your trading strategy.

## Features

- 📊 **Dashboard Stats**: Track total trades, win rate, total P&L, and average P&L per trade
- 🔍 **Search & Filter**: Filter trades by symbol, type (long/short), and status (win/loss/open)
- 📝 **Trade Management**: Add, edit, and delete trades with detailed information
- 💾 **Local Storage**: All data is saved locally in your browser
- 📈 **Trade Details**: View detailed trade information including risk-reward ratio
- 🎨 **Dark Theme**: Easy on the eyes for extended trading sessions

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Trade Data Structure

Each trade contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| date | string | Trade date (YYYY-MM-DD) |
| symbol | string | Stock/crypto symbol (e.g., AAPL) |
| type | string | LONG or SHORT |
| entryPrice | number | Entry price per share |
| exitPrice | number | Exit price per share |
| quantity | number | Number of shares/contracts |
| stopLoss | number | Stop loss price (optional) |
| takeProfit | number | Take profit price (optional) |
| status | string | WIN, LOSS, or OPEN |
| pnl | number | Profit/loss in dollars |
| pnlPercent | number | Profit/loss percentage |
| notes | string | Trade notes and observations |

## Sample Data

The app comes pre-loaded with 10 sample trades from January-February 2025 to help you explore the features.

## Project Structure

```
trading-journal/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── data/
    │   └── trades.js      # Sample trade data
    └── components/
        ├── StatCard.vue           # Statistics card component
        ├── TradeDetailModal.vue   # Trade details modal
        └── TradeFormModal.vue     # Add/edit trade form
```

## Importing from CSV

You can easily import your own trades by modifying the `src/data/trades.js` file. The CSV format should include:

```
Date,Symbol,Type,Entry Price,Exit Price,Quantity,Stop Loss,Take Profit,Status,P&L,P&L %,Notes
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Tech Stack

- **Vue.js 3** - Progressive JavaScript framework
- **Vite** - Next generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Font Awesome** - Icon library (via CDN)

## Future Enhancements

- CSV import/export functionality
- Charts and visualizations
- Performance analytics by time period
- Strategy tagging and filtering
- Multiple trading accounts support
- Cloud sync capabilities

## License

MIT
