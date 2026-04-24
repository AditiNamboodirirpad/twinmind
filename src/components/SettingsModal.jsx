import { useState } from 'react'
import { IconClose } from './Icons'

export function SettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...settings })

  const createFieldHandler = (key) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setDraft((prev) => ({ ...prev, [key]: val }))
  }

  const inputCls =
    'w-full bg-[#1d212a] border border-[#272c38] rounded-lg px-3 py-2 text-sm text-[#e7e9ee] placeholder-[#8a93a6] focus:outline-none focus:border-[#6ea8fe] transition-colors'
  const labelCls = 'block text-xs font-medium text-[#8a93a6] uppercase tracking-wider mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#171a21] border border-[#272c38] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272c38]">
          <h2 className="text-base font-semibold text-[#e7e9ee]">Settings</h2>
          <button onClick={onClose} className="text-[#8a93a6] hover:text-[#e7e9ee] transition-colors">
            <IconClose />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <label className={labelCls}>Groq API Key</label>
            <input
              type="password"
              value={draft.groqApiKey}
              onChange={createFieldHandler('groqApiKey')}
              placeholder="gsk_••••••••••••••••••••••••••••••••"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Suggestions Prompt</label>
            <textarea
              value={draft.suggestionsPrompt}
              onChange={createFieldHandler('suggestionsPrompt')}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className={labelCls}>Chat Prompt</label>
            <textarea
              value={draft.chatPrompt}
              onChange={createFieldHandler('chatPrompt')}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className={labelCls}>Detailed Answer Prompt</label>
            <textarea
              value={draft.detailedAnswerPrompt}
              onChange={createFieldHandler('detailedAnswerPrompt')}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Suggestions Context (chars)</label>
              <input
                type="number"
                value={draft.suggestionsContextWindow}
                onChange={createFieldHandler('suggestionsContextWindow')}
                min={500}
                max={32000}
                step={500}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Chat Context (chars)</label>
              <input
                type="number"
                value={draft.chatContextWindow}
                onChange={createFieldHandler('chatContextWindow')}
                min={500}
                max={32000}
                step={500}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Detailed Answer Context (chars)</label>
            <input
              type="number"
              value={draft.detailedAnswerContextWindow}
              onChange={createFieldHandler('detailedAnswerContextWindow')}
              min={500}
              max={32000}
              step={500}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Auto-refresh interval (seconds)</label>
            <input
              type="number"
              value={draft.suggestionsRefreshInterval}
              onChange={createFieldHandler('suggestionsRefreshInterval')}
              min={10}
              max={300}
              step={5}
              className={inputCls}
            />
            <p className="text-xs text-gray-600 mt-1">
              How often to cut an audio chunk and fetch new suggestions while recording.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#272c38]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#8a93a6] hover:text-[#e7e9ee] transition-colors rounded-lg hover:bg-[#1d212a]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-5 py-2 bg-[#6ea8fe] hover:opacity-90 text-black text-sm font-medium rounded-lg transition-opacity"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
