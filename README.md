# TwinMind — Live Meeting Assistant

> Listens to your mic, transcribes speech in real time, surfaces 3 AI suggestions every 30 seconds, and lets you chat with an AI that has read the full transcript.

---

## Links

| | |
|---|---|
| **Live app** | https://twinmind-delta.vercel.app |
| **GitHub** | https://github.com/AditiNamboodirirpad/twinmind |

---

## Setup

**Requirements:** Node 18+, a [Groq API key](https://console.groq.com)

```bash
git clone https://github.com/AditiNamboodirirpad/twinmind.git
cd twinmind
npm install
npm run dev
```

Open `http://localhost:5173`, click **Settings**, paste your Groq API key, and click the mic button.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Speech-to-text | Groq Whisper Large V3 |
| LLM | Groq Llama 4 Maverick (`meta-llama/llama-4-maverick-17b-128e-instruct`), falls back to `llama-3.3-70b-versatile` on 404 |
| Hosting | Vercel |
| Backend | None — fully client-side |

---

## Architecture

Three independent hooks, one per column. `App.jsx` owns settings state and wires them together.

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

The hooks share one piece of state: `fullTranscriptRef` — a running string of everything spoken. `useRecorder` owns and writes it; the other two hooks read from it.

### Dataflow

```
USER SPEAKS
    │
    ▼
MediaRecorder (browser)
  captures audio continuously
  cuts a chunk every 30s (configurable)
    │
    ▼
Audio Blob
    │
    ├──► Groq Whisper Large V3 ──► transcript text
    │         (speech-to-text)           │
    │                                    ▼
    │                            fullTranscriptRef  ◄── grows over time
    │                            transcript[]       ◄── displayed in col 1
    │
    └──► (after each chunk) fetchSuggestions()
                │
                ▼
        Groq Llama 4 Maverick
        (last ~3000 chars of transcript)
                │
                ▼
        3 suggestion cards  ──► displayed in col 2
        (ANSWER / QUESTION TO ASK / FACT CHECK / TALKING POINT)
                │
                ▼ (card click → detailedAnswerPrompt + 8000 chars context)
                  (typed question → chatPrompt + 6000 chars context)
        sendChatMessage()
                │
                ▼
        Groq Llama 4 Maverick — streamed token by token
                │
                ▼
        AI reply builds word by word ──► col 3 (chat)
```

---

## Prompt strategy

Three prompts, each with a different job and a different context window:

**Suggestions prompt** (`suggestionsContextWindow`, default 3000 chars)
Runs every 30 seconds. Reads the last slice of transcript and returns exactly 3 typed cards as JSON. The type is chosen based on what just happened — a question asked gets an ANSWER, a dubious claim gets a FACT CHECK. Each preview is 15–20 words and delivers standalone value without clicking.

**Chat prompt** (`chatContextWindow`, default 6000 chars)
Handles free-form questions typed by the user. Larger context window than suggestions because the user is asking a specific question and needs accuracy, not speed.

**Detailed answer prompt** (`detailedAnswerContextWindow`, default 8000 chars)
Used when a suggestion card is clicked. Separate from the chat prompt — it's instructed to go deep: lead with a direct answer, include numbers and names from the transcript, add 2–3 concrete next steps, and flag any claims worth checking. Larger context window because the card click implies the user wants the full picture.

### Tradeoffs

- **3000 chars for suggestions** — enough recent context to catch what just happened without noise from the start of the meeting. At ~5 words per second of speech, 3000 chars is roughly the last 3–4 minutes.
- **Chunked audio, not streaming** — `MediaRecorder` cuts a blob every N seconds, sends it to Whisper, restarts immediately with zero gap. Streaming audio is simpler to implement than it sounds but adds latency complexity; chunking is predictable.
- **Separate prompts for chat vs. card clicks** — a typed question needs a concise answer; a card click signals the user wants depth. Using the same prompt for both produces either too-short or too-long responses.
- **Ref bridge for cross-hook calls** — `useRecorder` needs to call `fetchSuggestions` after each transcription, but hooks can't import each other. `App.jsx` creates `onTranscribedRef` and assigns `fetchSuggestions` to it; `useRecorder` calls `onTranscribedRef.current()`, always gets the latest function with no stale closure.
- **Streaming chat responses** — chat replies stream token by token via Groq's SSE API. The message appears word by word instead of all at once, which feels faster and more responsive during a live meeting.
- **Whisper garbage filter** — Whisper hallucinates on near-silent chunks (returns "you", "um", "Thanks for watching."). A chunk is discarded only if it fails *both* a character count (< 20) *and* a word count (< 3) check, so real short sentences like "Yes, exactly." still make it through.

---

## Settings

All configurable at runtime via the Settings panel — no code changes needed:

| Setting | Default | What it controls |
|---|---|---|
| Groq API Key | — | Required for all API calls |
| Suggestions prompt | see `prompts.js` | System prompt for suggestion cards |
| Chat prompt | see `prompts.js` | System prompt for typed questions |
| Detailed answer prompt | see `prompts.js` | System prompt for card-click answers |
| Suggestions context | 3000 chars | Transcript window for suggestions |
| Chat context | 6000 chars | Transcript window for chat |
| Detailed answer context | 8000 chars | Transcript window for card answers |
| Auto-refresh interval | 30s | How often to cut a chunk and fetch suggestions |
