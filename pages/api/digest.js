import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import siteMetadata from '@/data/siteMetadata'

const root = process.cwd()

function getAllPosts() {
  const prefixPaths = path.join(root, 'data', 'blog')
  const files = fs.readdirSync(prefixPaths).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))

  const posts = []
  for (const file of files) {
    const source = fs.readFileSync(path.join(prefixPaths, file), 'utf8')
    const { data, content } = matter(source)
    if (data.draft) continue

    const slug = file.replace(/\.(mdx|md)$/, '')
    const wordCount = content.split(/\s+/).length

    posts.push({
      slug,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : null,
      tags: data.tags || [],
      summary: data.summary || '',
      wordCount,
    })
  }

  return posts.sort((a, b) => (a.date > b.date ? -1 : 1))
}

function buildMarkdownDigest(posts, baseUrl) {
  const now = new Date().toISOString()
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort()

  const frontmatter = [
    '---',
    `site: ${baseUrl}`,
    `author: ${siteMetadata.author}`,
    `description: ${siteMetadata.description}`,
    `generated: ${now}`,
    `post_count: ${posts.length}`,
    `content_type: technical_blog`,
    `topics: [${tags.join(', ')}]`,
    '---',
  ].join('\n')

  const postList = posts
    .map(
      (p) =>
        `- [${p.title}](${baseUrl}/blog/${p.slug}) | ${p.date} | ${p.wordCount} words | ${p.tags.join(', ')}\n  ${p.summary}`
    )
    .join('\n')

  return `${frontmatter}

# ${siteMetadata.author} - Site Digest

> ${siteMetadata.description}

## Posts (${posts.length})

${postList}

---
Token-optimized digest. Full content at ${baseUrl}/blog/[slug].
`
}

function buildJsonDigest(posts, baseUrl) {
  const now = new Date().toISOString()
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort()

  return {
    type: `${baseUrl}/api/digest`,
    title: `${siteMetadata.author} - Site Digest`,
    status: 200,
    detail: `Technical blog by ${siteMetadata.author}. ${posts.length} posts.`,
    instance: now,
    site: baseUrl,
    author: siteMetadata.author,
    description: siteMetadata.description,
    generated: now,
    post_count: posts.length,
    topics: tags,
    posts: posts.map((p) => ({
      title: p.title,
      url: `${baseUrl}/blog/${p.slug}`,
      date: p.date,
      tags: p.tags,
      summary: p.summary,
      word_count: p.wordCount,
    })),
  }
}

function negotiateFormat(acceptHeader) {
  if (!acceptHeader) return 'json'
  const accept = acceptHeader.toLowerCase()
  if (accept.includes('text/markdown')) return 'markdown'
  if (accept.includes('application/problem+json')) return 'problem+json'
  if (accept.includes('application/json')) return 'json'
  // Default to markdown for agents that send generic accept
  if (accept.includes('*/*')) return 'json'
  return 'json'
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    const format = negotiateFormat(req.headers.accept)
    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      return res.status(405).send(
        `---
error_code: 1405
error_name: method_not_allowed
error_category: unsupported
status: 405
retryable: false
owner_action_required: false
---

# Error 1405: Method Not Allowed

## What Happened
Only GET requests are supported on this endpoint.

## What You Should Do
Change your request method to GET. Do not retry as-is.
`
      )
    }
    return res.status(405).json({
      type: `${siteMetadata.siteUrl}/api/digest`,
      title: 'Method Not Allowed',
      status: 405,
      detail: 'Only GET requests are supported.',
      error_code: 1405,
      error_name: 'method_not_allowed',
      error_category: 'unsupported',
      retryable: false,
      owner_action_required: false,
    })
  }

  const posts = getAllPosts()
  const baseUrl = siteMetadata.siteUrl
  const format = negotiateFormat(req.headers.accept)

  // Optional query filters
  const tagFilter = req.query.tag
  const limitRaw = req.query.limit
  const since = req.query.since // ISO date string

  // Validate limit
  if (limitRaw !== undefined) {
    const limit = parseInt(limitRaw)
    if (isNaN(limit) || limit < 0) {
      const errPayload = {
        type: `${baseUrl}/api/digest`,
        title: 'Invalid Parameter',
        status: 400,
        detail: 'limit must be a non-negative integer.',
        error_code: 1400,
        error_name: 'invalid_parameter',
        error_category: 'unsupported',
        retryable: false,
        owner_action_required: false,
      }
      if (format === 'markdown') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        return res.status(400).send(
          `---\nerror_code: 1400\nerror_name: invalid_parameter\nerror_category: unsupported\nstatus: 400\nretryable: false\nowner_action_required: false\n---\n\n# Error 1400: Invalid Parameter\n\n## What Happened\nThe limit parameter must be a non-negative integer.\n\n## What You Should Do\nFix the limit value and retry.\n`
        )
      }
      return res.status(400).json(errPayload)
    }
  }

  // Validate since date
  if (since !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    const errPayload = {
      type: `${baseUrl}/api/digest`,
      title: 'Invalid Date Format',
      status: 400,
      detail: 'since must be in YYYY-MM-DD format.',
      error_code: 1400,
      error_name: 'invalid_date',
      error_category: 'unsupported',
      retryable: false,
      owner_action_required: false,
    }
    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      return res.status(400).send(
        `---\nerror_code: 1400\nerror_name: invalid_date\nerror_category: unsupported\nstatus: 400\nretryable: false\nowner_action_required: false\n---\n\n# Error 1400: Invalid Date Format\n\n## What Happened\nThe since parameter must be in YYYY-MM-DD format.\n\n## What You Should Do\nFix the date format and retry.\n`
      )
    }
    return res.status(400).json(errPayload)
  }

  const limit = limitRaw !== undefined ? parseInt(limitRaw) : 0

  let filtered = posts
  if (tagFilter) {
    filtered = filtered.filter((p) => p.tags.includes(tagFilter))
  }
  if (since) {
    filtered = filtered.filter((p) => p.date && p.date >= since)
  }
  if (limit > 0) {
    filtered = filtered.slice(0, limit)
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  if (format === 'markdown') {
    const body = buildMarkdownDigest(filtered, baseUrl)
    res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' })
    return res.end(body)
  }

  if (format === 'problem+json') {
    res.setHeader('Content-Type', 'application/problem+json; charset=utf-8')
  }

  return res.status(200).json(buildJsonDigest(filtered, baseUrl))
}
