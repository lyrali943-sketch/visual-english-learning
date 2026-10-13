/**
 * AI provider adapter — OpenAI-compatible chat completions with vision.
 *
 * Keeping the call behind this thin adapter means the provider is swappable:
 * OpenAI, DeepSeek, Moonshot, a local vLLM/Ollama server, or Gemini's
 * OpenAI-compatible endpoint all work by changing VES_AI_BASE_URL /
 * VES_AI_MODEL / VES_AI_API_KEY. No business logic depends on the vendor.
 */

const ATTEMPTS = 2
const TIMEOUT_MS = 110_000

export class ProviderError extends Error {
  status
  detail
  constructor(message, { status = 502, detail } = {}) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
    this.detail = detail
  }
}

async function callChat({ baseUrl, apiKey, model, messages, maxTokens, temperature, jsonMode, signal }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new ProviderError(`The AI provider rejected the request (HTTP ${response.status}).`, {
      status: 502,
      detail: text.slice(0, 500),
      // 400 often means response_format is unsupported — caller retries without it.
      code: response.status === 400 ? 'maybe-unsupported-json-mode' : undefined,
    })
  }

  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new ProviderError('The AI provider returned an empty response.')
  }
  return content
}

/** One vision request, with bounded retries and a JSON-mode fallback. */
export async function visionChat({ config, messages, maxTokens = 1600, temperature = 0.4, jsonMode = true }) {
  if (!config.configured) {
    throw new ProviderError('No AI provider is configured.', { status: 503 })
  }

  let lastError
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const useJsonMode = jsonMode && !(lastError?.code === 'maybe-unsupported-json-mode' && attempt === 2)
    try {
      return await callChat({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        messages,
        maxTokens,
        temperature,
        jsonMode: useJsonMode,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      if (error instanceof ProviderError) {
        lastError = error
        if (error.code === 'maybe-unsupported-json-mode' && attempt === 1) continue
      }
      lastError = error
      if (attempt === ATTEMPTS) break
    }
  }

  if (lastError instanceof ProviderError) throw lastError
  throw new ProviderError(`The AI provider could not be reached: ${lastError?.message ?? 'unknown error'}`, {
    detail: String(lastError?.cause?.message ?? lastError?.cause ?? ''),
  })
}

/** Extract the first JSON object/array from a model answer. */
export function extractJson(text) {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    /* fall through to brace matching */
  }
  const start = cleaned.search(/[[{]/)
  if (start === -1) throw new ProviderError('The AI provider did not return JSON.')
  const open = cleaned[start]
  const close = open === '{' ? '}' : ']'
  const end = cleaned.lastIndexOf(close)
  if (end <= start) throw new ProviderError('The AI provider did not return valid JSON.')
  const slice = cleaned.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch (error) {
    throw new ProviderError(`The AI provider returned malformed JSON: ${error.message}`)
  }
}
