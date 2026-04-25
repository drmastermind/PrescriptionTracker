import { useState, type FormEvent } from 'react'
import { updatePrescription, type Prescription, type MedicationLookup, ApiError } from './api'

interface Props {
  prescription: Prescription
  medications: MedicationLookup[]
  onSaved: () => void
  onClose: () => void
}

const inputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

export default function EditPrescriptionModal({ prescription: p, medications, onSaved, onClose }: Props) {
  const [medicationId, setMedicationId] = useState(String(p.medication_id))
  const [dosage, setDosage] = useState(p.dosage ?? '')
  const [frequency, setFrequency] = useState(p.frequency ?? '')
  const [doctor, setDoctor] = useState(p.doctor ?? '')
  const [isActive, setIsActive] = useState(p.is_active)
  const [prescribedDate, setPrescribedDate] = useState(p.prescribed_date ?? '')
  const [startDate, setStartDate] = useState(p.start_date ?? '')
  const [endDate, setEndDate] = useState(p.end_date ?? '')
  const [quantity, setQuantity] = useState(p.quantity !== undefined && p.quantity !== null ? String(p.quantity) : '')
  const [refills, setRefills] = useState(p.refills_remaining !== undefined && p.refills_remaining !== null ? String(p.refills_remaining) : '')
  const [route, setRoute] = useState(p.route ?? '')
  const [reason, setReason] = useState(p.reason ?? '')
  const [pharmacy, setPharmacy] = useState(p.pharmacy ?? '')
  const [notes, setNotes] = useState(p.notes ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updatePrescription(p.prescription_id, {
        medication_id: Number(medicationId),
        dosage: dosage || undefined,
        frequency: frequency || undefined,
        doctor: doctor || undefined,
        is_active: isActive,
        prescribed_date: prescribedDate || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        refills_remaining: refills ? Number(refills) : undefined,
        route: route || undefined,
        reason: reason || undefined,
        pharmacy: pharmacy || undefined,
        notes: notes || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">Edit Prescription</h2>
          <button onClick={onClose} className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Medication <span className="text-rose-500">*</span></label>
            <select value={medicationId} onChange={e => setMedicationId(e.target.value)} required className={inputCls}>
              {medications.map(m => (
                <option key={m.medication_id} value={m.medication_id}>
                  {m.medication_name}{m.generic_name ? ` (${m.generic_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Dosage</label>
              <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 500 mg" className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Frequency</label>
              <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. twice daily" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Doctor</label>
              <input type="text" value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="e.g. Dr. Smith" className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Status</label>
              <select value={String(isActive)} onChange={e => setIsActive(e.target.value === 'true')} className={inputCls}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Prescribed</label>
              <input type="date" value={prescribedDate} onChange={e => setPrescribedDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>End date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Quantity</label>
              <input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Units per fill" className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Refills remaining</label>
              <input type="number" min="0" value={refills} onChange={e => setRefills(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Route</label>
              <input type="text" value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g. oral" className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Pharmacy</label>
              <input type="text" value={pharmacy} onChange={e => setPharmacy(e.target.value)} placeholder="Pharmacy name" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Indication" className={inputCls} />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='e.g. "Take with food"'
              rows={3}
              className={`${inputCls} resize-none`}
            />
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
            <button type="submit" disabled={loading} className="font-sans flex-1 bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
