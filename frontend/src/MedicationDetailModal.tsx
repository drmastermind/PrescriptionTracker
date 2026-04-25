import type { MedicationLookup } from './api'

interface Props {
  medication: MedicationLookup
  onClose: () => void
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">{label}</span>
      <span className="font-sans text-sm text-paper-900 dark:text-paper-100">{value}</span>
    </div>
  )
}

export default function MedicationDetailModal({ medication: m, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <div>
            <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">
              {m.medication_name}
            </h2>
            {m.generic_name && (
              <p className="font-sans text-xs text-paper-500 dark:text-midnight-400 mt-0.5">{m.generic_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all"
          >
            &times;
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Strength" value={m.strength} />
            <Field label="Form" value={m.form} />
            <Field label="Brand name" value={m.brand_name} />
            <Field label="Generic name" value={m.generic_name} />
          </div>
          {!m.strength && !m.form && !m.brand_name && !m.generic_name && (
            <p className="font-sans text-sm text-paper-400 dark:text-midnight-500 text-center py-2">
              No additional details on file.
            </p>
          )}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full font-sans bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
