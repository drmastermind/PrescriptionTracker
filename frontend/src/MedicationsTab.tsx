import { useState } from 'react'
import { type MedicationLookup } from './api'
import EditMedicationModal from './EditMedicationModal'
import MedicationDetailModal from './MedicationDetailModal'

interface Props {
  medications: MedicationLookup[]
  onMedicationsChange: (updated: MedicationLookup[]) => void
}

export default function MedicationsTab({ medications, onMedicationsChange }: Props) {
  const [editing, setEditing] = useState<MedicationLookup | null>(null)
  const [detail, setDetail] = useState<MedicationLookup | null>(null)

  function handleSaved(updated: MedicationLookup) {
    onMedicationsChange(
      medications.map(m => m.medication_id === updated.medication_id ? updated : m)
    )
    setEditing(null)
  }

  if (medications.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-paper-400 dark:text-midnight-400">
        No medications found.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {medications.map(m => (
          <div
            key={m.medication_id}
            className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm flex flex-col"
          >
            <div className="px-5 pt-5 pb-3 flex-1">
              <h3 className="font-sans font-semibold text-paper-950 dark:text-paper-100 text-sm leading-snug">
                {m.medication_name}
              </h3>
              {m.generic_name && (
                <p className="font-sans text-xs text-paper-500 dark:text-midnight-400 mt-0.5">{m.generic_name}</p>
              )}
              {m.brand_name && (
                <p className="font-sans text-xs text-paper-400 dark:text-midnight-500 mt-0.5 italic">{m.brand_name}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {m.strength && (
                  <span className="font-mono text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded-full bg-paper-200 dark:bg-midnight-700 text-paper-600 dark:text-midnight-300 border border-paper-300 dark:border-midnight-600">
                    {m.strength}
                  </span>
                )}
                {m.form && (
                  <span className="font-mono text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded-full bg-paper-200 dark:bg-midnight-700 text-paper-600 dark:text-midnight-300 border border-paper-300 dark:border-midnight-600">
                    {m.form}
                  </span>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-paper-200 dark:border-midnight-700 flex items-center gap-3">
              <button
                onClick={() => setDetail(m)}
                className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
              >
                Details
              </button>
              <button
                onClick={() => setEditing(m)}
                className="font-sans text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {detail && (
        <MedicationDetailModal medication={detail} onClose={() => setDetail(null)} />
      )}

      {editing && (
        <EditMedicationModal medication={editing} onSaved={handleSaved} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
