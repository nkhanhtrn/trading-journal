/**
 * News Fetcher Utility
 * Fetches market news from NewsAPI.org for trading symbols
 */

const NEWS_API_BASE = 'https://newsapi.org/v2'

// Common symbol names expansion for better search results
const SYMBOL_NAMES = {
  // ETFs
  'SPY': 'SPDR S&P 500 ETF Trust',
  'QQQ': 'Invesco QQQ Trust',
  'IWM': 'iShares Russell 2000 ETF',
  'GLD': 'SPDR Gold Shares',
  'SLV': 'iShares Silver Trust',
  'TLT': 'iShares 20+ Year Treasury Bond ETF',
  'VXX': 'iPath Series B S&P 500 VIX Short-Term Futures ETN',
  'VIX': 'CBOE Volatility Index',
  'VIXW': 'CBOE Volatility Index',  // Weekly VIX - same as VIX
  'DIA': 'SPDR Dow Jones Industrial Average ETF',
  'SPX': 'S&P 500 Index',
  'SPXW': 'S&P 500 Index',  // Weekly SPX - same as SPX
  'XLE': 'Energy Select Sector SPDR Fund',
  'XLF': 'Financial Select Sector SPDR Fund',
  'XLK': 'Technology Select Sector SPDR Fund',
  'XLI': 'Industrial Select Sector SPDR Fund',
  'XLV': 'Health Care Select Sector SPDR Fund',
  'XLY': 'Consumer Discretionary Select Sector SPDR Fund',
  'XLP': 'Consumer Staples Select Sector SPDR Fund',
  'XLB': 'Materials Select Sector SPDR Fund',
  'XLRE': 'Real Estate Select Sector SPDR Fund',
  'XLU': 'Utilities Select Sector SPDR Fund',

  // Popular stocks
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'GOOGL': 'Alphabet',
  'GOOG': 'Alphabet',
  'AMZN': 'Amazon',
  'TSLA': 'Tesla',
  'META': 'Meta Platforms',
  'NVDA': 'NVIDIA',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel',
  'NFLX': 'Netflix',
  'DIS': 'Walt Disney',
  'BA': 'Boeing',
  'WMT': 'Walmart',
  'JPM': 'JPMorgan Chase',
  'BAC': 'Bank of America',
  'C': 'Citigroup',
  'WFC': 'Wells Fargo',
  'GS': 'Goldman Sachs',
  'MS': 'Morgan Stanley',
  'BRK.B': 'Berkshire Hathaway',
  'BRK.B)': 'Berkshire Hathaway',
}

// Financial news domains to prioritize
const FINANCIAL_DOMAINS = [
  'bloomberg.com',
  'reuters.com',
  'cnbc.com',
  'wsj.com',
  'marketwatch.com',
  'yahoo.com',
  'seekingalpha.com',
  'thestreet.com',
  'fool.com',
  'benzinga.com',
  'finance.yahoo.com',
]

/**
 * Fetch news for a specific symbol and date
 * @param {string} symbol - Trading symbol (e.g., "AAPL", "SPY")
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} apiKey - NewsAPI.org API key
 * @param {string} proxyUrl - CORS proxy URL with {url} placeholder
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchMarketNews(symbol, date, apiKey, proxyUrl) {
  if (!apiKey?.trim()) {
    console.log('No NewsAPI key configured, skipping news fetch')
    return []
  }

  if (!proxyUrl?.trim()) {
    console.warn('No proxy URL configured for news. Please set a proxy URL in Settings.')
    return []
  }

  try {
    // Calculate date range: from 7 days before to 1 day after the trade date
    const tradeDate = new Date(date)
    const fromDate = new Date(tradeDate)
    fromDate.setDate(fromDate.getDate() - 7)
    const toDate = new Date(tradeDate)
    toDate.setDate(toDate.getDate() + 1)

    const fromStr = fromDate.toISOString().split('T')[0]
    const toStr = toDate.toISOString().split('T')[0]

    console.log(`Fetching news for ${symbol} from ${fromStr} to ${toStr}`)

    // Get expanded symbol name
    const fullName = SYMBOL_NAMES[symbol] || symbol

    // Use single query: combine symbol and full name for better results
    const query = fullName !== symbol ? `${symbol} OR ${fullName}` : symbol

    // Build NewsAPI URL
    const newsApiUrl = `${NEWS_API_BASE}/everything?` + new URLSearchParams({
      q: query,
      from: fromStr,
      to: toStr,
      language: 'en',
      sortBy: 'relevancy',
      apiKey: apiKey.trim(),
      pageSize: '50'
    })

    // Use CORS proxy (same pattern as priceFetcher)
    const url = proxyUrl.trim().replace('{url}', encodeURIComponent(newsApiUrl))

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'unknown', message: 'Failed to parse error' }))
      console.warn(`NewsAPI request failed:`, error.code || error.message)
      return []
    }

    const data = await response.json()

    if (data.articles?.length > 0) {
      console.log(`Found ${data.articles.length} articles for ${symbol}`)

      // Transform and score articles by relevance
      const scoredArticles = data.articles
        .filter(article => {
          // Filter out problematic sources
          const url = article.url || ''

          // Skip Yahoo News (consent redirect issues)
          if (url.includes('yahoo.com') || url.includes('consent.yahoo')) {
            return false
          }

          // Skip removed articles
          if (!article.title || article.title.includes('[Removed]')) {
            return false
          }

          return true
        })
        .map(article => {
          const title = article.title.toLowerCase()
          const description = (article.description || '').toLowerCase()
          const combinedText = title + ' ' + description

          // Calculate relevance score
          let score = 0

          // Symbol in title = higher score
          if (title.includes(symbol.toLowerCase())) score += 10
          if (title.includes(fullName.toLowerCase())) score += 10

          // Keywords in title
          if (title.includes('stock')) score += 3
          if (title.includes('etf')) score += 3
          if (title.includes('price')) score += 2
          if (title.includes('trading')) score += 2
          if (title.includes('market')) score += 1

          // Symbol in description
          if (description.includes(symbol.toLowerCase())) score += 5
          if (description.includes(fullName.toLowerCase())) score += 5

          // Financial domain bonus
          const domain = article.source?.name?.toLowerCase() || ''
          if (FINANCIAL_DOMAINS.some(d => article.url?.includes(d))) score += 5

          return {
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source?.name || 'Unknown',
            publishedAt: article.publishedAt,
            imageUrl: article.urlToImage,
            score
          }
        })
        .sort((a, b) => b.score - a.score) // Sort by relevance
        .slice(0, 10) // Take top 10 most relevant

      console.log(`Returning ${scoredArticles.length} most relevant articles`)

      // Remove score before returning
      return scoredArticles.map(({ score, ...article }) => article)
    }

    console.log(`No news found for ${symbol}`)
    return []

  } catch (error) {
    console.error('Failed to fetch market news:', error)
    return []
  }
}

/**
 * Check if NewsAPI key is valid
 * @param {string} apiKey - NewsAPI.org API key
 * @param {string} proxyUrl - CORS proxy URL with {url} placeholder
 * @returns {Promise<boolean>} True if key is valid
 */
export async function validateNewsApiKey(apiKey, proxyUrl) {
  if (!apiKey?.trim()) return false
  if (!proxyUrl?.trim()) return false

  try {
    const newsApiUrl = `${NEWS_API_BASE}/top-headlines?country=us&apiKey=${apiKey.trim()}`
    const url = proxyUrl.trim().replace('{url}', encodeURIComponent(newsApiUrl))
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })
    const data = await response.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}
