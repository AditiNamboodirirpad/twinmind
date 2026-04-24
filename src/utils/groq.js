const PRIMARY_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct'
// Fallback: llama-4-maverick may not be available on all Groq accounts or regions
const FALLBACK_MODEL = 'llama-3.3-70b-versatile'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function postChatCompletions(apiKey, model, messages, options) {
  return fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, ...options }),
  })
}

export async function groqChat(apiKey, messages, options = {}) {
  let res = await postChatCompletions(apiKey, PRIMARY_MODEL, messages, options)

  if (res.status === 404) {
    res = await postChatCompletions(apiKey, FALLBACK_MODEL, messages, options)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }

  return res.json()
}

export async function groqChatStream(apiKey, messages, options = {}, onToken) {
  let res = await postChatCompletions(apiKey, PRIMARY_MODEL, messages, { ...options, stream: true })

  if (res.status === 404) {
    res = await postChatCompletions(apiKey, FALLBACK_MODEL, messages, { ...options, stream: true })
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }

  // Read SSE stream token by token for instant first-token latency
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // hold incomplete last line for next chunk

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) onToken(token)
      } catch {
        // skip malformed SSE chunks
      }
    }
  }
}
