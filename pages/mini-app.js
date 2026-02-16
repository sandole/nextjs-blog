import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'

const POLYMARKET_API = '/api/polymarket'

function fmtVolume(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const BAR_COLORS = ['#00ff88', '#4ea8de', '#f0c040']

function OutcomeBar({ outcome, colorIdx }) {
  let label = outcome.question
    .replace(/^Will (the )?/i, '')
    .replace(/\?$/, '')
  if (label.length > 45) label = label.substring(0, 42) + '...'
  const pct = outcome.yes
  const color = BAR_COLORS[colorIdx] || BAR_COLORS[0]

  return (
    <div style={styles.outcomeRow}>
      <div style={styles.barBg}>
        <div
          style={{
            ...styles.barFill,
            width: `${Math.max(pct, 3)}%`,
            background: color,
          }}
        />
        <span style={styles.barLabel}>{label}</span>
      </div>
      <span style={styles.pctText}>{pct.toFixed(0)}%</span>
    </div>
  )
}

function EventCard({ event }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{event.title}</div>
      <div style={styles.cardMeta}>{fmtVolume(event.volume)} volume</div>
      <div style={styles.outcomes}>
        {event.outcomes.length > 0 ? (
          event.outcomes.map((o, i) => <OutcomeBar key={i} outcome={o} colorIdx={i} />)
        ) : (
          <div style={styles.dim}>No outcome data</div>
        )}
      </div>
    </div>
  )
}

export default function MiniApp() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${POLYMARKET_API}?top=12`)
      const data = await res.json()
      setMarkets(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch markets:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp
      webapp.ready()
      webapp.expand()
      document.body.style.backgroundColor = webapp.backgroundColor || '#0f0f1a'
    }

    fetchMarkets()
    const interval = setInterval(fetchMarkets, 60000)
    return () => clearInterval(interval)
  }, [fetchMarkets])

  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0)

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
          <p style={styles.subtitle}>Live Prediction Markets</p>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#4ea8de' }}>
              {loading ? '-' : markets.length}
            </div>
            <div style={styles.statLabel}>Markets</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#f0c040' }}>
              {loading ? '-' : fmtVolume(totalVolume)}
            </div>
            <div style={styles.statLabel}>Total Volume</div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <span style={styles.dim}>Loading markets...</span>
          </div>
        ) : (
          markets.map((m, i) => <EventCard key={i} event={m} />)
        )}

        <button style={styles.refreshBtn} onClick={fetchMarkets}>
          🔄 Refresh
        </button>

        {lastUpdated && <p style={styles.updated}>Last updated: {lastUpdated}</p>}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    color: '#eaeaea',
    fontFamily: '-apple-system, system-ui, sans-serif',
    padding: '12px',
    maxWidth: '480px',
    margin: '0 auto',
    WebkitFontSmoothing: 'antialiased',
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 2px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '16px',
  },
  statCard: {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '14px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '1.6rem',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: '#888',
    marginTop: '2px',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  cardMeta: {
    fontSize: '0.72rem',
    color: '#888',
    marginBottom: '10px',
  },
  outcomes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  outcomeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  barBg: {
    flex: 1,
    height: '26px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.4s ease',
  },
  barLabel: {
    position: 'absolute',
    top: '50%',
    left: '8px',
    transform: 'translateY(-50%)',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'white',
    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(100% - 16px)',
  },
  pctText: {
    fontSize: '0.82rem',
    fontWeight: '700',
    minWidth: '42px',
    textAlign: 'right',
  },
  dim: {
    color: '#555',
    fontSize: '0.8rem',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #333',
    borderTopColor: '#4ea8de',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  refreshBtn: {
    width: '100%',
    padding: '13px',
    background: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  updated: {
    fontSize: '0.68rem',
    color: '#555',
    textAlign: 'center',
    marginTop: '8px',
    paddingBottom: '20px',
  },
}
