import { renderMarkdown } from '../utils/markdown'

export function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'

  let whoLabel = isUser ? 'YOU' : 'ASSISTANT'
  let displayText = msg.text
  if (isUser) {
    // Parse "[TYPE] — preview text" sent by suggestion card clicks
    const m = msg.text.match(/^\[([^\]]+)\] — ([\s\S]+)$/)
    if (m) {
      whoLabel = `YOU · ${m[1]}`
      displayText = m[2]
    }
  }

  const bubbleStyle = isUser
    ? { background: 'rgba(110,168,254,.08)', border: '1px solid rgba(110,168,254,.3)' }
    : msg.isError
    ? { background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)' }
    : { background: '#1d212a', border: '1px solid #272c38' }

  const textColor = msg.isError ? '#ef4444' : '#e7e9ee'

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#8a93a6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 500 }}>
        {whoLabel}
      </div>
      <div style={{ ...bubbleStyle, padding: '10px 12px', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: textColor }}>
        {isUser ? (
          displayText
        ) : msg.isStreaming ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>
            {msg.text}
            <span className="animate-pulse" style={{ opacity: 0.6 }}>▋</span>
          </span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
        )}
      </div>
    </div>
  )
}
