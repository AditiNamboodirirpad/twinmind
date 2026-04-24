# TwinMind

## What it does

TwinMind is a live meeting assistant. It listens to your microphone, transcribes speech in real time, generates AI suggestions about what's being said, and lets you chat with an AI that has read the full transcript.

---

## Architecture — 3 hooks, 3 columns

The app is split into three independent concerns, each with its own hook and its own UI column:

```
┌─────────────────────────────────────────────────────┐
│                      App.jsx                        │
│  (settings state, layout, wires the three hooks)    │
├─────────────────┬───────────────────┬───────────────┤
│  useRecorder    │  useSuggestions   │   useChat     │
│  ─────────────  │  ───────────────  │  ──────────── │
│  Mic capture    │  AI suggestions   │  Chat with AI │
│  Whisper STT    │  Countdown timer  │  Message list │
│  transcript[]   │  suggestionBatches│  chatMessages │
└─────────────────┴───────────────────┴───────────────┘
```

The hooks share one piece of state: `fullTranscriptRef` — a string of everything spoken so far. `useRecorder` owns and writes it; `useSuggestions` and `useChat` read from it.

---

## Dataflow — step by step

```
USER SPEAKS
    │
    ▼
MediaRecorder (browser API)
  captures audio continuously
  cuts a chunk every 30s (configurable)
    │
    ▼
Audio Blob
    │
    ├──► Groq Whisper API  ──► transcript text
    │         (speech-to-text)        │
    │                                 ▼
    │                         fullTranscriptRef  ◄── grows over time
    │                         transcript[]       ◄── displayed in col 1
    │
    └──► (after each chunk) fetchSuggestions()
                │
                ▼
        Groq LLaMA 70B
        (reads last ~3000 chars of transcript)
                │
                ▼
        3 suggestion cards  ──► displayed in col 2
        (ANSWER / QUESTION / FACT CHECK / TALKING POINT)
                │
                ▼ (user clicks a card, or types manually)
        sendChatMessage()
                │
                ▼
        Groq LLaMA 70B
        (reads last ~6000 chars of transcript as context)
                │
                ▼
        AI reply  ──► displayed in col 3 (chat)
```

---

## Key design decisions

**Chunked recording, not streaming** — The browser's `MediaRecorder` records audio into a rolling buffer. Every N seconds, the current recorder stops (triggering the Whisper API call), and a new one starts immediately — zero gap. This avoids the complexity of streaming audio while keeping transcription roughly real-time.

**Ref bridge for cross-hook calls** — `useSuggestions` needs to be called from inside `useRecorder`, but React hooks can't import each other. The fix: `App.jsx` creates `onTranscribedRef` and assigns `fetchSuggestions` to it after both hooks run. `useRecorder` calls `onTranscribedRef.current()` — always gets the latest function, no stale closures.

**Two separate LLM calls** — Suggestions use a structured JSON prompt (returns typed cards). Chat uses a conversational prompt with the full transcript injected as context. Same model, different system prompts.

**Everything is client-side** — No backend. The Groq API key lives in the browser. Audio is never stored — it's sent directly to Groq's Whisper endpoint and discarded.

---

## External dependencies

| Service | What for | Model |
|---|---|---|
| Groq Whisper | Speech → text | `whisper-large-v3` |
| Groq Chat | Suggestions + chat | `llama-3.3-70b-versatile` |

Both go through the same Groq API key the user enters in Settings.

---

## One-sentence summary

> "It records your mic in 30-second chunks, sends each chunk to Whisper for transcription, then feeds the growing transcript to an LLM that surfaces suggestions in real time — and you can chat with that same LLM about anything being discussed."
