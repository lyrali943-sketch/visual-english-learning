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

// Stop the map growing without bound on a long-lived server.
let lastSweep = Date.now()
function sweepBuckets(now) {
  if (now - lastSweep < SPEAKING_RATE_LIMIT.windowMs) return
  lastSweep = now
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key)
  }
}

/**
 * Resolve the client IP for rate-limiting purposes.
 *
 * We deliberately do NOT trust a client-supplied `X-Forwarded-For` outright:
 * anyone can send that header, and trusting it would let a caller rotate a
 * fake IP per request and bypass the limit entirely. It is only consulted
 * when the server declares itself behind a trusted proxy.
 */
function clientKey(req) {
  const remote = req.socket?.remoteAddress ?? ''
  const trustedProxy = process.env.VES_TRUST_PROXY === 'true'

  if (trustedProxy) {
    const forwarded = req.headers['x-forwarded-for']
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const first = String(raw ?? '').split(',')[0]?.trim()
    if (first && isPlausibleIp(first)) return first
    const realIp = req.headers['x-real-ip']
    if (typeof realIp === 'string' && isPlausibleIp(realIp.trim())) return realIp.trim()
  }

  return isPlausibleIp(remote) ? remote : 'unknown'
}

function isPlausibleIp(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(':')
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

async function handleSpeakingAnswer(req, res, config, rate) {
  if (!rate.allowed) {
    res.setHeader?.('Retry-After', String(rate.retryAfter))
    return sendJson(res, 429, {
      ok: false,
      error: `Too many requests. The speaking endpoint allows ${SPEAKING_RATE_LIMIT.max} requests per minute; try again in ${rate.retryAfter}s.`,
    })
  }

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

  const lengthMode = ['short', 'standard', 'extended'].includes(body.lengthMode)
    ? body.lengthMode
    : 'standard'

  const toInt = (value, fallback) => {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  const messages = buildSpeakingMessages({
    question,
    category: typeof body.category === 'string' ? body.category.slice(0, 60) : '',
    questionType: typeof body.questionType === 'string' ? body.questionType.slice(0, 40) : '',
    difficulty: typeof body.difficulty === 'string' ? body.difficulty.slice(0, 20) : '',
    lengthMode,
    preparationTime: toInt(body.preparationTime, 15),
    speakingTime: toInt(body.speakingTime, 45),
  })

  const raw = extractJson(
    await visionChat({ config, messages, maxTokens: 1800, temperature: 0.5 }),
  )

  const validated = validateSpeakingAnswer(raw, { question, lengthMode })
  if (!validated.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: `The AI returned unusable speaking content: ${validated.error}`,
      detail: 'Try generating again, or use the built-in template.',
      source: 'speaking',
    })
  }

  return sendJson(res, 200, {
    ok: true,
    data: { ...validated.data, source: 'ai', lengthMode },
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

      // Rate limiting runs before the provider check so an unconfigured
      // deployment cannot be used to probe, and a configured one cannot be
      // hammered. Scoped to /api/speaking-answer only.
      if (url.pathname === '/api/speaking-answer') {
        const rate = takeRateLimit(clientKey(req), Date.now())
        if (checkConfigured(config, res)) return
        return await handleSpeakingAnswer(req, res, config, rate)
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
