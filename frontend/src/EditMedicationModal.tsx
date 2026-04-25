import { useState, type FormEvent } from 'react'
import { updateMedication, type MedicationLookup, ApiError } from './api'

interface Props {
  medication: MedicationLookup
  onSaved: (updated: MedicationLookup) => void
  onClose: () => void
}

const inputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

export default function EditMedicationModal({ medication: med, onSaved, onClose }: Props) {
  const [name, setName] = useState(med.medication_name)
  const [generic, setGeneric] = useState(med.generic_name ?? '')
  const [strength, setStrength] = useState(med.strength ?? '')
  const [form, setForm] = useState(med.form ?? '')
  const [brand, setBrand] = useState(med.brand_name ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      const updated = await updateMedication(med.medication_id, {
        medication_name: name.trim(),
        generic_name: generic.trim() || undefined,
        strength: strength.trim() || undefined,
        form: form.trim() || undefined,
        brand_name: brand.trim() || undefined,
      })
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">Edit Medication</h2>
          <button onClick={onClose} className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Name <span className="text-rose-500">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Metformin" className={inputCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Generic name</label>
            <input type="text" value={generic} onChange={e => setGeneric(e.target.value)} placeholder="e.g. metformin hydrochloride" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Strength</label>
              <input type="text" value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g. 500 mg" className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Form</label>
              <input type="text" value={form} onChange={e => setForm(e.target.value)} placeholder="e.g. tablet" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Brand name</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Glucophage" className={inputCls} />
          </div>

          {error && (
            <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-950/20 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="font-sans flex-1 bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="font-sans flex-1 bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
