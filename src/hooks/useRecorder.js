import { useState, useRef, useEffect, useCallback } from 'react'
import { getSupportedMimeType, mimeToExt, formatTime } from '../utils/audio'

const MIN_BLOB_BYTES = 1000
const MIN_CHUNK_CHARS = 20
const MIN_CHUNK_WORDS = 3

export function useRecorder(settingsRef, onTranscribedRef) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState([])
  const transcriptEndRef = useRef(null)
  const fullTranscriptRef = useRef('')

  const mediaStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const chunkTimerRef = useRef(null)
  const isRecordingRef = useRef(false)
  const mimeTypeRef = useRef('')

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    return () => {
      isRecordingRef.current = false
      clearTimeout(chunkTimerRef.current)
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const transcribeChunk = useCallback(async (blob) => {
    const timestamp = formatTime(new Date())
    const apiKey = settingsRef.current.groqApiKey
    try {
      const ext = mimeToExt(mimeTypeRef.current)
      const formData = new FormData()
      formData.append('file', blob, `audio.${ext}`)
      formData.append('model', 'whisper-large-v3')
      formData.append('response_format', 'json')

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`${res.status} – ${body}`)
      }

      const data = await res.json()
      const text = data.text?.trim()
      if (text) {
        // Whisper hallucinates on near-silent chunks; skip only if both thresholds fail
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const isGarbage = text.length < MIN_CHUNK_CHARS && wordCount < MIN_CHUNK_WORDS
        if (!isGarbage) {
          // Update ref synchronously so onTranscribed reads the new value immediately
          fullTranscriptRef.current = fullTranscriptRef.current
            ? fullTranscriptRef.current + ' ' + text
            : text
          setTranscript((prev) => [...prev, { id: Date.now(), text, timestamp }])
        }
      }
    } catch (err) {
      setTranscript((prev) => [
        ...prev,
        { id: Date.now(), text: `Transcription error at ${timestamp}: ${err.message}`, timestamp, isError: true },
      ])
    }

    onTranscribedRef.current?.()
  }, [settingsRef, onTranscribedRef])

  const startNewChunk = useCallback(() => {
    if (!mediaStreamRef.current || !isRecordingRef.current) return

    audioChunksRef.current = []
    const mimeType = mimeTypeRef.current
    const recorder = new MediaRecorder(
      mediaStreamRef.current,
      mimeType ? { mimeType } : undefined
    )
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const chunks = audioChunksRef.current.splice(0)
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })

      if (isRecordingRef.current) {
        // Start next chunk immediately — zero gap in capture
        startNewChunk()
        const ms = (settingsRef.current.suggestionsRefreshInterval ?? 30) * 1000
        chunkTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }, ms)
      } else {
        // Final stop — release the microphone
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }

      if (blob.size > MIN_BLOB_BYTES) {
        await transcribeChunk(blob)
      }
    }

    recorder.start()
  }, [settingsRef, transcribeChunk])

  const startRecording = useCallback(async () => {
    if (!settingsRef.current.groqApiKey.trim()) {
      alert('Please add your Groq API key in Settings first.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      mimeTypeRef.current = getSupportedMimeType()
      isRecordingRef.current = true
      setIsRecording(true)

      startNewChunk()
      const ms = (settingsRef.current.suggestionsRefreshInterval ?? 30) * 1000
      chunkTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, ms)
    } catch (err) {
      alert(`Could not access microphone: ${err.message}`)
    }
  }, [settingsRef, startNewChunk])

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    setIsRecording(false)
    clearTimeout(chunkTimerRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) stopRecording()
    else startRecording()
  }, [startRecording, stopRecording])

  // onstop fires → transcribeChunk → onTranscribedRef (fetchSuggestions) automatically
  const flushChunk = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      clearTimeout(chunkTimerRef.current)
      mediaRecorderRef.current.stop()
    }
  }, [])

  return {
    isRecording,
    transcript,
    transcriptEndRef,
    fullTranscriptRef,
    toggleRecording,
    flushChunk,
  }
}
