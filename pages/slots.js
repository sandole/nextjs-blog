import { useEffect, useState, useCallback, useRef } from 'react'
import Head from 'next/head'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐']
const REEL_COUNT = 3
const SPIN_DURATION = 2000
const REEL_DELAY = 300 // stagger each reel stop

const PAYOUTS = {
  '💎💎💎': { mult: 50, label: 'JACKPOT' },
  '7️⃣7️⃣7️⃣': { mult: 25, label: 'LUCKY SEVENS' },
  '⭐⭐⭐': { mult: 15, label: 'STARS' },
  '🔔🔔🔔': { mult: 10, label: 'BELLS' },
  '🍇🍇🍇': { mult: 8, label: 'GRAPES' },
  '🍊🍊🍊': { mult: 5, label: 'ORANGES' },
  '🍋🍋🍋': { mult: 3, label: 'LEMONS' },
  '🍒🍒🍒': { mult: 2, label: 'CHERRIES' },
}

function getRandomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function checkWin(results) {
  const key = results.join('')
  if (PAYOUTS[key]) return PAYOUTS[key]
  // Two matching = small win
  if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
    return { mult: 1, label: 'SMALL WIN' }
  }
  return null
}

function Reel({ spinning, symbol, stopped }) {
  const [display, setDisplay] = useState(symbol)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (spinning && !stopped) {
      intervalRef.current = setInterval(() => {
        setDisplay(getRandomSymbol())
      }, 80)
    } else {
      clearInterval(intervalRef.current)
      setDisplay(symbol)
    }
    return () => clearInterval(intervalRef.current)
  }, [spinning, stopped, symbol])

  return (
    <div style={{
      ...styles.reel,
      ...(stopped && spinning ? {} : {}),
      transform: stopped ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform 0.2s ease',
    }}>
      <span style={styles.reelSymbol}>{display}</span>
    </div>
  )
}

