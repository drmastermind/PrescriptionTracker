import { useState } from 'react'

interface Props {
  apiKey: string
  onClose: () => void
}

export default function ApiKeyModal({ apiKey, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-md shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">
            API Key Generated
          </h2>
          <button
            onClick={onClose}
            className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all"
          >
            &times;
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 rounded-xl px-4 py-3">
            <p className="font-sans text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">
              Copy now — shown once only
            </p>
            <p className="font-sans text-xs text-amber-600 dark:text-amber-500">
              This key will not be displayed again. Store it somewhere safe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-paper-100 dark:bg-midnight-700 border border-paper-300 dark:border-midnight-500 rounded-lg px-3 py-2.5 text-paper-800 dark:text-paper-200 break-all select-all">
              {apiKey}
            </code>
            <button
              onClick={copyKey}
              className={`font-sans shrink-0 text-xs font-medium px-3 py-2.5 rounded-lg border transition-all ${
                copied
                  ? 'bg-teal-900/20 dark:bg-teal-900/40 border-teal-600/30 dark:border-teal-700/50 text-teal-600 dark:text-teal-400'
                  : 'bg-paper-200 dark:bg-midnight-700 border-paper-300 dark:border-midnight-500 text-paper-700 dark:text-paper-300 hover:bg-paper-300 dark:hover:bg-midnight-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="font-sans bg-gold-500 hover:bg-gold-400 active:bg-gold-600 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
