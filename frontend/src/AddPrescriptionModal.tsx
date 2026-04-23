import { useState, type FormEvent } from 'react'
import { createPrescription, createMedication, type MedicationLookup, type PrescriptionCreate, ApiError } from './api'

interface Props {
  userId: number
  medications: MedicationLookup[]
  onCreated: (updatedMeds?: MedicationLookup[]) => void
  onClose: () => void
}

export default function AddPrescriptionModal({ userId, medications: initialMeds, onCreated, onClose }: Props) {
  const [meds, setMeds] = useState<MedicationLookup[]>(initialMeds)
  const [medicationId, setMedicationId] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [doctor, setDoctor] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Inline "add medication" state
  const [showAddMed, setShowAddMed] = useState(false)
  const [newMedName, setNewMedName] = useState('')
  const [newMedStrength, setNewMedStrength] = useState('')
  const [newMedForm, setNewMedForm] = useState('')
  const [newMedGeneric, setNewMedGeneric] = useState('')
  const [addMedLoading, setAddMedLoading] = useState(false)
  const [addMedError, setAddMedError] = useState('')

  async function handleAddMedication(e: FormEvent) {
    e.preventDefault()
    if (!newMedName.trim()) return
    setAddMedLoading(true)
    setAddMedError('')
    try {
      const created = await createMedication({
        medication_name: newMedName.trim(),
        strength: newMedStrength.trim() || undefined,
        form: newMedForm.trim() || undefined,
        generic_name: newMedGeneric.trim() || undefined,
      })
      const updated = [...meds, created].sort((a, b) => a.medication_name.localeCompare(b.medication_name))
      setMeds(updated)
      setMedicationId(String(created.medication_id))
      setShowAddMed(false)
      setNewMedName('')
      setNewMedStrength('')
      setNewMedForm('')
      setNewMedGeneric('')
    } catch (err) {
      setAddMedError(err instanceof ApiError ? err.message : 'Failed to add medication')
    } finally {
      setAddMedLoading(false)
    }
  }

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
      onCreated(meds)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create prescription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-medium">Add Prescription</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Medication selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Medication <span className="text-red-400">*</span></label>
              <button type="button" onClick={() => { setShowAddMed(v => !v); setAddMedError('') }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {showAddMed ? 'Cancel new' : '+ New medication'}
              </button>
            </div>
            <select
              value={medicationId}
              onChange={e => setMedicationId(e.target.value)}
              required={!showAddMed}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select medication...</option>
              {meds.map(m => (
                <option key={m.medication_id} value={m.medication_id}>
                  {m.medication_name}{m.generic_name ? ` (${m.generic_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Inline add medication */}
          {showAddMed && (
            <div className="border border-indigo-800 bg-indigo-950/30 rounded-lg p-4 flex flex-col gap-3">
              <p className="text-xs text-indigo-300 font-medium">New medication</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400">Name <span className="text-red-400">*</span></label>
                <input type="text" value={newMedName} onChange={e => setNewMedName(e.target.value)} required
                  placeholder="e.g. Metformin"
                  className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Strength</label>
                  <input type="text" value={newMedStrength} onChange={e => setNewMedStrength(e.target.value)}
                    placeholder="e.g. 500 mg"
                    className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Form</label>
                  <input type="text" value={newMedForm} onChange={e => setNewMedForm(e.target.value)}
                    placeholder="e.g. tablet"
                    className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400">Generic name</label>
                <input type="text" value={newMedGeneric} onChange={e => setNewMedGeneric(e.target.value)}
                  placeholder="e.g. metformin hydrochloride"
                  className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {addMedError && (
                <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2">{addMedError}</p>
              )}
              <button type="button" onClick={handleAddMedication} disabled={addMedLoading || !newMedName.trim()}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded px-3 py-1.5 text-sm font-medium transition-colors">
                {addMedLoading ? 'Adding...' : 'Add and select'}
              </button>
            </div>
          )}

          {/* Prescription fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Dosage</label>
            <input type="text" value={dosage} onChange={e => setDosage(e.target.value)}
              placeholder="e.g. 500 mg"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Frequency</label>
            <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)}
              placeholder="e.g. twice daily"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Doctor</label>
            <input type="text" value={doctor} onChange={e => setDoctor(e.target.value)}
              placeholder="e.g. Dr. Smith"
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !medicationId}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              {loading ? 'Adding...' : 'Add prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
