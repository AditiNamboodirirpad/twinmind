import { useState, useRef, useEffect, useCallback } from 'react'
import { formatTime } from '../utils/audio'
import { groqChatStream } from '../utils/groq'

export function useChat(settingsRef, fullTranscriptRef) {
  const [chatMessages, setChatMessages] = useState(() => [{
    id: 'welcome',
    role: 'assistant',
    timestamp: formatTime(new Date()),
    text: "Hi! I'm your TwinMind assistant. I'm listening to the meeting and ready to help. Ask me anything about the conversation, or click a suggestion card to get a detailed answer.",
  }])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const isChatLoadingRef = useRef(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    isChatLoadingRef.current = isChatLoading
  }, [isChatLoading])

  const sendChatMessage = useCallback(async (text, isCardClick = false) => {
    if (!text?.trim() || isChatLoadingRef.current) return

    const apiKey = settingsRef.current.groqApiKey
    if (!apiKey) {
      alert('Please add your Groq API key in Settings first.')
      return
    }

    const userMsgId = Date.now()
    const assistantMsgId = userMsgId + 1

    setChatInput('')
    setIsChatLoading(true)
    setChatMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', timestamp: formatTime(new Date()), text: text.trim() },
      { id: assistantMsgId, role: 'assistant', timestamp: formatTime(new Date()), text: '', isStreaming: true },
    ])

    const contextWindow = isCardClick
      ? settingsRef.current.detailedAnswerContextWindow
      : settingsRef.current.chatContextWindow
    const transcriptContext = fullTranscriptRef.current.slice(-contextWindow)
    const basePrompt = isCardClick
      ? settingsRef.current.detailedAnswerPrompt
      : settingsRef.current.chatPrompt

    const systemPrompt = `${basePrompt}

Current transcript:
${transcriptContext || '(No transcript yet — meeting has not started.)'}`

    try {
      await groqChatStream(
        apiKey,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.trim() },
        ],
        { temperature: 0.6, max_tokens: 1024 },
        (token) => {
          setChatMessages((prev) =>
            prev.map((m) => m.id === assistantMsgId ? { ...m, text: m.text + token } : m)
          )
        },
      )
      setChatMessages((prev) =>
        prev.map((m) => m.id === assistantMsgId ? { ...m, isStreaming: false } : m)
      )
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, text: `Error: ${err.message}`, isStreaming: false, isError: true }
            : m
        )
      )
    } finally {
      setIsChatLoading(false)
    }
  }, [settingsRef, fullTranscriptRef])

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage(chatInput)
    }
  }

  return { chatMessages, chatInput, setChatInput, isChatLoading, sendChatMessage, handleChatKeyDown, chatEndRef }
}
