import { useState, type FormEvent } from 'react'
import { login, setAccessToken, ApiError } from './api'

interface Props {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(loginName, password)
      setAccessToken(token.access_token)
      onLogin()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not connect to server')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
<<<<<<< feature/phase3-redesign-and-editing
    <div className="min-h-screen bg-paper-100 dark:bg-midnight-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04] bg-gold-400 blur-[120px] pointer-events-none dark:opacity-[0.08]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-[0.03] bg-gold-500 blur-[100px] pointer-events-none dark:opacity-[0.06]" />

      <div className="w-full max-w-sm relative z-10">
        {/* Identity mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gold-500/30 bg-gold-900/20 dark:bg-gold-950/60 mb-5">
            <div className="w-3 h-3 rounded-full bg-gold-500" />
          </div>
          <h1 className="font-display text-[1.85rem] font-semibold text-paper-950 dark:text-paper-100 tracking-tight leading-tight">
            Prescription Tracker
          </h1>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-paper-600 dark:text-midnight-300 mt-2">
            Personal medication record
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper-50 dark:bg-midnight-800 rounded-2xl border border-paper-200 dark:border-midnight-600 p-7 flex flex-col gap-5 shadow-xl shadow-paper-300/30 dark:shadow-midnight-950/60"
        >
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">
              Username
            </label>
=======
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white text-center mb-8">
          Prescription Tracker
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Username</label>
>>>>>>> main
            <input
              type="text"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              required
              autoFocus
<<<<<<< feature/phase3-redesign-and-editing
              className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all placeholder-paper-400 dark:placeholder-midnight-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">
              Password
            </label>
=======
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Password</label>
>>>>>>> main
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
<<<<<<< feature/phase3-redesign-and-editing
              className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
            />
          </div>

          {error && (
            <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-900/8 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-sans bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
=======
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
>>>>>>> main
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