export default function Slots() {
  const [balance, setBalance] = useState(1000)
  const [bet, setBet] = useState(10)
  const [results, setResults] = useState(['🍒', '💎', '7️⃣'])
  const [spinning, setSpinning] = useState(false)
  const [stoppedReels, setStoppedReels] = useState([true, true, true])
  const [win, setWin] = useState(null)
  const [message, setMessage] = useState('Pull the lever')
  const [tg, setTg] = useState(null)
  const [history, setHistory] = useState([])
  const [showPaytable, setShowPaytable] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp
      webapp.ready()
      webapp.expand()
      setTg(webapp)
      document.body.style.backgroundColor = webapp.backgroundColor || '#0a0a0a'
    }
  }, [])

  const spin = useCallback(() => {
    if (spinning || balance < bet) return

    setBalance((b) => b - bet)
    setSpinning(true)
    setWin(null)
    setMessage('Spinning...')
    setStoppedReels([false, false, false])

    // Pre-determine results
    const newResults = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]

    // Stop reels one by one
    for (let i = 0; i < REEL_COUNT; i++) {
      setTimeout(() => {
        setStoppedReels((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
        setResults((prev) => {
          const next = [...prev]
          next[i] = newResults[i]
          return next
        })
      }, SPIN_DURATION + i * REEL_DELAY)
    }

    // Evaluate after all reels stop
    setTimeout(() => {
      setSpinning(false)
      const result = checkWin(newResults)
      if (result) {
        const winAmount = bet * result.mult
        setBalance((b) => b + winAmount)
        setWin({ ...result, amount: winAmount })
        setMessage(`${result.label}! +$${winAmount}`)
        setHistory((h) => [{ symbols: newResults.join(' '), win: winAmount, label: result.label }, ...h].slice(0, 10))

        // Haptic feedback on Telegram
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback?.impactOccurred(
            result.mult >= 10 ? 'heavy' : 'medium'
          )
        }
      } else {
        setMessage('No luck. Try again!')
        setHistory((h) => [{ symbols: newResults.join(' '), win: 0, label: null }, ...h].slice(0, 10))
      }
    }, SPIN_DURATION + REEL_COUNT * REEL_DELAY + 100)
  }, [spinning, balance, bet])

  const adjustBet = (delta) => {
    setBet((b) => Math.max(5, Math.min(balance, b + delta)))
  }

  return (
    <>
      <Head>
        <title>Jarvis Slots</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>JARVIS SLOTS</h1>
          <div style={styles.balanceRow}>
            <span style={styles.balanceLabel}>BALANCE</span>
            <span style={styles.balanceValue}>${balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Machine */}
        <div style={styles.machine}>
          <div style={styles.reelContainer}>
            {results.map((sym, i) => (
              <Reel
                key={i}
                spinning={spinning}
                stopped={stoppedReels[i]}
                symbol={sym}
              />
            ))}
          </div>

          {/* Win display */}
          <div style={{
            ...styles.messageBar,
            color: win ? (win.mult >= 10 ? '#ffd700' : '#00ff88') : '#888',
            fontWeight: win ? '700' : '400',
          }}>
            {message}
          </div>
        </div>

        {/* Bet controls */}
        <div style={styles.betRow}>
          <button style={styles.betBtn} onClick={() => adjustBet(-5)} disabled={spinning}>-5</button>
          <div style={styles.betDisplay}>
            <span style={styles.betLabel}>BET</span>
            <span style={styles.betValue}>${bet}</span>
          </div>
          <button style={styles.betBtn} onClick={() => adjustBet(5)} disabled={spinning}>+5</button>
        </div>

        {/* Spin button */}
        <button
          style={{
            ...styles.spinBtn,
            opacity: spinning || balance < bet ? 0.4 : 1,
            background: spinning ? '#333' : 'linear-gradient(135deg, #ff4444, #cc0000)',
          }}
          onClick={spin}
          disabled={spinning || balance < bet}
        >
          {balance < bet ? 'BROKE' : spinning ? 'SPINNING...' : 'SPIN'}
        </button>

        {/* Max / Min bet shortcuts */}
        <div style={styles.shortcutRow}>
          <button style={styles.shortcutBtn} onClick={() => setBet(5)} disabled={spinning}>MIN</button>
          <button style={styles.shortcutBtn} onClick={() => setBet(Math.min(100, balance))} disabled={spinning}>$100</button>
          <button style={styles.shortcutBtn} onClick={() => setBet(balance)} disabled={spinning}>ALL IN</button>
        </div>

        {/* Paytable toggle */}
        <button style={styles.paytableToggle} onClick={() => setShowPaytable(!showPaytable)}>
          {showPaytable ? 'Hide Paytable' : 'Show Paytable'}
        </button>

        {showPaytable && (
          <div style={styles.paytable}>
            {Object.entries(PAYOUTS).map(([symbols, info]) => (
              <div key={symbols} style={styles.payRow}>
                <span>{symbols.match(/.{1,2}/g)?.join(' ')}</span>
                <span style={{ color: info.mult >= 10 ? '#ffd700' : '#00ff88' }}>{info.mult}x</span>
              </div>
            ))}
            <div style={styles.payRow}>
              <span>Any 2 match</span>
              <span style={{ color: '#888' }}>1x</span>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={styles.history}>
            <div style={styles.historyTitle}>RECENT</div>
            {history.map((h, i) => (
              <div key={i} style={styles.historyRow}>
                <span>{h.symbols}</span>
                <span style={{ color: h.win > 0 ? '#00ff88' : '#555' }}>
                  {h.win > 0 ? `+$${h.win}` : '-'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Reset */}
        {balance < 5 && !spinning && (
          <button
            style={styles.resetBtn}
            onClick={() => { setBalance(1000); setMessage('Fresh start. $1,000.'); setHistory([]); }}
          >
            Reload $1,000
          </button>
        )}
      </div>
    </>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: '-apple-system, system-ui, sans-serif',
    padding: '16px',
    maxWidth: '420px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    letterSpacing: '3px',
    color: '#ffd700',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: '8px',
  },
  balanceLabel: {
    fontSize: '11px',
    color: '#666',
    letterSpacing: '1px',
  },
  balanceValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#00ff88',
  },
  machine: {
    background: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px 16px 16px',
    border: '2px solid #333',
    marginBottom: '16px',
  },
  reelContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  reel: {
    width: '90px',
    height: '90px',
    background: '#111',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #2a2a2a',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
  },
  reelSymbol: {
    fontSize: '48px',
    lineHeight: '1',
  },
  messageBar: {
    textAlign: 'center',
    fontSize: '16px',
    height: '24px',
    letterSpacing: '0.5px',
  },
  betRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  betBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '1px solid #444',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  betDisplay: {
    textAlign: 'center',
  },
  betLabel: {
    display: 'block',
    fontSize: '10px',
    color: '#666',
    letterSpacing: '1px',
  },
  betValue: {
    fontSize: '24px',
    fontWeight: '700',
  },
  spinBtn: {
    width: '100%',
    padding: '18px',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '4px',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  shortcutRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  shortcutBtn: {
    flex: 1,
    padding: '10px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#888',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  paytableToggle: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid #222',
    borderRadius: '8px',
    color: '#555',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  paytable: {
    background: '#111',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #222',
  },
  payRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
    borderBottom: '1px solid #1a1a1a',
  },
  history: {
    marginTop: '8px',
  },
  historyTitle: {
    fontSize: '11px',
    color: '#555',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    borderBottom: '1px solid #111',
  },
  resetBtn: {
    width: '100%',
    padding: '14px',
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '10px',
    color: '#ffd700',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
  },
}
