/**
 * The AI API — mounted as connect-style middleware.
 *
 *  GET  /api/status            → { configured, provider, model }  (no secrets)
 *  POST /api/identify          → { objects }                       stage 1
 *  POST /api/generate          → poster content                    stage 2
 *  POST /api/generate-module   → { module, value }                 single module
 *  POST /api/speaking-answer   → speaking plan + model answer      NEON SPEAK
 *
 * It is used by the Vite dev server (vite.config.ts) and by the bundled
 * production server (server/ves-server.mjs), so both environments share the
 * exact same implementation. The browser never sees the API key.
 */

import { getConfig } from './config.mjs'
import { extractJson, visionChat, ProviderError } from './ai-provider.mjs'
import {
  buildGenerateMessages,
  buildIdentifyMessages,
  buildModuleMessages,
  buildSpeakingMessages,
} from './prompts.mjs'
import { validateModuleValue, validatePosterContent } from './validate-poster.mjs'
import { validateSpeakingAnswer } from './validate-speaking.mjs'

const MAX_BODY_BYTES = 16 * 1024 * 1024

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new ProviderError('The request body is too large.', { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(new ProviderError('The request body is not valid JSON.', { status: 400 }))
      }
    })
    req.on('error', () => reject(new ProviderError('The request could not be read.', { status: 400 })))
  })
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/') && value.length > 100
}

const MODULES = new Set(['vocabulary', 'phrases', 'sentencePatterns', 'modelResponse', 'speakingChallenges', 'detectedObjects'])

/* ------------------------------------------------------------------ *
 * Rate limiting for /api/speaking-answer
 *
 * Scoped to this endpoint only: the three poster endpoints keep their
 * original, unlimited behaviour.
 * ------------------------------------------------------------------ */

const SPEAKING_RATE_LIMIT = { max: 5, windowMs: 60_000 }
const MAX_QUESTION_CHARS = 600
/** Bound on the whole request body for this endpoint — it is pure text. */
const MAX_SPEAKING_BODY_BYTES = 8 * 1024

const rateBuckets = new Map()

/** Hard ceiling on tracked keys so a burst of distinct IPs cannot grow the map
 *  without bound inside a single window. */
const RATE_BUCKET_CAP = 5000

// Stop the map growing without bound on a long-lived server.
let lastSweep = Date.now()
function sweepBuckets(now) {
  if (now - lastSweep >= SPEAKING_RATE_LIMIT.windowMs) {
    lastSweep = now
    for (const [key, bucket] of rateBuckets) {
      if (now > bucket.resetAt) rateBuckets.delete(key)
    }
  }
  // Hard backstop regardless of elapsed time.
  while (rateBuckets.size > RATE_BUCKET_CAP) {
    const oldest = rateBuckets.keys().next().value
    if (oldest === undefined) break
    rateBuckets.delete(oldest)
  }
}

/**
 * Normalise an address so one client is always counted under one key.
 * `::ffff:203.0.113.7` and `203.0.113.7` are the same client; without this the
 * same person could be split across buckets and get 5 requests per alias.
 */
function normaliseIp(raw) {
  let value = String(raw ?? '').trim()
  if (!value) return ''

  // Bracketed IPv6, e.g. "[::1]".
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1)

  const lower = value.toLowerCase()

  // IPv4-mapped / IPv4-compatible IPv6 → plain IPv4.
  const mapped = lower.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) return mapped[1]

  if (lower.includes(':')) {
    return /^[0-9a-f:.]+$/.test(lower) && lower.split(':').length >= 3 ? lower : ''
  }

  const parts = lower.split('.')
  if (parts.length !== 4) return ''
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return ''
    if (Number(part) > 255) return ''
  }
  return parts.join('.')
}

/**
 * Resolve the client IP used as the rate-limit key.
 *
 * `X-Forwarded-For` is client-controllable, so it is only consulted when the
 * deployment explicitly declares itself behind a trusted proxy
 * (VES_TRUST_PROXY=true).
 *
 * Even then we do NOT take the left-most entry. A proxy appends the address it
 * observed, so a caller sending its own `X-Forwarded-For: 1.2.3.4` produces the
 * chain "1.2.3.4, <address the proxy actually saw>". Taking [0] would key the
 * limiter on attacker-controlled data and let the limit be bypassed by rotating
 * a fake address per request. The right-most entry is the one added by the
 * nearest trusted hop, and is correct whether the proxy replaces the header
 * ("<client>") or appends to it ("<spoofed>, <client>").
 */
function clientKey(req) {
  const remote = normaliseIp(req.socket?.remoteAddress ?? '')

  // `trustProxy` is parsed once in server/config.mjs; see that file for why the
  // default is "ignore X-Forwarded-For".
  if (getConfig().trustProxy) {
    const forwarded = req.headers['x-forwarded-for']
    const chain = (Array.isArray(forwarded) ? forwarded.join(',') : String(forwarded ?? '')).split(',')

    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const candidate = normaliseIp(chain[i])
      if (candidate) return candidate
    }

    const realIp = normaliseIp(req.headers['x-real-ip'])
    if (realIp) return realIp
  }

  return remote || 'unknown'
}

