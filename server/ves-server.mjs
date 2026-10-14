/**
 * Production server: serves the built app from /dist, falls back to
 * index.html for client-side routes, and mounts the same AI API used in dev.
 *
 *   npm run build
 *   npm start          (or: PORT=8080 node server/ves-server.mjs)
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

import { getConfig } from './config.mjs'
import { createAiApiMiddleware } from './ai-handler.mjs'

const config = getConfig()
const distDir = resolve(config.projectRoot, 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

if (!existsSync(distDir)) {
  // eslint-disable-next-line no-console
  console.warn('[ves-server] dist/ not found — run "npm run build" first. Only the API will be available.')
}

const api = createAiApiMiddleware()

const server = createServer((req, res) => {
  api(req, res, () => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const pathname = decodeURIComponent(url.pathname)
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
    let filePath = join(distDir, safePath)

    // Directory requests and unknown extensions → index.html (SPA routing)
    const looksLikeFile = extname(filePath) !== ''
    if (!looksLikeFile || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(distDir, 'index.html')
    }
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not found. Did you run "npm run build"?')
      return
    }

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': safePath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    createReadStream(filePath).pipe(res)
  })
})

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ves-server] Visual English Studio → http://localhost:${config.port}`)
  // Never logs the API key — only the provider label and model id.
  // eslint-disable-next-line no-console
  console.log(
    config.configured
      ? `[ves-server] AI provider: ${config.provider} (${config.model})`
      : '[ves-server] No AI provider configured — running in demo mode. See .env.example.',
  )
  // Rate-limit accuracy depends on how the client IP is derived. Behind a proxy
  // (Render, nginx, …) every request arrives from the proxy's address, so all
  // users would share one quota. This prints a single hint at startup — no IP
  // addresses are logged, and nothing is logged per request.
  if (config.trustProxy) {
    // eslint-disable-next-line no-console
    console.log('[ves-server] VES_TRUST_PROXY=true — client IPs taken from the right-most X-Forwarded-For entry.')
  } else {
    // eslint-disable-next-line no-console
    console.log(
      '[ves-server] VES_TRUST_PROXY not set — rate limiting keys on the direct peer address. ' +
        'Set it to true when deploying behind a proxy (e.g. Render).',
    )
  }
})
