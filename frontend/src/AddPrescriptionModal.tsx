import { useState, type FormEvent } from 'react'
import { createPrescription, type MedicationLookup, type PrescriptionCreate, ApiError } from './api'

interface Props {
  userId: number
  medications: MedicationLookup[]
  onCreated: () => void
  onClose: () => void
}

export default function AddPrescriptionModal({ userId, medications, onCreated, onClose }: Props) {
  const [medicationId, setMedicationId] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [doctor, setDoctor] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!medicationId) return
    setError('')
    setLoading(true)
    try {
      const data: PrescriptionCreate = {
        medication_id: Number(medicationId),
        dosage: dosage || undefined,
        frequency: frequency || undefined,
        doctor: doctor || undefined,
      }
      await createPrescription(userId, data)
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create prescription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-medium">Add Prescription</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Medication <span className="text-red-400">*</span></label>
            <select
              value={medicationId}
              onChange={e => setMedicationId(e.target.value)}
              required
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select medication...</option>
              {medications.map(m => (
                <option key={m.medication_id} value={m.medication_id}>
                  {m.medication_name}{m.strength ? ` (${m.strength})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Dosage</label>
            <input
              type="text"
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              placeholder="e.g. 500 mg"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Frequency</label>
            <input
              type="text"
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              placeholder="e.g. twice daily"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Doctor</label>
            <input
              type="text"
              value={doctor}
              onChange={e => setDoctor(e.target.value)}
              placeholder="e.g. Dr. Smith"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !medicationId}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
