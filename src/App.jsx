import { useState, useRef, useEffect } from 'react'
import { DEFAULT_SUGGESTIONS_PROMPT, DEFAULT_CHAT_PROMPT, DEFAULT_DETAILED_ANSWER_PROMPT, DEFAULT_DETAILED_ANSWER_CONTEXT } from './prompts'
import { IconExport, IconSettings } from './components/Icons'
import { SuggestionCard } from './components/SuggestionCard'
import { ChatMessage } from './components/ChatMessage'
import { SettingsModal } from './components/SettingsModal'
import { useRecorder } from './hooks/useRecorder'
import { useSuggestions } from './hooks/useSuggestions'
import { useChat } from './hooks/useChat'

const DEFAULT_SETTINGS = {
  groqApiKey: '',
  suggestionsPrompt: DEFAULT_SUGGESTIONS_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
  detailedAnswerPrompt: DEFAULT_DETAILED_ANSWER_PROMPT,
  detailedAnswerContextWindow: DEFAULT_DETAILED_ANSWER_CONTEXT,
  suggestionsContextWindow: 3000,
  chatContextWindow: 6000,
  suggestionsRefreshInterval: 30,
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="w-5 h-5 border-2 border-[#6ea8fe] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ColHeader({ children }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-[#272c38]">
      {children}
    </div>
  )
}

function ColLabel({ children }) {
  return <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#8a93a6', fontWeight: 500, margin: 0 }}>{children}</h2>
}

