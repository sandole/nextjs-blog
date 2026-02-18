export default async function handler(req, res) {
  const { q, top } = req.query

  try {
    let url
    let results

    if (top) {
      // Fetch top events by volume
      const limit = Math.min(parseInt(top) || 10, 20)
      url = `https://gamma-api.polymarket.com/events?limit=${limit}&active=true&closed=false&order=volume&ascending=false`
      const response = await fetch(url)
      const events = await response.json()

      results = events.map((event) => {
        const markets = event.markets || []
        const outcomes = []

        for (const m of markets) {
          const q = m.question || ''
          const prices = m.outcomePrices
          if (prices) {
            try {
              const parsed = typeof prices === 'string' ? JSON.parse(prices) : prices
              const yesPct = parseFloat(parsed[0]) * 100
              outcomes.push({ question: q, yes: yesPct })
            } catch (e) { // ignore parse errors }
          }
        }

        outcomes.sort((a, b) => b.yes - a.yes)

        return {
          title: event.title,
          slug: event.slug,
          volume: parseFloat(event.volume || 0),
          liquidity: parseFloat(event.liquidity || 0),
          outcomes: outcomes.slice(0, 3),
        }
      })
    } else if (q) {
      // Search mode
      const keywords = q.toLowerCase().split(' ')

      // Search events (better coverage than markets)
      const eventResp = await fetch(
        `https://gamma-api.polymarket.com/events?limit=50&active=true&closed=false`
      )
      const events = await eventResp.json()

      results = events
        .filter((e) => {
          const title = (e.title || '').toLowerCase()
          return keywords.some((k) => title.includes(k))
        })
        .slice(0, 5)
        .map((event) => {
          const markets = event.markets || []
          const outcomes = []

          for (const m of markets) {
            const prices = m.outcomePrices
            if (prices) {
              try {
                const parsed = typeof prices === 'string' ? JSON.parse(prices) : prices
                outcomes.push({ question: m.question, yes: parseFloat(parsed[0]) * 100 })
              } catch (e) { // ignore parse errors }
            }
          }

          outcomes.sort((a, b) => b.yes - a.yes)

          return {
            title: event.title,
            slug: event.slug,
            volume: parseFloat(event.volume || 0),
            outcomes: outcomes.slice(0, 3),
          }
        })
    } else {
      return res.status(400).json({ error: 'Missing query param: q or top' })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json(results)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