/**
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
function takeRateLimit(key, now) {
  sweepBuckets(now)
  const bucket = rateBuckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + SPEAKING_RATE_LIMIT.windowMs })
    return { allowed: true, remaining: SPEAKING_RATE_LIMIT.max - 1, retryAfter: 0 }
  }
  bucket.count += 1
  if (bucket.count > SPEAKING_RATE_LIMIT.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }
  return { allowed: true, remaining: SPEAKING_RATE_LIMIT.max - bucket.count, retryAfter: 0 }
}

function checkConfigured(config, res) {
  if (config.configured) return false
  sendJson(res, 503, {
    ok: false,
    error:
      'No AI provider is configured. Add VES_AI_API_KEY (and optionally VES_AI_BASE_URL / VES_AI_MODEL) to .env and restart the server.',
  })
  return true
}

async function handleStatus(res) {
  const config = getConfig()
  sendJson(res, 200, {
    ok: true,
    data: {
      configured: config.configured,
      provider: config.configured ? config.provider : 'none',
      model: config.configured ? config.model : null,
    },
  })
}

async function handleIdentify(req, res, config) {
  const body = await readJsonBody(req)
  if (!isDataUrl(body.photoDataUrl)) {
    return sendJson(res, 400, { ok: false, error: 'A photo (data URL) is required.' })
  }
  const mode = ['everyday', 'academic', 'business'].includes(body.mode) ? body.mode : 'everyday'

  const raw = extractJson(await visionChat({ config, messages: buildIdentifyMessages(body.photoDataUrl, mode), maxTokens: 500 }))
  const objects = Array.isArray(raw?.objects) ? raw.objects : Array.isArray(raw) ? raw : []
  const cleaned = objects
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      label: String(item.label ?? '').replace(/\s+/g, ' ').trim().slice(0, 24),
      translation: String(item.translation ?? '').replace(/\s+/g, ' ').trim().slice(0, 18),
      ...(typeof item.confidence === 'number' ? { confidence: Math.max(0, Math.min(1, item.confidence)) } : {}),
    }))
    .filter((item) => item.label && item.translation)
    .slice(0, 6)

  return sendJson(res, 200, { ok: true, data: { objects: cleaned } })
}

async function handleGenerate(req, res, config) {
  const body = await readJsonBody(req)
  if (!isDataUrl(body.photoDataUrl)) {
    return sendJson(res, 400, { ok: false, error: 'A photo (data URL) is required.' })
  }
  const mode = ['everyday', 'academic', 'business'].includes(body.mode) ? body.mode : 'everyday'
  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(body.difficulty) ? body.difficulty : 'intermediate'
  const objects = Array.isArray(body.objects) ? body.objects.slice(0, 6) : []

  const raw = extractJson(
    await visionChat({ config, messages: buildGenerateMessages(body.photoDataUrl, mode, difficulty, objects), maxTokens: 1800 }),
  )
  const validated = validatePosterContent(raw)
  if (!validated.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: `The AI returned unusable content: ${validated.error}`,
      detail: 'Try again, or use a clearer photo.',
    })
  }
  return sendJson(res, 200, { ok: true, data: validated.data })
}

async function handleGenerateModule(req, res, config) {
  const body = await readJsonBody(req)
  if (!isDataUrl(body.photoDataUrl)) {
    return sendJson(res, 400, { ok: false, error: 'A photo (data URL) is required.' })
  }
  if (!MODULES.has(body.module)) {
    return sendJson(res, 400, { ok: false, error: `Unknown module "${body.module}".` })
  }
  const mode = ['everyday', 'academic', 'business'].includes(body.mode) ? body.mode : 'everyday'
  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(body.difficulty) ? body.difficulty : 'intermediate'
  const content = body.content && typeof body.content === 'object' ? body.content : {}

  const raw = extractJson(
    await visionChat({
      config,
      messages: buildModuleMessages(body.photoDataUrl, body.module, mode, difficulty, content),
      maxTokens: 1200,
    }),
  )
  const value = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
  const validated = validateModuleValue(body.module, value)
  if (!validated.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: `The AI returned unusable content for ${body.module}: ${validated.error}`,
    })
  }
  return sendJson(res, 200, { ok: true, data: { module: body.module, value: validated.value } })
}

/* ------------------------------------------------------------------ *
 * NEON SPEAK — /speaking. Text only, no photo, strictly rate limited.
 * ------------------------------------------------------------------ */

