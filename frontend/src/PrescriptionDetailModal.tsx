import type { Prescription } from './api'

interface Props {
  prescription: Prescription
  onClose: () => void
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">{label}</span>
      <span className="font-sans text-sm text-paper-900 dark:text-paper-100">{value}</span>
    </div>
  )
}

export default function PrescriptionDetailModal({ prescription: p, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <div>
            <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">
              {p.medication.medication_name}
            </h2>
            {p.medication.generic_name && (
              <p className="font-sans text-xs text-paper-500 dark:text-midnight-400 mt-0.5">{p.medication.generic_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-[0.58rem] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              p.is_active
                ? 'bg-teal-900/15 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-600/20 dark:border-teal-900/50'
                : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
            }`}>
              {p.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={onClose}
              className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dosage" value={p.dosage} />
            <Field label="Frequency" value={p.frequency} />
            <Field label="Doctor" value={p.doctor} />
            <Field label="Route" value={p.route} />
            <Field label="Prescribed date" value={p.prescribed_date} />
            <Field label="Start date" value={p.start_date} />
            <Field label="End date" value={p.end_date} />
            <Field label="Quantity" value={p.quantity} />
            <Field label="Refills remaining" value={p.refills_remaining} />
            <Field label="Pharmacy" value={p.pharmacy} />
          </div>
          {p.reason && (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Reason</span>
              <span className="font-sans text-sm text-paper-900 dark:text-paper-100">{p.reason}</span>
            </div>
          )}
          {p.notes && (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Notes</span>
              <span className="font-sans text-sm text-paper-900 dark:text-paper-100 whitespace-pre-wrap">{p.notes}</span>
            </div>
          )}
          <div className="border-t border-paper-200 dark:border-midnight-600 pt-4 grid grid-cols-2 gap-4">
            <Field label="Added" value={new Date(p.created_at).toLocaleDateString()} />
            <Field label="Updated" value={new Date(p.updated_at).toLocaleDateString()} />
          </div>
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
