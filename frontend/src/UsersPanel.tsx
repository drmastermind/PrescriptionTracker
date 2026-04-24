import { useState, useEffect, type FormEvent } from 'react'
import { listUsers, updateUser, deleteUser, adminResetPassword, generateApiKey, revokeApiKey, type User, ApiError } from './api'
import ApiKeyModal from './ApiKeyModal'

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

const editInputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all'
const modalInputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

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
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [apiKeyUserId, setApiKeyUserId] = useState<number | null>(null)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
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

  async function handleDelete(userId: number, loginName: string) {
    if (!confirm(`Permanently delete user "${loginName}"? This cannot be undone.`)) return
    setDeletingId(userId)
    try {
      await deleteUser(userId)
      await load()
      showToast('User deleted.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleGenerateApiKey(userId: number) {
    setApiKeyUserId(userId)
    try {
      const res = await generateApiKey(userId)
      setNewApiKey(res.api_key)
      await load()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to generate API key')
    } finally {
      setApiKeyUserId(null)
    }
  }

  async function handleRevokeApiKey(userId: number, loginName: string) {
    if (!confirm(`Revoke API key for "${loginName}"?`)) return
    setApiKeyUserId(userId)
    try {
      await revokeApiKey(userId)
      await load()
      showToast('API key revoked.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to revoke API key')
    } finally {
      setApiKeyUserId(null)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) return (
    <div className="py-12 text-center">
      <span className="font-mono text-[0.62rem] uppercase tracking-widest text-paper-400 dark:text-midnight-400">Loading...</span>
    </div>
  )
  if (error) return (
    <div className="py-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 font-sans bg-teal-900/90 dark:bg-teal-900/95 text-teal-200 text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50 border border-teal-700/40">
          {toast}
        </div>
      )}

      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-paper-200 dark:border-midnight-600 flex items-center justify-between">
          <h2 className="font-sans text-sm font-semibold text-paper-950 dark:text-paper-100">Users</h2>
          <span className="font-mono text-[0.62rem] text-paper-400 dark:text-midnight-400 tracking-widest">
            {users.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-200 dark:border-midnight-600 bg-paper-100/50 dark:bg-midnight-750/40">
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                  Display name
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                  Login
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden md:table-cell">
                  Email
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                  Role
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden lg:table-cell">
                  Updated
                </th>
                <th className="px-5 py-3 text-left font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400 font-medium hidden xl:table-cell">
                  API Key
                </th>
                <th className="px-5 py-3 w-36" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isEditing = editingId === u.user_id
                const isSelf = u.user_id === currentUserId
                return (
                  <tr key={u.user_id} className="border-b border-paper-200 dark:border-midnight-700 last:border-0 hover:bg-paper-100 dark:hover:bg-midnight-750/60 transition-colors">
                    <td className="px-5 py-3">
                      {isEditing && editState ? (
                        <input
                          value={editState.user_name}
                          onChange={e => setEditState({ ...editState, user_name: e.target.value })}
                          className={`${editInputCls} w-32`}
                        />
                      ) : (
                        <span className="font-sans text-paper-950 dark:text-paper-100 font-medium">{u.user_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing && editState ? (
                        <input
                          value={editState.login_name}
                          onChange={e => setEditState({ ...editState, login_name: e.target.value })}
                          className={`${editInputCls} w-28`}
                        />
                      ) : (
                        <span className="font-mono text-xs text-paper-600 dark:text-midnight-300">{u.login_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {isEditing && editState ? (
                        <input
                          value={editState.email}
                          onChange={e => setEditState({ ...editState, email: e.target.value })}
                          className={`${editInputCls} w-44`}
                        />
                      ) : (
                        <span className="font-sans text-xs text-paper-500 dark:text-midnight-400">{u.email}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing && editState && !isSelf ? (
                        <select
                          value={editState.role}
                          onChange={e => setEditState({ ...editState, role: e.target.value })}
                          className={editInputCls}
                        >
                          <option value="normal">normal</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className={`font-mono text-[0.58rem] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          u.role === 'admin'
                            ? 'bg-gold-900/15 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 border-gold-600/20 dark:border-gold-700/40'
                            : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                        }`}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing && editState && !isSelf ? (
                        <select
                          value={String(editState.is_active)}
                          onChange={e => setEditState({ ...editState, is_active: e.target.value === 'true' })}
                          className={editInputCls}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span className={`font-mono text-[0.58rem] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          u.is_active
                            ? 'bg-teal-900/15 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-600/20 dark:border-teal-900/50'
                            : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="font-mono text-[0.62rem] text-paper-400 dark:text-midnight-500">
                        {fmtDate(u.updated_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden xl:table-cell">
                      {u.api_key_prefix ? (
                        <span className="font-mono text-[0.62rem] text-paper-500 dark:text-midnight-400 bg-paper-100 dark:bg-midnight-700 border border-paper-200 dark:border-midnight-600 rounded px-2 py-0.5">
                          {u.api_key_prefix}…
                        </span>
                      ) : (
                        <span className="font-mono text-[0.6rem] text-paper-300 dark:text-midnight-600">none</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3 items-center">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(u.user_id)}
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
                              onClick={() => startEdit(u)}
                              className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { setResetUserId(u.user_id); setResetError(''); setResetPassword('') }}
                              className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                            >
                              Reset pw
                            </button>
                            <button
                              onClick={() => handleGenerateApiKey(u.user_id)}
                              disabled={apiKeyUserId === u.user_id}
                              className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-teal-600 dark:hover:text-teal-400 disabled:opacity-40 transition-colors"
                              title={u.api_key_prefix ? 'Regenerate API key' : 'Generate API key'}
                            >
                              {apiKeyUserId === u.user_id ? '...' : u.api_key_prefix ? 'Regen key' : 'Gen key'}
                            </button>
                            {u.api_key_prefix && (
                              <button
                                onClick={() => handleRevokeApiKey(u.user_id, u.login_name)}
                                disabled={apiKeyUserId === u.user_id}
                                className="font-sans text-xs text-paper-400 dark:text-midnight-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                            {!isSelf && (
                              <button
                                onClick={() => handleDelete(u.user_id, u.login_name)}
                                disabled={deletingId === u.user_id}
                                className="font-sans text-xs text-paper-400 dark:text-midnight-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors"
                              >
                                {deletingId === u.user_id ? '...' : 'Delete'}
                              </button>
                            )}
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

      {/* API key modal — shown once after generation */}
      {newApiKey && (
        <ApiKeyModal apiKey={newApiKey} onClose={() => setNewApiKey(null)} />
      )}

      {/* Password reset modal */}
      {resetUserId !== null && (
        <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-midnight-950/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
              <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">
                Reset Password
              </h2>
              <button
                onClick={() => setResetUserId(null)}
                className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleReset} className="p-6 flex flex-col gap-5">
              <p className="font-sans text-sm text-paper-600 dark:text-midnight-300">
                Resetting password for:{' '}
                <span className="font-mono font-medium text-paper-950 dark:text-paper-100">
                  {users.find(u => u.user_id === resetUserId)?.login_name}
                </span>
              </p>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>
                  New password{' '}
                  <span className="normal-case tracking-normal font-normal text-paper-400 dark:text-midnight-400">(min 12 chars)</span>
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                  minLength={12}
                  className={modalInputCls}
                />
              </div>
              {resetError && (
                <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-950/20 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">
                  {resetError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="font-sans flex-1 bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="font-sans flex-1 bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                >
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
