import { useState, type FormEvent } from 'react'
import {
  type CurrentUser,
  generateApiKey,
  revokeApiKey,
  updateUser,
  ApiError,
} from './api'
import ApiKeyModal from './ApiKeyModal'
import ChangePasswordModal from './ChangePasswordModal'

interface Props {
  currentUser: CurrentUser
  onUserUpdated: (user: CurrentUser) => void
}

const inputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

function EditProfileModal({ currentUser, onSaved, onClose }: { currentUser: CurrentUser; onSaved: (u: CurrentUser) => void; onClose: () => void }) {
  const [userName, setUserName] = useState(currentUser.user_name)
  const [email, setEmail] = useState(currentUser.email)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateUser(currentUser.user_id, { user_name: userName.trim(), email: email.trim() })
      onSaved({ ...currentUser, user_name: userName.trim(), email: email.trim() })
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
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">Edit Profile</h2>
          <button onClick={onClose} className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Display name</label>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} required className={inputCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
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

export default function ProfileTab({ currentUser, onUserUpdated }: Props) {
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(currentUser.api_key_prefix ?? null)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleGenerateApiKey() {
    setApiKeyLoading(true)
    try {
      const res = await generateApiKey(currentUser.user_id)
      setApiKeyPrefix(res.prefix)
      setNewApiKey(res.api_key)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to generate API key')
    } finally {
      setApiKeyLoading(false)
    }
  }

  async function handleRevokeApiKey() {
    if (!confirm('Revoke your API key?')) return
    setApiKeyLoading(true)
    try {
      await revokeApiKey(currentUser.user_id)
      setApiKeyPrefix(null)
      showToast('API key revoked.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to revoke API key')
    } finally {
      setApiKeyLoading(false)
    }
  }

  function handleProfileSaved(updated: CurrentUser) {
    onUserUpdated(updated)
    setShowEditProfile(false)
    showToast('Profile updated.')
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {toast && (
        <div className="fixed bottom-5 right-5 font-sans bg-teal-900/90 dark:bg-teal-900/95 text-teal-200 text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50 border border-teal-700/40">
          {toast}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm">
        <div className="px-5 py-3.5 border-b border-paper-200 dark:border-midnight-600 flex items-center justify-between">
          <h2 className="font-sans text-sm font-semibold text-paper-950 dark:text-paper-100">My Profile</h2>
          <button
            onClick={() => setShowEditProfile(true)}
            className="font-sans text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Display name</span>
            <span className="font-sans text-sm text-paper-900 dark:text-paper-100">{currentUser.user_name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Login name</span>
            <span className="font-mono text-sm text-paper-700 dark:text-midnight-200">{currentUser.login_name}</span>
          </div>
          <div className="col-span-2 flex flex-col gap-0.5">
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Email</span>
            <span className="font-sans text-sm text-paper-900 dark:text-paper-100">{currentUser.email}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-paper-500 dark:text-midnight-400">Role</span>
            <span className={`inline-flex w-fit font-mono text-[0.58rem] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              currentUser.role === 'admin'
                ? 'bg-gold-900/15 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 border-gold-600/20 dark:border-gold-700/40'
                : 'bg-paper-200 dark:bg-midnight-700 text-paper-500 dark:text-midnight-300 border-paper-300 dark:border-midnight-600'
            }`}>
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm">
        <div className="px-5 py-3.5 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-sans text-sm font-semibold text-paper-950 dark:text-paper-100">Password</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="font-sans text-sm text-paper-500 dark:text-midnight-400">Change your account password</span>
          <button
            onClick={() => setShowChangePassword(true)}
            className="font-sans text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
          >
            Change password
          </button>
        </div>
      </div>

      {/* API Key card */}
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-xl shadow-sm">
        <div className="px-5 py-3.5 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-sans text-sm font-semibold text-paper-950 dark:text-paper-100">API Key</h2>
        </div>
        <div className="px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            {apiKeyPrefix ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-paper-500 dark:text-midnight-400">Active key:</span>
                <code className="font-mono text-xs bg-paper-100 dark:bg-midnight-700 border border-paper-200 dark:border-midnight-600 rounded px-2 py-0.5 text-paper-800 dark:text-paper-200">
                  {apiKeyPrefix}...
                </code>
              </div>
            ) : (
              <span className="font-sans text-xs text-paper-400 dark:text-midnight-500">No API key. Generate one to access the API programmatically.</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateApiKey}
              disabled={apiKeyLoading}
              className="font-sans text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 disabled:opacity-40 transition-colors"
            >
              {apiKeyLoading ? '...' : apiKeyPrefix ? 'Regenerate' : 'Generate'}
            </button>
            {apiKeyPrefix && (
              <button
                onClick={handleRevokeApiKey}
                disabled={apiKeyLoading}
                className="font-sans text-xs text-paper-400 dark:text-midnight-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </div>

      {newApiKey && <ApiKeyModal apiKey={newApiKey} onClose={() => setNewApiKey(null)} />}
      {showEditProfile && (
        <EditProfileModal currentUser={currentUser} onSaved={handleProfileSaved} onClose={() => setShowEditProfile(false)} />
      )}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  )
}
