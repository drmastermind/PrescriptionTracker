import { useState, type FormEvent } from 'react'
import { changePassword, ApiError } from './api'

interface Props {
  onClose: () => void
}

<<<<<<< feature/phase3-redesign-and-editing
const inputCls = 'font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all w-full'
const labelCls = 'font-sans text-[0.68rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300'

=======
>>>>>>> main
export default function ChangePasswordModal({ onClose }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setError('New passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
<<<<<<< feature/phase3-redesign-and-editing
    <div className="fixed inset-0 bg-midnight-950/70 dark:bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-paper-50 dark:bg-midnight-800 border border-paper-200 dark:border-midnight-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-midnight-950/50">

        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-midnight-600">
          <h2 className="font-display text-base font-semibold text-paper-950 dark:text-paper-100">
            Change Password
          </h2>
          <button
            onClick={onClose}
            className="text-paper-400 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-100 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 dark:hover:bg-midnight-700 transition-all"
          >
            &times;
          </button>
=======
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-medium">Change Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
>>>>>>> main
        </div>

        {done ? (
          <div className="p-6 flex flex-col gap-4">
<<<<<<< feature/phase3-redesign-and-editing
            <div className="font-sans text-sm text-teal-600 dark:text-teal-400 bg-teal-900/10 dark:bg-teal-900/20 border border-teal-600/20 dark:border-teal-900/40 rounded-lg px-3.5 py-2.5">
              Password changed successfully.
            </div>
            <button
              onClick={onClose}
              className="font-sans bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-200 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
=======
            <p className="text-sm text-green-400">Password changed successfully.</p>
            <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm transition-colors">
>>>>>>> main
              Close
            </button>
          </div>
        ) : (
<<<<<<< feature/phase3-redesign-and-editing
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Current password</label>
              <input
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>
                New password{' '}
                <span className="normal-case tracking-normal font-normal text-paper-400 dark:text-midnight-400">(min 12 chars)</span>
              </label>
              <input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                required
                minLength={12}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {error && (
              <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-950/20 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="font-sans flex-1 bg-paper-200 dark:bg-midnight-700 hover:bg-paper-300 dark:hover:bg-midnight-600 text-paper-800 dark:text-paper-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="font-sans flex-1 bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              >
=======
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Current password</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">New password <span className="text-gray-600">(min 12 characters)</span></label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={12}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Confirm new password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
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
              <button type="submit" disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
>>>>>>> main
                {loading ? 'Saving...' : 'Change'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
