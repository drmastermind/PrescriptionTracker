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

const inputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

function isLocked(user: User): boolean {
  if (!user.locked_until) return false
  return new Date(user.locked_until) > new Date()
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  const chars = Array.from(arr).map(b => all[b % all.length])
  chars[0] = upper[arr[0] % upper.length]
  chars[1] = lower[arr[1] % lower.length]
  chars[2] = digits[arr[2] % digits.length]
  chars[3] = symbols[arr[3] % symbols.length]
  return chars.join('')
}

function EditUserModal({
  user,
  isSelf,
  onSaved,
  onClose,
}: {
  user: User
  isSelf: boolean
  onSaved: () => void
  onClose: () => void
}) {
  const [state, setState] = useState<EditState>({
    user_name: user.user_name,
    email: user.email,
    login_name: user.login_name,
    role: user.role,
    is_active: user.is_active,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateUser(user.user_id, state)
      onSaved()
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
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">Edit User</h2>
          <button onClick={onClose} className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Display name</label>
            <input type="text" value={state.user_name} onChange={e => setState({ ...state, user_name: e.target.value })} required className={inputCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Login name</label>
            <input type="text" value={state.login_name} onChange={e => setState({ ...state, login_name: e.target.value })} required className={inputCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Email</label>
            <input type="email" value={state.email} onChange={e => setState({ ...state, email: e.target.value })} required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Role</label>
              <select
                value={state.role}
                onChange={e => setState({ ...state, role: e.target.value })}
                disabled={isSelf}
                className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="normal">normal</option>
                <option value="admin">admin</option>
              </select>
              {isSelf && (
                <span className="font-sans text-[0.65rem] text-paper-400 dark:text-midnight-500">Cannot change your own role</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Status</label>
              <select
                value={String(state.is_active)}
                onChange={e => setState({ ...state, is_active: e.target.value === 'true' })}
                disabled={isSelf}
                className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PasswordModal({
  user,
  onDone,
  onClose,
}: {
  user: User
  onDone: () => void
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminResetPassword(user.user_id, password)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  function suggest() {
    setPassword(generateStrongPassword())
    setShowPassword(true)
  }

  return (
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-midnight-950/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">Set Password</h2>
          <button onClick={onClose} className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <p className="font-sans text-sm text-paper-600 dark:text-midnight-300">
            Setting password for{' '}
            <span className="font-mono font-medium text-paper-950 dark:text-paper-100">{user.login_name}</span>
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>
                New password{' '}
                <span className="normal-case tracking-normal font-normal text-paper-400 dark:text-midnight-400">(min 12 chars)</span>
              </label>
              <button
                type="button"
                onClick={suggest}
                className="font-sans text-xs text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
              >
                Suggest
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                className={`${inputCls} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[0.6rem] uppercase tracking-wider text-paper-500 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && (
            <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-950/20 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="font-sans flex-1 bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="font-sans flex-1 bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
              {loading ? 'Setting...' : 'Set password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPanel({ currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
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

  async function handleUnlock(user: User) {
    try {
      await updateUser(user.user_id, { locked_until: null, failed_login_count: 0 })
      await load()
      showToast('Account unlocked.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to unlock')
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
    <div className="py-16 text-center">
      <span className="font-mono text-[0.62rem] uppercase tracking-widest text-paper-400 dark:text-midnight-400">Loading...</span>
    </div>
  )
  if (error) return (
    <div className="py-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
  )

  return (
    <>
      {toast && (
        <div className="fixed bottom-5 right-5 font-sans bg-teal-900/90 dark:bg-teal-900/95 text-teal-200 text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50 border border-teal-700/40">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const isSelf = u.user_id === currentUserId
          const locked = isLocked(u)
          return (
            <div
              key={u.user_id}
              className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm flex flex-col"
            >
              {/* User info */}
              <div className="px-5 pt-5 pb-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans font-semibold text-paper-950 dark:text-paper-100 text-sm leading-snug flex items-center gap-2">
                      {u.user_name}
                      {isSelf && (
                        <span className="font-mono text-[0.55rem] uppercase tracking-wider text-paper-400 dark:text-midnight-500">(you)</span>
                      )}
                    </h3>
                    <p className="font-mono text-xs text-paper-600 dark:text-midnight-300 mt-0.5">@{u.login_name}</p>
                    <p className="font-sans text-xs text-paper-400 dark:text-midnight-500 mt-0.5 truncate">{u.email}</p>
                  </div>
                  <span className={`shrink-0 font-mono text-[0.55rem] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    u.role === 'admin'
                      ? 'bg-gold-900/15 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 border-gold-600/20 dark:border-gold-700/40'
                      : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                  }`}>
                    {u.role}
                  </span>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`font-mono text-[0.58rem] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    u.is_active
                      ? 'bg-teal-900/15 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-600/20 dark:border-teal-900/50'
                      : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {locked && (
                    <span className="font-mono text-[0.58rem] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-950/20 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-600/20 dark:border-rose-900/50">
                      Locked
                    </span>
                  )}
                  {u.api_key_prefix && (
                    <code className="font-mono text-[0.58rem] bg-paper-100 dark:bg-midnight-700 border border-paper-200 dark:border-midnight-600 rounded px-1.5 py-0.5 text-paper-500 dark:text-midnight-400">
                      {u.api_key_prefix}...
                    </code>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-paper-200 dark:border-midnight-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  onClick={() => setEditingUser(u)}
                  className="font-sans text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setPasswordUser(u)}
                  className="font-sans text-xs text-paper-500 dark:text-midnight-400 hover:text-paper-950 dark:hover:text-paper-100 transition-colors"
                >
                  Password
                </button>
                {locked && (
                  <button
                    onClick={() => handleUnlock(u)}
                    className="font-sans text-xs text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 transition-colors"
                  >
                    Unlock
                  </button>
                )}
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
                    Revoke key
                  </button>
                )}
                {!isSelf && (
                  <button
                    onClick={() => handleDelete(u.user_id, u.login_name)}
                    disabled={deletingId === u.user_id}
                    className="font-sans text-xs text-paper-400 dark:text-midnight-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors ml-auto"
                  >
                    {deletingId === u.user_id ? '...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {newApiKey && <ApiKeyModal apiKey={newApiKey} onClose={() => setNewApiKey(null)} />}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isSelf={editingUser.user_id === currentUserId}
          onSaved={async () => { setEditingUser(null); await load(); showToast('User updated.') }}
          onClose={() => setEditingUser(null)}
        />
      )}

      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          onDone={() => { setPasswordUser(null); showToast('Password updated.') }}
          onClose={() => setPasswordUser(null)}
        />
      )}
    </>
  )
}
