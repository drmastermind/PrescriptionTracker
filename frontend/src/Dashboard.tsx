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
import EditPrescriptionModal from './EditPrescriptionModal'
import PrescriptionDetailModal from './PrescriptionDetailModal'
import ApiKeyModal from './ApiKeyModal'
import UsersPanel from './UsersPanel'
import MedicationsTab from './MedicationsTab'
import ProfileTab from './ProfileTab'

interface Props {
  currentUser: CurrentUser
  onLogout: () => void
  onUserUpdated: (user: CurrentUser) => void
  darkMode: boolean
  onToggleDark: () => void
}

type Tab = 'prescriptions' | 'medicines' | 'profile' | 'users'

export default function Dashboard({ currentUser, onLogout, onUserUpdated, darkMode, onToggleDark }: Props) {
  const [tab, setTab] = useState<Tab>('prescriptions')
  const [users, setUsers] = useState<UserLookup[]>([])
  const [medications, setMedications] = useState<MedicationLookup[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [showActive, setShowActive] = useState<boolean | undefined>(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Prescription | null>(null)
  const [detail, setDetail] = useState<Prescription | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

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

  const selectedUserName = users.find(u => u.user_id === selectedUserId)?.user_name ?? currentUser.user_name

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'medicines', label: 'Medicines' },
    { key: 'profile', label: 'My Profile' },
    ...(isAdmin ? [{ key: 'users' as Tab, label: 'Users' }] : []),
  ]

  return (
    <div className="min-h-screen bg-paper-100 dark:bg-midnight-900 font-sans">
      <div className="h-[3px] bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-80" />

      <header className="bg-paper-50 dark:bg-midnight-800 border-b border-paper-200 dark:border-midnight-600">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
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

        <div className="max-w-6xl mx-auto px-4 flex gap-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                tab === t.key
                  ? 'border-gold-500 text-gold-600 dark:text-gold-400'
                  : 'border-transparent text-paper-500 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-7">
        {tab === 'users' && isAdmin && (
          <UsersPanel currentUserId={currentUser.user_id} />
        )}

        {tab === 'medicines' && (
          <MedicationsTab medications={medications} onMedicationsChange={setMedications} />
        )}

        {tab === 'profile' && (
          <ProfileTab currentUser={currentUser} onUserUpdated={onUserUpdated} />
        )}

        {tab === 'prescriptions' && (
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
              <div className="flex items-center gap-2 ml-auto">
                {!isAdmin && (
                  <span className="font-sans text-xs text-paper-500 dark:text-midnight-400">
                    {selectedUserName}
                  </span>
                )}
                <button
                  onClick={() => setShowAdd(true)}
                  className="bg-gold-500 hover:bg-gold-400 active:bg-gold-600 text-midnight-900 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                >
                  + Add Prescription
                </button>
              </div>
            </div>

            {loading && (
              <div className="py-16 text-center">
                <span className="font-mono text-[0.62rem] uppercase tracking-widest text-paper-400 dark:text-midnight-400">Loading...</span>
              </div>
            )}
            {error && !loading && (
              <div className="py-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
            )}
            {!loading && !error && prescriptions.length === 0 && (
              <div className="py-16 text-center text-sm text-paper-400 dark:text-midnight-400">
                No prescriptions found.
              </div>
            )}

            {/* Prescription tiles */}
            {!loading && prescriptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prescriptions.map(p => (
                  <div
                    key={p.prescription_id}
                    className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm flex flex-col"
                  >
                    {/* Tile header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-sans font-semibold text-paper-950 dark:text-paper-100 text-sm leading-snug">
                            {p.medication.medication_name}
                          </h3>
                          {p.medication.generic_name && (
                            <p className="font-sans text-xs text-paper-500 dark:text-midnight-400 mt-0.5 truncate">
                              {p.medication.generic_name}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 font-mono text-[0.55rem] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          p.is_active
                            ? 'bg-teal-900/15 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-600/20 dark:border-teal-900/50'
                            : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                        }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Dosage & frequency badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {p.dosage && (
                          <span className="font-mono text-[0.62rem] px-2.5 py-1 rounded-full bg-gold-900/10 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400 border border-gold-600/20 dark:border-gold-800/40">
                            {p.dosage}
                          </span>
                        )}
                        {p.frequency && (
                          <span className="font-mono text-[0.62rem] px-2.5 py-1 rounded-full bg-paper-200 dark:bg-midnight-700 text-paper-600 dark:text-midnight-300 border border-paper-300 dark:border-midnight-600">
                            {p.frequency}
                          </span>
                        )}
                      </div>

                      {p.doctor && (
                        <p className="font-sans text-xs text-paper-400 dark:text-midnight-500 mt-2">{p.doctor}</p>
                      )}
                    </div>

                    {/* Tile actions */}
                    <div className="mt-auto px-5 py-3 border-t border-paper-200 dark:border-midnight-700 flex items-center gap-3">
                      <button
                        onClick={() => setDetail(p)}
                        className="font-sans text-xs font-medium text-paper-500 dark:text-midnight-400 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setEditing(p)}
                        className="font-sans text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.prescription_id)}
                        disabled={deleting === p.prescription_id}
                        className="font-sans text-xs text-paper-400 dark:text-midnight-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors ml-auto"
                      >
                        {deleting === p.prescription_id ? '...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {newApiKey && <ApiKeyModal apiKey={newApiKey} onClose={() => setNewApiKey(null)} />}

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

      {editing && (
        <EditPrescriptionModal
          prescription={editing}
          medications={medications}
          onSaved={() => { setEditing(null); fetchPrescriptions() }}
          onClose={() => setEditing(null)}
        />
      )}

      {detail && (
        <PrescriptionDetailModal
          prescription={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
