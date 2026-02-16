export default async function handler(req, res) {
  const { q } = req.query
  if (!q) {
    return res.status(400).json({ error: 'Missing query param q' })
  }

  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?limit=20&active=true&closed=false`
    )
    const data = await response.json()

    const keywords = q.toLowerCase().split(' ')
    const filtered = data.filter((m) => {
      const question = (m.question || '').toLowerCase()
      const description = (m.description || '').toLowerCase()
      return keywords.some((k) => question.includes(k) || description.includes(k))
    })

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json(filtered.slice(0, 5))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