const HEADER_BTN_CLS =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8a93a6] hover:text-[#e7e9ee] bg-[#1d212a] hover:border-[#6ea8fe] border border-[#272c38] rounded-lg transition-colors'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const settingsRef = useRef(settings)

  useEffect(() => { settingsRef.current = settings }, [settings])

  // Ref bridge so useRecorder can call fetchSuggestions without a circular hook dependency
  const onTranscribedRef = useRef(() => {})

  const { isRecording, transcript, transcriptEndRef, fullTranscriptRef, toggleRecording, flushChunk } =
    useRecorder(settingsRef, onTranscribedRef)

  const { suggestionBatches, isFetchingSuggestions, sugCountdown, fetchSuggestions } =
    useSuggestions(settingsRef, fullTranscriptRef, isRecording)

  const { chatMessages, chatInput, setChatInput, isChatLoading, sendChatMessage, handleChatKeyDown, chatEndRef } =
    useChat(settingsRef, fullTranscriptRef)

  onTranscribedRef.current = fetchSuggestions

  const handleExport = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', '-')
    const filename = `twinmind-session-${dateStr}-${timeStr}.txt`

    const DIVIDER = '='.repeat(80)
    const SUBDIV  = '-'.repeat(80)

    const transcriptSection = [
      'SECTION 1: TRANSCRIPT',
      SUBDIV,
      transcript.length === 0
        ? '(no transcript recorded)'
        : transcript.map((l) => `[${l.timestamp}] ${l.text}`).join('\n'),
    ].join('\n')

    const chronologicalBatches = [...suggestionBatches].reverse()
    const suggestionsSection = [
      'SECTION 2: SUGGESTIONS',
      SUBDIV,
      chronologicalBatches.length === 0
        ? '(no suggestions generated)'
        : chronologicalBatches.map((batch, i) => {
            const cards = batch.cards.map((c) => `  [${c.type}] ${c.preview}`).join('\n')
            return `Batch ${i + 1} · ${batch.timestamp}\n${cards}`
          }).join('\n\n'),
    ].join('\n')

    const chatSection = [
      'SECTION 3: CHAT',
      SUBDIV,
      chatMessages.length === 0
        ? '(no chat messages)'
        : chatMessages.map((m) => {
            const who = m.role === 'user' ? 'YOU' : 'ASSISTANT'
            return `[${m.timestamp}] ${who}: ${m.text}`
          }).join('\n\n'),
    ].join('\n')

    const content = [
      DIVIDER,
      'TWINMIND SESSION EXPORT',
      `Exported: ${now.toLocaleString()}`,
      DIVIDER,
      '',
      transcriptSection,
      '',
      suggestionsSection,
      '',
      chatSection,
      '',
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSettingsSave = (draft) => {
    setSettings(draft)
    settingsRef.current = draft
    setShowSettings(false)
  }

  const handleSuggestionClick = (card) => sendChatMessage(`[${card.type}] — ${card.preview}`, true)

  const handleManualRefresh = () => {
    if (isRecording) {
      flushChunk() // onstop → transcribeChunk → fetchSuggestions via onTranscribedRef
    } else {
      fetchSuggestions()
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1115', color: '#e7e9ee', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #272c38', background: '#171a21' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#6ea8fe' }}>
            <span className="text-[10px] font-black tracking-tight" style={{ color: '#000' }}>TM</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e7e9ee', letterSpacing: '.3px' }}>TwinMind</span>
          <span className="hidden sm:block" style={{ fontSize: 12, color: '#8a93a6' }}>· Live Suggestions</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className={HEADER_BTN_CLS}>
            <IconExport />
            Export
          </button>
          <button onClick={() => setShowSettings(true)} className={HEADER_BTN_CLS}>
            <IconSettings />
            Settings
          </button>
        </div>
      </header>

      {/* 3-column grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: 12, minHeight: 0 }}>

        {/* Left: Mic & Transcript */}
        <div style={{ background: '#171a21', border: '1px solid #272c38', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <ColHeader>
            <ColLabel>1. Mic &amp; Transcript</ColLabel>
            <span style={{ fontSize: 12, color: '#8a93a6', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isRecording ? '● Recording' : 'Idle'}
            </span>
          </ColHeader>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderBottom: '1px solid #272c38', flexShrink: 0 }}>
            <button
              onClick={toggleRecording}
              title="Start / stop recording"
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isRecording ? '#ef4444' : '#6ea8fe',
                color: isRecording ? '#fff' : '#000',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .2s',
                animation: isRecording ? 'mic-pulse 1.4s infinite' : 'none',
                flexShrink: 0,
              }}
            >
              ●
            </button>
            <div style={{ fontSize: 13, color: '#8a93a6' }}>
              {isRecording
                ? `Listening… transcript updates every ${settings.suggestionsRefreshInterval}s.`
                : `Click mic to start. Transcript appends every ~${settings.suggestionsRefreshInterval}s.`}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ padding: 14 }}>
            {transcript.length === 0 && (
              <p style={{ fontSize: 13, color: '#8a93a6', textAlign: 'center', marginTop: 32, lineHeight: 1.5 }}>
                Press <strong style={{ color: '#cfd3dc' }}>Start Mic</strong> to begin transcribing.
              </p>
            )}
            {transcript.map((line) => (
              <div
                key={line.id}
                style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10, color: line.isError ? '#ef4444' : '#cfd3dc', animation: 'fadein .4s ease-out', fontStyle: line.isError ? 'italic' : 'normal' }}
              >
                {line.timestamp && (
                  <span style={{ color: '#8a93a6', fontSize: 11, marginRight: 6 }}>
                    {line.timestamp}
                  </span>
                )}
                {line.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Middle: Live Suggestions */}
        <div style={{ background: '#171a21', border: '1px solid #272c38', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <ColHeader>
            <ColLabel>2. Live Suggestions</ColLabel>
            <span style={{ fontSize: 12, color: '#8a93a6', textTransform: 'uppercase', letterSpacing: 1 }}>
              {suggestionBatches.length === 0
                ? '0 Batches'
                : `${suggestionBatches.length} Batch${suggestionBatches.length === 1 ? '' : 'es'}`}
            </span>
          </ColHeader>

          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #272c38' }}>
            <button
              onClick={handleManualRefresh}
              disabled={isFetchingSuggestions}
              style={{ background: '#1d212a', color: '#e7e9ee', border: '1px solid #272c38', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: isFetchingSuggestions ? 'not-allowed' : 'pointer', opacity: isFetchingSuggestions ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!isFetchingSuggestions) e.currentTarget.style.borderColor = '#6ea8fe' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#272c38' }}
            >
              {isFetchingSuggestions ? 'Refreshing…' : '↻ Reload suggestions'}
            </button>
            <span style={{ fontSize: 11, color: '#8a93a6', marginLeft: 'auto' }}>
              {isRecording
                ? `auto-refresh in ${sugCountdown}s`
                : 'start mic to auto-refresh'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ padding: 14 }}>
            {isFetchingSuggestions && suggestionBatches.length === 0 && <Spinner />}

            {suggestionBatches.length === 0 && !isFetchingSuggestions && (
              <p style={{ fontSize: 13, color: '#8a93a6', textAlign: 'center', marginTop: 32, lineHeight: 1.5, padding: '0 16px' }}>
                Suggestions appear automatically every {settings.suggestionsRefreshInterval}s once recording starts, or click <strong style={{ color: '#cfd3dc' }}>↻ Reload suggestions</strong> at any time.
              </p>
            )}

            {suggestionBatches.map((batch, batchIdx) => {
              const isFresh = batchIdx === 0
              return (
                <div key={batch.id} style={{ marginBottom: 16, opacity: isFresh ? 1 : 0.55 }}>
                  {batchIdx === 0 && isFetchingSuggestions && (
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: '#6ea8fe', borderTopColor: 'transparent' }} />
                      <span style={{ fontSize: 11, color: '#8a93a6' }}>Generating new suggestions…</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {batch.cards.map((card) => (
                      <SuggestionCard
                        key={card.id}
                        card={card}
                        fresh={isFresh}
                        onClick={handleSuggestionClick}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#8a93a6', textAlign: 'center', padding: '6px 0', textTransform: 'uppercase', letterSpacing: 1 }}>
                    — Batch {suggestionBatches.length - batchIdx} · {batch.timestamp} —
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Chat */}
        <div style={{ background: '#171a21', border: '1px solid #272c38', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <ColHeader>
            <ColLabel>3. Chat (detailed answers)</ColLabel>
            <span style={{ fontSize: 12, color: '#8a93a6', textTransform: 'uppercase', letterSpacing: 1 }}>session-only</span>
          </ColHeader>

          <div className="flex-1 overflow-y-auto" style={{ padding: 14 }}>
            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ flexShrink: 0, padding: 10, borderTop: '1px solid #272c38', display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask anything…"
              disabled={isChatLoading}
              style={{ flex: 1, background: '#1d212a', border: '1px solid #272c38', color: '#e7e9ee', padding: '8px 10px', borderRadius: 6, fontSize: 13, outline: 'none', opacity: isChatLoading ? 0.6 : 1 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6ea8fe' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#272c38' }}
            />
            <button
              onClick={() => sendChatMessage(chatInput)}
              disabled={!chatInput.trim() || isChatLoading}
              style={{ background: '#6ea8fe', color: '#000', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: (!chatInput.trim() || isChatLoading) ? 0.4 : 1 }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
