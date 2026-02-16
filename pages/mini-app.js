import { useEffect, useState } from 'react'
import Head from 'next/head'

const POLYMARKET_API = '/api/polymarket'

const WATCHLIST_MARKETS = [
  { query: 'fed chair', label: '🏦 Fed Chair' },
  { query: 'china invade taiwan', label: '🇹🇼 Taiwan Invasion' },
  { query: 'tariff revenue', label: '💰 Tariff Revenue' },
  { query: 'bitcoin 150k', label: '₿ BTC $150K' },
]

function MarketCard({ market }) {
  const outcomes = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes || []
  const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices || []

  const yesPrice = prices[0] ? (parseFloat(prices[0]) * 100).toFixed(1) : null
  const noPrice = prices[1] ? (parseFloat(prices[1]) * 100).toFixed(1) : null

  return (
    <div style={styles.card}>
      <div style={styles.cardQuestion}>{market.question}</div>
      {yesPrice && (
        <div style={styles.probRow}>
          <div style={styles.probBarBg}>
            <div
              style={{
                ...styles.probBarFill,
                width: `${yesPrice}%`,
                background: parseFloat(yesPrice) > 50 ? '#00ff88' : '#ff4444',
              }}
            />
          </div>
          <span style={styles.probText}>{yesPrice}%</span>
        </div>
      )}
    </div>
  )
}

function Section({ label, markets, loading }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}>{label}</div>
      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : markets.length === 0 ? (
        <div style={styles.loading}>No markets found</div>
      ) : (
        markets.slice(0, 3).map((m, i) => <MarketCard key={i} market={m} />)
      )}
    </div>
  )
}

export default function MiniApp() {
  const [sections, setSections] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [tg, setTg] = useState(null)

  useEffect(() => {
    // Initialize Telegram WebApp SDK
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp
      webapp.ready()
      webapp.expand()
      setTg(webapp)

      // Match Telegram theme
      document.body.style.backgroundColor = webapp.backgroundColor || '#111'
    }

    fetchMarkets()
  }, [])

  async function fetchMarkets() {
    setLoading(true)
    const results = {}

    for (const item of WATCHLIST_MARKETS) {
      try {
        const res = await fetch(
          `${POLYMARKET_API}?q=${encodeURIComponent(item.query)}`
        )
        const filtered = await res.json()
        results[item.label] = filtered
      } catch (e) {
        results[item.label] = []
      }
    }

    setSections(results)
    setLoading(false)
    setLastUpdated(new Date().toLocaleTimeString())
  }

  return (
    <>
      <Head>
        <title>Jarvis Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔮 Jarvis Dashboard</h1>
          <p style={styles.subtitle}>Polymarket Signals</p>
          {lastUpdated && <p style={styles.updated}>Updated: {lastUpdated}</p>}
        </div>

        {WATCHLIST_MARKETS.map((item) => (
          <Section
            key={item.label}
            label={item.label}
            markets={sections[item.label] || []}
            loading={loading}
          />
        ))}

        <button style={styles.refreshBtn} onClick={fetchMarkets}>
          🔄 Refresh
        </button>
      </div>
    </>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#111',
    color: '#fff',
    fontFamily: '-apple-system, system-ui, sans-serif',
    padding: '16px',
    maxWidth: '480px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  updated: {
    fontSize: '11px',
    color: '#555',
    marginTop: '4px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#aaa',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '8px',
    border: '1px solid #2a2a3e',
  },
  cardQuestion: {
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px',
    lineHeight: '1.3',
  },
  probRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  probBarBg: {
    flex: 1,
    height: '20px',
    background: '#333',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  probText: {
    fontSize: '14px',
    fontWeight: '700',
    minWidth: '48px',
    textAlign: 'right',
  },
  loading: {
    color: '#555',
    fontSize: '13px',
    padding: '8px 0',
  },
  refreshBtn: {
    width: '100%',
    padding: '14px',
    background: '#1a1a2e',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
}
