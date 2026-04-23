import { useState, useEffect, type FormEvent } from 'react'
import { listUsers, updateUser, adminResetPassword, type User, ApiError } from './api'

interface Props {
  currentUserId: number
}

interface EditState {
  user_name: string
  email: string
  login_name: string
  role: string
  is_active: boolean
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default function UsersPanel({ currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await listUsers(1, 100)
      setUsers(data.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(u: User) {
    setEditingId(u.user_id)
    setEditState({ user_name: u.user_name, email: u.email, login_name: u.login_name, role: u.role, is_active: u.is_active })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  async function saveEdit(userId: number) {
    if (!editState) return
    setSaving(true)
    try {
      await updateUser(userId, editState)
      setEditingId(null)
      setEditState(null)
      await load()
      showToast('User updated.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (!resetUserId) return
    setResetLoading(true)
    setResetError('')
    try {
      await adminResetPassword(resetUserId, resetPassword)
      setResetUserId(null)
      setResetPassword('')
      await load()
      showToast('Password reset successfully.')
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) return <div className="text-sm text-gray-500 py-10 text-center">Loading...</div>
  if (error) return <div className="text-sm text-red-400 py-4">{error}</div>

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-800 text-green-100 text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Users</h2>
          <span className="text-xs text-gray-500">{users.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="px-4 py-2 font-medium">Display name</th>
                <th className="px-4 py-2 font-medium">Login</th>
                <th className="px-4 py-2 font-medium hidden md:table-cell">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium hidden lg:table-cell">Updated</th>
                <th className="px-4 py-2 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isEditing = editingId === u.user_id
                const isSelf = u.user_id === currentUserId
                return (
                  <tr key={u.user_id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                    <td className="px-4 py-2">
                      {isEditing && editState ? (
                        <input value={editState.user_name} onChange={e => setEditState({ ...editState, user_name: e.target.value })}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <span className="text-white">{u.user_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing && editState ? (
                        <input value={editState.login_name} onChange={e => setEditState({ ...editState, login_name: e.target.value })}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <span className="text-gray-300 font-mono text-xs">{u.login_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      {isEditing && editState ? (
                        <input value={editState.email} onChange={e => setEditState({ ...editState, email: e.target.value })}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <span className="text-gray-400 text-xs">{u.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing && editState && !isSelf ? (
                        <select value={editState.role} onChange={e => setEditState({ ...editState, role: e.target.value })}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                          <option value="normal">normal</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-indigo-900 text-indigo-300' : 'bg-gray-800 text-gray-400'}`}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing && editState && !isSelf ? (
                        <select value={String(editState.is_active)} onChange={e => setEditState({ ...editState, is_active: e.target.value === 'true' })}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{fmtDate(u.updated_at)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(u.user_id)} disabled={saving}
                              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors">
                              {saving ? '...' : 'Save'}
                            </button>
                            <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(u)} className="text-xs text-gray-400 hover:text-white transition-colors">
                              Edit
                            </button>
                            <button onClick={() => { setResetUserId(u.user_id); setResetError(''); setResetPassword('') }}
                              className="text-xs text-gray-400 hover:text-yellow-400 transition-colors">
                              Reset pw
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
        </div>
      </div>

      {/* Password reset modal */}
      {resetUserId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-medium">Reset Password</h2>
              <button onClick={() => setResetUserId(null)} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleReset} className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-400">
                Resetting password for: <span className="text-white">{users.find(u => u.user_id === resetUserId)?.login_name}</span>
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400">New password <span className="text-gray-600">(min 12 characters)</span></label>
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  required minLength={12}
                  className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {resetError && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{resetError}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetUserId(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetLoading}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  {resetLoading ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
