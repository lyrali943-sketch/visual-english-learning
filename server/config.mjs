/**
 * Server configuration.
 *
 * Secrets are read here — never in the browser. Copy `.env.example` to `.env`
 * and fill in your provider details (see README).
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')

// Node >= 20.12 can load a .env file into process.env.
try {
  const envPath = path.join(projectRoot, '.env')
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath)
  }
} catch {
  /* a missing or malformed .env simply means "demo mode" */
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

export function getConfig() {
  const apiKey = (process.env.VES_AI_API_KEY ?? '').trim()
  const baseUrl = (process.env.VES_AI_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  const model = (process.env.VES_AI_MODEL ?? 'gpt-4o-mini').trim()
  const provider = (process.env.VES_AI_PROVIDER ?? 'openai-compatible').trim()

  // Only "true" (case-insensitive) enables it. Anything else — including a typo
  // — keeps X-Forwarded-For ignored, which is the safe default: a client must
  // never be able to choose its own rate-limit key by setting a header.
  const trustProxy = (process.env.VES_TRUST_PROXY ?? '').trim().toLowerCase() === 'true'

  return {
    apiKey,
    baseUrl,
    model,
    provider,
    trustProxy,
    configured: apiKey.length > 0,
    port: Number.parseInt(process.env.PORT ?? '', 10) || 8080,
    projectRoot,
  }
}
