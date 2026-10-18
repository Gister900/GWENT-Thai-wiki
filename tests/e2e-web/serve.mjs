// Static server for the e2e of build:web: serves dist/ only under BASE (like GitHub Pages under /<repo>/).
// A missing file is a real 404 (no SPA fallback), so a wrong image path shows up in the test.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url))
const BASE = process.env.BASE || '/GWENT-Thai-wiki/'
const PORT = Number(process.env.PORT || 5193)
const TYPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' }

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname)
  if (!path.startsWith(BASE)) { res.writeHead(404).end('not under base'); return }
  const sub = path.slice(BASE.length); const rel = normalize(sub === '' || sub.endsWith('/') ? sub + 'index.html' : sub)
  if (rel.startsWith('..')) { res.writeHead(403).end(); return }
  try { const body = await readFile(join(DIST, rel)); res.writeHead(200, { 'content-type': TYPE[extname(rel)] || 'application/octet-stream' }).end(body) }
  catch { res.writeHead(404).end('not found') }
}).listen(PORT, '127.0.0.1')
