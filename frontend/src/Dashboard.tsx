import { useState, useEffect, useCallback } from 'react'
import {
  type CurrentUser,
  type UserLookup,
  type MedicationLookup,
  type Prescription,
  lookupUsers,
  lookupMedications,
  getUserPrescriptions,
  updatePrescription,
  deletePrescription,
  logout,
  ApiError,
} from './api'
import AddPrescriptionModal from './AddPrescriptionModal'
import UsersPanel from './UsersPanel'
import ChangePasswordModal from './ChangePasswordModal'

interface Props {
  currentUser: CurrentUser
  onLogout: () => void
  darkMode: boolean
  onToggleDark: () => void
}

type Tab = 'prescriptions' | 'users'

export default function Dashboard({ currentUser, onLogout, darkMode, onToggleDark }: Props) {
  const [tab, setTab] = useState<Tab>('prescriptions')
  const [users, setUsers] = useState<UserLookup[]>([])
  const [medications, setMedications] = useState<MedicationLookup[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [showActive, setShowActive] = useState<boolean | undefined>(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<{ medication_id: number; dosage: string; frequency: string; doctor: string; is_active: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const isAdmin = currentUser.role === 'admin'

  useEffect(() => {
    const init = async () => {
      const [usersData, medsData] = await Promise.all([
        lookupUsers().catch(() => [] as UserLookup[]),
        lookupMedications().catch(() => [] as MedicationLookup[]),
      ])
      setUsers(usersData)
      setMedications(medsData)
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
      const sorted = [...data.items].sort((a, b) =>
        a.medication.medication_name.localeCompare(b.medication.medication_name),
      )
      setPrescriptions(sorted)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, showActive])

  useEffect(() => {
    if (tab === 'prescriptions') fetchPrescriptions()
  }, [fetchPrescriptions, tab])

  function startEdit(p: Prescription) {
    setEditingId(p.prescription_id)
    setEditState({ medication_id: p.medication_id, dosage: p.dosage ?? '', frequency: p.frequency ?? '', doctor: p.doctor ?? '', is_active: p.is_active })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  async function saveEdit(prescriptionId: number) {
    if (!editState) return
    setSaving(true)
    try {
      await updatePrescription(prescriptionId, {
        medication_id: editState.medication_id,
        dosage: editState.dosage || undefined,
        frequency: editState.frequency || undefined,
        doctor: editState.doctor || undefined,
        is_active: editState.is_active,
      })
      setEditingId(null)
      setEditState(null)
      fetchPrescriptions()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

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
    <div className="min-h-screen bg-paper-100 dark:bg-midnight-900 font-sans">
      {/* Amber accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-80" />

      {/* Header */}
      <header className="bg-paper-50 dark:bg-midnight-800 border-b border-paper-200 dark:border-midnight-600">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span className="font-display text-[1.1rem] font-semibold text-paper-950 dark:text-paper-100 tracking-tight">
            Prescription Tracker
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-paper-600 dark:text-midnight-300 hidden sm:flex items-center gap-2">
              {currentUser.user_name}
              {isAdmin && (
                <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-widest bg-gold-900/15 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 border border-gold-600/20 dark:border-gold-700/40 px-2 py-0.5 rounded-full">
                  admin
                </span>
              )}
            </span>
            <button
              onClick={() => setShowChangePassword(true)}
              className="text-xs text-paper-500 dark:text-midnight-300 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
              title="Change password"
            >
              Password
            </button>
            <button
              onClick={onToggleDark}
              className="text-paper-500 dark:text-midnight-300 hover:text-paper-950 dark:hover:text-paper-100 text-base transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700"
              title="Toggle dark/light mode"
            >
              {darkMode ? '◑' : '◐'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-paper-500 dark:text-midnight-300 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs (admin only) */}
        {isAdmin && (
          <div className="max-w-5xl mx-auto px-4 flex gap-0">
            {(['prescriptions', 'users'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                  tab === t
                    ? 'border-gold-500 text-gold-600 dark:text-gold-400'
                    : 'border-transparent text-paper-500 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-7">
        {tab === 'users' && isAdmin ? (
          <UsersPanel currentUserId={currentUser.user_id} />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <select
                  value={selectedUserId ?? ''}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="bg-paper-50 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
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
                className="bg-paper-50 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="">All</option>
              </select>
              <button
                onClick={() => setShowAdd(true)}
                className="ml-auto bg-gold-500 hover:bg-gold-400 active:bg-gold-600 text-midnight-900 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                + Add Prescription
              </button>
            </div>

            {/* Prescriptions table */}
            <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-paper-200 dark:border-midnight-600 flex items-center justify-between">
                <h2 className="font-sans text-sm font-semibold text-paper-950 dark:text-paper-100">
                  Prescriptions for{' '}
                  <span className="text-gold-600 dark:text-gold-400">{selectedUserName}</span>
                </h2>
                <span className="font-mono text-[0.62rem] text-paper-400 dark:text-midnight-400 tracking-widest">
                  {prescriptions.length} shown
                </span>
              </div>

              {loading && (
                <div className="px-5 py-12 text-center">
                  <span className="font-mono text-[0.62rem] uppercase tracking-widest text-paper-400 dark:text-midnight-400">
                    Loading...
                  </span>
                </div>
              )}
              {error && !loading && (
                <div className="px-5 py-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
              )}
              {!loading && !error && prescriptions.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-paper-400 dark:text-midnight-400">
                  No prescriptions found.
                </div>
              )}
              {!loading && prescriptions.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-paper-200 dark:border-midnight-600 bg-paper-100/50 dark:bg-midnight-750/40">
                      <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                        Medication
                      </th>
                      <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden sm:table-cell">
                        Dosage
                      </th>
                      <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden md:table-cell">
                        Frequency
                      </th>
                      <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden md:table-cell">
                        Doctor
                      </th>
                      <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                        Status
                      </th>
                      <th className="px-5 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(p => {
                      const isEditing = editingId === p.prescription_id
                      return (
                        <tr
                          key={p.prescription_id}
                          className="border-b border-paper-200 dark:border-midnight-700 last:border-0 hover:bg-paper-100 dark:hover:bg-midnight-750/60 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-paper-950 dark:text-paper-100 font-medium">
                            {isEditing && editState ? (
                              <select
                                value={editState.medication_id}
                                onChange={e => setEditState({ ...editState, medication_id: Number(e.target.value) })}
                                className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                              >
                                {medications.map(m => (
                                  <option key={m.medication_id} value={m.medication_id}>
                                    {m.medication_name}{m.generic_name ? ` (${m.generic_name})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <>
                                {p.medication.medication_name}
                                {p.medication.generic_name && (
                                  <span className="block font-sans text-xs font-normal text-paper-500 dark:text-midnight-400">
                                    {p.medication.generic_name}
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-paper-700 dark:text-midnight-200 hidden sm:table-cell">
                            {isEditing && editState ? (
                              <input
                                value={editState.dosage}
                                onChange={e => setEditState({ ...editState, dosage: e.target.value })}
                                placeholder="Dosage"
                                className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-28"
                              />
                            ) : (p.dosage ?? <span className="text-paper-300 dark:text-midnight-500">—</span>)}
                          </td>
                          <td className="px-5 py-3.5 text-paper-700 dark:text-midnight-200 hidden md:table-cell">
                            {isEditing && editState ? (
                              <input
                                value={editState.frequency}
                                onChange={e => setEditState({ ...editState, frequency: e.target.value })}
                                placeholder="Frequency"
                                className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-28"
                              />
                            ) : (p.frequency ?? <span className="text-paper-300 dark:text-midnight-500">—</span>)}
                          </td>
                          <td className="px-5 py-3.5 text-paper-700 dark:text-midnight-200 hidden md:table-cell">
                            {isEditing && editState ? (
                              <input
                                value={editState.doctor}
                                onChange={e => setEditState({ ...editState, doctor: e.target.value })}
                                placeholder="Doctor"
                                className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-28"
                              />
                            ) : (p.doctor ?? <span className="text-paper-300 dark:text-midnight-500">—</span>)}
                          </td>
                          <td className="px-5 py-3.5">
                            {isEditing && editState ? (
                              <select
                                value={String(editState.is_active)}
                                onChange={e => setEditState({ ...editState, is_active: e.target.value === 'true' })}
                                className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <span className={`font-mono text-[0.58rem] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                p.is_active
                                  ? 'bg-teal-900/15 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-600/20 dark:border-teal-900/50'
                                  : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                              }`}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-3 items-center">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveEdit(p.prescription_id)}
                                    disabled={saving}
                                    className="font-sans text-xs text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 disabled:opacity-40 transition-colors font-medium"
                                  >
                                    {saving ? '...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(p.prescription_id)}
                                    disabled={deleting === p.prescription_id}
                                    className="font-sans text-xs text-paper-400 dark:text-midnight-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors"
                                  >
                                    {deleting === p.prescription_id ? '...' : 'Remove'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {showAdd && selectedUserId !== null && (
        <AddPrescriptionModal
          userId={selectedUserId}
          medications={medications}
          onCreated={(updatedMeds) => {
            if (updatedMeds) setMedications(updatedMeds)
            setShowAdd(false)
            fetchPrescriptions()
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
