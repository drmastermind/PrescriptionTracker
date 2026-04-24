import { useState, type FormEvent } from 'react'
import { login, register, setAccessToken, setRefreshToken, ApiError } from './api'

interface Props {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // login fields
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')

  // register fields
  const [regLoginName, setRegLoginName] = useState('')
  const [regUserName, setRegUserName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m: 'login' | 'register') {
    setMode(m)
    setError('')
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(loginName, password)
      setAccessToken(token.access_token)
      setRefreshToken(token.refresh_token)
      onLogin()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await register({ login_name: regLoginName, user_name: regUserName, email: regEmail, password: regPassword })
      // auto-login after registration
      const token = await login(regLoginName, regPassword)
      setAccessToken(token.access_token)
      setRefreshToken(token.refresh_token)
      onLogin()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
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

        {/* Mode tabs */}
        <div className="flex gap-0 mb-[-1px] relative z-10">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider rounded-t-lg border border-b-0 transition-all ${
                mode === m
                  ? 'bg-paper-50 dark:bg-midnight-800 border-paper-200 dark:border-midnight-600 text-gold-600 dark:text-gold-400'
                  : 'bg-paper-200/50 dark:bg-midnight-900/60 border-transparent text-paper-500 dark:text-midnight-400 hover:text-paper-800 dark:hover:text-paper-300'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="bg-paper-50 dark:bg-midnight-800 rounded-2xl rounded-tl-none border border-paper-200 dark:border-midnight-600 p-7 shadow-xl shadow-paper-300/30 dark:shadow-midnight-950/60">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Username</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={e => setLoginName(e.target.value)}
                  required
                  autoFocus
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              {error && (
                <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-900/8 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">{error}</div>
              )}
              <button type="submit" disabled={loading} className="font-sans bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Username <span className="normal-case tracking-normal font-normal text-paper-400 dark:text-midnight-400">(used to log in)</span></label>
                <input
                  type="text"
                  value={regLoginName}
                  onChange={e => setRegLoginName(e.target.value)}
                  required
                  autoFocus
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Display name</label>
                <input
                  type="text"
                  value={regUserName}
                  onChange={e => setRegUserName(e.target.value)}
                  required
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Email</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">
                  Password <span className="normal-case tracking-normal font-normal text-paper-400 dark:text-midnight-400">(min 12 chars)</span>
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  minLength={12}
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-paper-600 dark:text-midnight-300">Confirm password</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  required
                  className="font-sans bg-paper-100 dark:bg-midnight-700 text-paper-950 dark:text-paper-100 border border-paper-300 dark:border-midnight-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500/60 transition-all"
                />
              </div>
              {error && (
                <div className="font-sans text-sm text-rose-600 dark:text-rose-400 bg-rose-900/8 dark:bg-rose-950/40 border border-rose-600/20 dark:border-rose-900/50 rounded-lg px-3.5 py-2.5">{error}</div>
              )}
              <button type="submit" disabled={loading} className="font-sans bg-gold-500 hover:bg-gold-400 active:bg-gold-600 disabled:opacity-50 text-midnight-900 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1">
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
