import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import siteMetadata from '@/data/siteMetadata'

const root = process.cwd()

function getRecentPosts(limit = 10) {
  const prefixPaths = path.join(root, 'data', 'blog')
  const files = fs.readdirSync(prefixPaths).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))

  const posts = []
  for (const file of files) {
    const source = fs.readFileSync(path.join(prefixPaths, file), 'utf8')
    const { data, content } = matter(source)
    if (data.draft) continue

    const slug = file.replace(/\.(mdx|md)$/, '')
    posts.push({
      slug,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : null,
      summary: data.summary || '',
    })
  }

  return posts.sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, limit)
}

function getAllPostCount() {
  const prefixPaths = path.join(root, 'data', 'blog')
  const files = fs.readdirSync(prefixPaths).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
  let count = 0
  for (const file of files) {
    const source = fs.readFileSync(path.join(prefixPaths, file), 'utf8')
    const { data } = matter(source)
    if (!data.draft) count++
  }
  return count
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed')
  }

  const baseUrl = siteMetadata.siteUrl
  const recent = getRecentPosts(10)
  const totalPosts = getAllPostCount()

  const body = `# ${siteMetadata.author}

> Technical blog by ${siteMetadata.author}. ${siteMetadata.description}. ${totalPosts} posts covering AI agents, DevOps, cloud infrastructure, and security.

## Docs

- [Full Site Digest](${baseUrl}/api/digest): Complete index of all ${totalPosts} posts with metadata, tags, word counts, and summaries. Supports content negotiation (markdown via Accept: text/markdown, JSON via Accept: application/json) and query filters (?tag=ai, ?since=2026-01-01, ?limit=5).

## Recent Posts

${recent.map((p) => `- [${p.title}](${baseUrl}/blog/${p.slug}): ${p.summary}`).join('\n')}

## Optional

- [GitHub](https://github.com/sandole)
- [LinkedIn](https://www.linkedin.com/in/minjunseong)
`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).end(body)
}
