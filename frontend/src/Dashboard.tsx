import { useState, useEffect, useCallback } from 'react'
import {
  type CurrentUser,
  type UserLookup,
  type MedicationLookup,
  type Prescription,
  lookupUsers,
  lookupMedications,
  getUserPrescriptions,
  deletePrescription,
  logout,
  ApiError,
} from './api'
import AddPrescriptionModal from './AddPrescriptionModal'

interface Props {
  currentUser: CurrentUser
  onLogout: () => void
  darkMode: boolean
  onToggleDark: () => void
}

export default function Dashboard({ currentUser, onLogout, darkMode, onToggleDark }: Props) {
  const [users, setUsers] = useState<UserLookup[]>([])
  const [medications, setMedications] = useState<MedicationLookup[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [showActive, setShowActive] = useState<boolean | undefined>(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const isAdmin = currentUser.role === 'admin'

  useEffect(() => {
    const init = async () => {
      const [usersData, medsData] = await Promise.all([
        lookupUsers().catch(() => [] as UserLookup[]),
        lookupMedications().catch(() => [] as MedicationLookup[]),
      ])
      setUsers(usersData)
      setMedications(medsData)

      // default: admin picks first user; normal user sees themselves
      if (!isAdmin) {
        setSelectedUserId(currentUser.user_id)
      } else if (usersData.length > 0) {
        setSelectedUserId(usersData[0].user_id)
      }
    }
    init()
  }, [currentUser, isAdmin])

  const fetchPrescriptions = useCallback(async () => {
    if (selectedUserId === null) return
    setLoading(true)
    setError('')
    try {
      const data = await getUserPrescriptions(selectedUserId, 1, 100, showActive)
      // already sorted by medication name from backend; sort client-side as well for safety
      const sorted = [...data.items].sort((a, b) =>
        a.medication_name.localeCompare(b.medication_name),
      )
      setPrescriptions(sorted)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, showActive])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  async function handleDelete(prescriptionId: number) {
    if (!confirm('Remove this prescription?')) return
    setDeleting(prescriptionId)
    try {
      await deletePrescription(prescriptionId)
      setPrescriptions(prev => prev.filter(p => p.prescription_id !== prescriptionId))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to remove prescription')
    } finally {
      setDeleting(null)
    }
  }

  async function handleLogout() {
    await logout()
    onLogout()
  }

  const selectedUserName = users.find(u => u.user_id === selectedUserId)?.user_name
    ?? currentUser.user_name

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span className="font-semibold text-white">Prescription Tracker</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:inline">
              {currentUser.user_name}
              {isAdmin && <span className="ml-1.5 text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded">admin</span>}
            </span>
            <button
              onClick={onToggleDark}
              className="text-gray-400 hover:text-white text-lg transition-colors"
              title="Toggle dark/light mode"
            >
              {darkMode ? '☀' : '☾'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <select
              value={selectedUserId ?? ''}
              onChange={e => setSelectedUserId(Number(e.target.value))}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_name} ({u.login_name})
                </option>
              ))}
            </select>
          )}

          <select
            value={showActive === undefined ? '' : String(showActive)}
            onChange={e => setShowActive(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>

          <button
            onClick={() => setShowAdd(true)}
            className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            + Add Prescription
          </button>
        </div>

        {/* Prescriptions panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">
              Prescriptions for {selectedUserName}
            </h2>
            <span className="text-xs text-gray-500">{prescriptions.length} shown</span>
          </div>

          {loading && (
            <div className="px-4 py-10 text-center text-sm text-gray-500">Loading...</div>
          )}

          {error && !loading && (
            <div className="px-4 py-4 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && prescriptions.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              No prescriptions found.
            </div>
          )}

          {!loading && prescriptions.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-2 font-medium">Medication</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">Dosage</th>
                  <th className="px-4 py-2 font-medium hidden md:table-cell">Frequency</th>
                  <th className="px-4 py-2 font-medium hidden md:table-cell">Doctor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(p => (
                  <tr key={p.prescription_id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white font-medium">{p.medication_name}</td>
                    <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">{p.dosage ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{p.frequency ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{p.doctor ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(p.prescription_id)}
                        disabled={deleting === p.prescription_id}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-40 transition-colors text-xs"
                        title="Remove prescription"
                      >
                        {deleting === p.prescription_id ? '...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showAdd && selectedUserId !== null && (
        <AddPrescriptionModal
          userId={selectedUserId}
          medications={medications}
          onCreated={() => { setShowAdd(false); fetchPrescriptions() }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