function readJsonBodyLimited(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new ProviderError('The request body is too large.', { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(new ProviderError('The request body is not valid JSON.', { status: 400 }))
      }
    })
    req.on('error', () => reject(new ProviderError('The request could not be read.', { status: 400 })))
  })
}

async function handleSpeakingAnswer(req, res, config) {
  // Input is validated BEFORE the rate limit is charged, so a malformed or
  // truncated payload from a buggy client returns an honest 400 instead of
  // silently burning the user's quota and surfacing a misleading 429. Flood
  // protection still holds: the body read is capped at MAX_SPEAKING_BODY_BYTES,
  // and any request that reaches the provider is rate limited.
  const body = await readJsonBodyLimited(req, MAX_SPEAKING_BODY_BYTES)

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) {
    return sendJson(res, 400, { ok: false, error: 'A question is required.' })
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return sendJson(res, 400, {
      ok: false,
      error: `The question is too long (${question.length} characters, limit ${MAX_QUESTION_CHARS}).`,
    })
  }

  const rate = takeRateLimit(clientKey(req), Date.now())
  if (!rate.allowed) {
    res.setHeader?.('Retry-After', String(rate.retryAfter))
    return sendJson(res, 429, {
      ok: false,
      error: `Too many requests. The speaking endpoint allows ${SPEAKING_RATE_LIMIT.max} requests per minute; try again in ${rate.retryAfter}s.`,
      retryAfter: rate.retryAfter,
    })
  }

  const toInt = (value, fallback) => {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  const messages = buildSpeakingMessages({
    question,
    category: typeof body.category === 'string' ? body.category.slice(0, 60) : '',
    questionType: typeof body.questionType === 'string' ? body.questionType.slice(0, 40) : '',
    difficulty: typeof body.difficulty === 'string' ? body.difficulty.slice(0, 20) : '',
    preparationTime: toInt(body.preparationTime, 15),
    speakingTime: toInt(body.speakingTime, 45),
  })

  /**
   * One retry, and only for failures that a second attempt could plausibly
   * fix: unparsable output, or content that failed validation (wrong shape,
   * duplicate arguments, off-topic). Transport failures are not retried here
   * because ai-provider.mjs already owns provider-level retries.
   */
  let lastError = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let raw
    try {
      const completion = await visionChat({
        config,
        messages,
        maxTokens: 2000,
        temperature: 0.6,
      })
      raw = extractJson(completion)
    } catch (error) {
      if (error instanceof ProviderError && error.status === 502) {
        // Empty / malformed provider response — worth one more try.
        lastError = error.message
        if (attempt === 1) continue
        break
      }
      throw error
    }

    const validated = validateSpeakingAnswer(raw, { question })
    if (validated.ok) {
      return sendJson(res, 200, {
        ok: true,
        data: {
          ...validated.data,
          source: 'ai',
          attempts: attempt,
        },
      })
    }

    lastError = validated.error
    if (attempt === 1) continue
  }

  return sendJson(res, 502, {
    ok: false,
    error: `The AI could not produce a usable answer plan for this question: ${lastError ?? 'unknown error'}`,
    detail:
      'It was attempted twice. You can try again, or continue with the built-in template, which is clearly marked as a template.',
    source: 'speaking',
    attempts: 2,
  })
}

/**
 * @returns {import('node:http').RequestListener} connect-style middleware
 */
export function createAiApiMiddleware() {
  return async function aiApi(req, res, next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) {
      next?.()
      return
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { Allow: 'GET, POST, OPTIONS' })
      res.end()
      return
    }

    const config = getConfig()

    try {
      if (url.pathname === '/api/status') {
        if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Use GET for /api/status.' })
        return await handleStatus(res)
      }
      if (req.method !== 'POST') {
        return sendJson(res, 405, { ok: false, error: 'Use POST for this endpoint.' })
      }

      // Scoped to /api/speaking-answer only. The rate limit is charged inside
      // the handler, after input validation, so malformed requests get an
      // honest 400 rather than consuming the caller's quota.
      if (url.pathname === '/api/speaking-answer') {
        if (checkConfigured(config, res)) return
        return await handleSpeakingAnswer(req, res, config)
      }

      if (checkConfigured(config, res)) return
      if (url.pathname === '/api/identify') return await handleIdentify(req, res, config)
      if (url.pathname === '/api/generate') return await handleGenerate(req, res, config)
      if (url.pathname === '/api/generate-module') return await handleGenerateModule(req, res, config)
      return sendJson(res, 404, { ok: false, error: `Unknown endpoint ${url.pathname}.` })
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 500
      const message = error instanceof Error ? error.message : 'Unexpected server error.'
      const detail = error instanceof ProviderError ? error.detail : undefined
      // eslint-disable-next-line no-console
      console.error(`[ves-api] ${url.pathname} failed:`, message, detail ?? '')
      return sendJson(res, status, { ok: false, error: message, detail })
    }
  }
}
