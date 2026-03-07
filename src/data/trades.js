// Options trading data - closed positions only
export const tradesData = [
  {
    ticket: 1001,
    date: '2026-02-15',
    symbol: 'SPY',
    status: 'WIN',
    exit_date: '2026-02-28',
    pnl: 285,
    strategies: [
      {
        name: 'Iron Condor',
        legs: [
          { type: 'put', strike: 435, expiry: '2026-02-28', premium: 0.65, quantity: 1, action: 'buy' },
          { type: 'put', strike: 440, expiry: '2026-02-28', premium: 1.40, quantity: 1, action: 'sell' },
          { type: 'call', strike: 465, expiry: '2026-02-28', premium: 1.35, quantity: 1, action: 'sell' },
          { type: 'call', strike: 470, expiry: '2026-02-28', premium: 0.70, quantity: 1, action: 'buy' }
        ],
        credit_received: 1.40,
        entry_time: '2026-02-15T10:30',
        entry_price: 1.40,
        exit_time: '2026-02-28T16:00',
        exit_price: 0.10
      }
    ],
    notes: 'February iron condor - theta decay worked perfectly'
  },
  {
    ticket: 1002,
    date: '2026-02-20',
    symbol: 'QQQ',
    status: 'WIN',
    exit_date: '2026-02-26',
    pnl: 145,
    strategies: [
      {
        name: 'Vertical Put Spread',
        legs: [
          { type: 'put', strike: 475, expiry: '2026-02-28', premium: 2.80, quantity: 2, action: 'buy' },
          { type: 'put', strike: 485, expiry: '2026-02-28', premium: 5.20, quantity: 2, action: 'sell' }
        ],
        credit_received: 4.80,
        entry_time: '2026-02-20T11:00',
        entry_price: 4.80,
        exit_time: '2026-02-26T15:30',
        exit_price: 0.60
      }
    ],
    notes: 'Bull put spread on QQQ - strong rally'
  },
  {
    ticket: 1003,
    date: '2026-02-25',
    symbol: 'IWM',
    status: 'LOSS',
    exit_date: '2026-02-27',
    pnl: -120,
    strategies: [
      {
        name: 'Vertical Call Spread',
        legs: [
          { type: 'call', strike: 200, expiry: '2026-03-07', premium: 2.10, quantity: 5, action: 'buy' },
          { type: 'call', strike: 195, expiry: '2026-03-07', premium: 3.50, quantity: 5, action: 'sell' }
        ],
        credit_received: 1.40,
        entry_time: '2026-02-25T09:45',
        entry_price: 1.40,
        exit_time: '2026-02-27T14:00',
        exit_price: 4.80
      }
    ],
    notes: 'Russell squeezed - stopped out for loss'
  },
  {
    ticket: 1004,
    date: '2026-03-01',
    symbol: 'SPY',
    status: 'WIN',
    exit_date: '2026-04-03',
    pnl: 423,
    strategies: [
      {
        name: 'Iron Condor',
        legs: [
          { type: 'put', strike: 440, expiry: '2026-03-22', premium: 0.50, quantity: 1, action: 'buy' },
          { type: 'put', strike: 445, expiry: '2026-03-22', premium: 1.20, quantity: 1, action: 'sell' },
          { type: 'call', strike: 460, expiry: '2026-03-22', premium: 1.50, quantity: 1, action: 'sell' },
          { type: 'call', strike: 465, expiry: '2026-03-22', premium: 0.80, quantity: 1, action: 'buy' }
        ],
        credit_received: 1.40,
        entry_time: '2026-03-03T11:00',
        entry_price: 1.40,
        exit_time: '2026-03-20T15:45',
        exit_price: 0.15
      },
      {
        name: 'Vertical Call Spread',
        legs: [
          { type: 'call', strike: 450, expiry: '2026-04-05', premium: 4.50, quantity: 2, action: 'buy' },
          { type: 'call', strike: 460, expiry: '2026-04-05', premium: 1.80, quantity: 2, action: 'sell' }
        ],
        debit_paid: 2.70,
        entry_time: '2026-03-20T09:45',
        entry_price: 2.70,
        exit_time: '2026-03-27T12:00',
        exit_price: 6.20
      },
      {
        name: 'Butterfly Call',
        legs: [
          { type: 'call', strike: 455, expiry: '2026-04-05', premium: 4.20, quantity: 1, action: 'buy' },
          { type: 'call', strike: 460, expiry: '2026-04-05', premium: 2.10, quantity: 2, action: 'sell' },
          { type: 'call', strike: 465, expiry: '2026-04-05', premium: 0.95, quantity: 1, action: 'buy' }
        ],
        debit_paid: 0.95,
        entry_time: '2026-03-26T10:15',
        entry_price: 0.95,
        exit_time: '2026-03-29T15:45',
        exit_price: 4.50
      }
    ],
    notes: 'SPY trading session - multiple strategies played out well'
  },
  {
    ticket: 1010,
    date: '2026-03-18',
    symbol: 'GLD',
    status: 'WIN',
    exit_date: '2026-03-27',
    pnl: 75,
    strategies: [
      {
        name: 'Vertical Call Spread',
        legs: [
          { type: 'call', strike: 215, expiry: '2026-04-05', premium: 2.20, quantity: 10, action: 'buy' },
          { type: 'call', strike: 220, expiry: '2026-04-05', premium: 0.90, quantity: 10, action: 'sell' }
        ],
        debit_paid: 1.30,
        entry_time: '2026-03-18T11:15',
        entry_price: 1.30,
        exit_time: '2026-03-27T12:30',
        exit_price: 3.80
      }
    ],
    notes: 'Gold breakout play - worked perfectly'
  }
]
