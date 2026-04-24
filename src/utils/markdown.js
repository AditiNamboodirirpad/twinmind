export function renderMarkdown(text) {
  // Escape HTML to prevent injection, then apply markdown patterns
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const applyInline = (s) =>
    s
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

  const lines = escaped.split('\n')
  const parts = []
  let listItems = []

  const flushList = () => {
    if (listItems.length) {
      parts.push(`<ul class="list-disc list-inside space-y-0.5 my-1.5">${listItems.join('')}</ul>`)
      listItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*]\s/.test(trimmed)) {
      listItems.push(`<li>${applyInline(trimmed.slice(2))}</li>`)
    } else {
      flushList()
      if (trimmed) parts.push(`<p class="mb-1 last:mb-0">${applyInline(trimmed)}</p>`)
    }
  }
  flushList()
  return parts.join('')
}
