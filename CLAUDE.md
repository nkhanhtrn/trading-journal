# Trading Journal - Development Guide

This document provides basic steps for setting up, testing, and deploying the Trading Journal project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [CSV Parser](#csv-parser)

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Git

## Project Setup

```bash
# Clone the repository
git clone https://github.com/nkhanhtrn/trading-journal.git
cd trading-journal

# Install dependencies
npm install

# Set up environment variables (optional - for Firebase)
cp .env.example .env
# Edit .env with your Firebase credentials
```

## Development

### Start Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000/trading-journal/`

### Build for Production

```bash
npm run build
```

Build output is in the `dist/` directory.

## Testing

### Run Unit Tests

```bash
# Run matching logic tests
node tests/matching.test.js

# Run sample data integration tests
node tests/sample-data.test.js
```

### Expected Output

```
🧪 Sample Data Integration Tests
============================================================
✅ Sample CSV - Vertical Spread match (SPXW)
✅ Sample CSV - Single option match (GLD Put)
✅ Sample CSV - Straddle match (SPXW)
✅ Sample CSV - parseOptionSymbol function
✅ Sample CSV - Symbol field in legs
✅ Sample CSV - Total ticket count
✅ Sample CSV - P&L calculations
============================================================

Results: 7 passed, 0 failed
```

## Deployment

### Deploy to GitHub Pages

```bash
# Build the project
npm run build

# Deploy dist/ to GitHub Pages
# The dist/ directory contains the built files
```

### Alternative Deployment

The `dist/` directory can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3 + CloudFront

## Project Structure

```
trading-journal/
├── src/
│   ├── App.vue              # Main application component
│   ├── components/          # Vue components
│   ├── composables/         # Vue composables (useAuth)
│   ├── utils/               # Utility modules
│   │   ├── parseWebull.js   # CSV parser
│   │   ├── strategyDetector.js
│   │   └── firebase.js
│   └── data/                # Static data (optional)
├── tests/
│   ├── matching.test.js     # Unit tests for matching logic
│   └── sample-data.test.js  # Integration tests
├── index.html
├── vite.config.js
└── package.json
```

## CSV Parser

### Parsing Webull CSV Files

The app includes a built-in CSV parser for Webull options trading data.

### Using In-App CSV Upload

1. Click the CSV upload button in the app
2. Select your Webull CSV file
3. The app will parse and import the trades automatically

#### CSV Format Expected

```csv
Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time
SPXW Vertical,,Buy,Filled,10,10,@1.25,1.25,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
,SPXW260327C06540000,Sell,Filled,10,10,@12.97,12.97,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
,SPXW260327C06545000,Buy,Filled,10,10,@11.72,11.72,DAY,03/26/2026 16:01:46 EDT,03/26/2026 16:01:46 EDT
```

#### Supported Strategies

- **Vertical Spreads** - Bull/Bear call/put spreads
- **Straddles** - Long/Short straddles
- **Strangles** - Long/Short strangles
- **Iron Condors** - 4-leg iron condors
- **Single Options** - Long/Short calls and puts

## Local Storage

The app uses browser `localStorage` to persist data:

- `trading_journal_tickets` - Parsed tickets
- `trading_journal_raw_transactions` - Raw CSV transactions
- `trading_journal_settings` - User settings
- `trading_journal_price_cache` - Cached historical prices

### Clear Local Storage

```javascript
// In browser console
localStorage.clear()
location.reload()
```

Or use the "Clear All Data" button in the app settings.

## Firebase Integration (Optional)

The app supports Firebase for cloud sync:

1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Add your credentials to `.env`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Troubleshooting

### Build Errors

If you encounter build errors related to `formatDate`, `parseOptionSymbol`, etc.:

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Tests Failing

```bash
# Ensure you're using Node.js v18+
node --version

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Port Already in Use

The dev server will try ports 3000, 3001, 3002, etc. if the default is in use.

To use a specific port:
```bash
npm run dev -- --port=3000
```
