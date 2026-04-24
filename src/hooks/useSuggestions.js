import { useState, useRef, useEffect, useCallback } from 'react'
import { formatTime } from '../utils/audio'
import { groqChat } from '../utils/groq'

const MIN_TRANSCRIPT_CHARS = 50
const MAX_SUGGESTION_CARDS = 3

export function useSuggestions(settingsRef, fullTranscriptRef, isRecording) {
  const [suggestionBatches, setSuggestionBatches] = useState([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [sugCountdown, setSugCountdown] = useState(30)
  const sugCountdownRef = useRef(30)
  const countdownIntervalRef = useRef(null)

  useEffect(() => {
    if (isRecording) {
      const interval = settingsRef.current.suggestionsRefreshInterval ?? 30
      sugCountdownRef.current = interval
      setSugCountdown(interval)
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = setInterval(() => {
        sugCountdownRef.current = Math.max(0, sugCountdownRef.current - 1)
        setSugCountdown(sugCountdownRef.current)
      }, 1000)
    } else {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
      const resetTo = settingsRef.current.suggestionsRefreshInterval ?? 30
      sugCountdownRef.current = resetTo
      setSugCountdown(resetTo)
    }
    return () => clearInterval(countdownIntervalRef.current)
  }, [isRecording, settingsRef])

  const fetchSuggestions = useCallback(async () => {
    const apiKey = settingsRef.current.groqApiKey
    if (!apiKey) return

    const ctx = fullTranscriptRef.current
    if (ctx.length < MIN_TRANSCRIPT_CHARS) return

    const contextWindow = settingsRef.current.suggestionsContextWindow
    const context = ctx.slice(-contextWindow)

    setIsFetchingSuggestions(true)
    try {
      const data = await groqChat(
        apiKey,
        [
          { role: 'system', content: settingsRef.current.suggestionsPrompt },
          { role: 'user', content: `Transcript:\n${context}` },
        ],
        { temperature: 0.7, max_tokens: 1024 },
      )
      const raw = data.choices?.[0]?.message?.content ?? ''

      // Extract JSON — tolerates markdown code fences
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON object found in response')

      const parsed = JSON.parse(match[0])
      const cards = parsed.suggestions?.slice(0, MAX_SUGGESTION_CARDS).map((s, i) => ({
        id: `${Date.now()}-${i}`,
        type: (s.type ?? 'TALKING POINT').toUpperCase(),
        preview: s.preview ?? '',
      }))

      if (cards?.length) {
        setSuggestionBatches((prev) => [
          { id: Date.now(), timestamp: formatTime(new Date()), cards },
          ...prev,
        ])
      }
    } catch {
      // network or parse failure — suggestions stay unchanged, countdown resets in finally
    } finally {
      setIsFetchingSuggestions(false)
      const interval = settingsRef.current.suggestionsRefreshInterval ?? 30
      sugCountdownRef.current = interval
      setSugCountdown(interval)
    }
  }, [settingsRef, fullTranscriptRef])

  return { suggestionBatches, isFetchingSuggestions, sugCountdown, fetchSuggestions }
}
