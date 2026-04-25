import { useState, useEffect } from 'react'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import { getMe, type CurrentUser, setAccessToken, setRefreshToken, setOnAuthExpired } from './api'

const APP_VERSION = '4.1.0'

type AppState = 'login' | 'loading' | 'dashboard'

export default function App() {
  const [state, setState] = useState<AppState>('login')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    setOnAuthExpired(() => handleLogout)
  }, [])

  async function handleLogin() {
    setState('loading')
    try {
      const user = await getMe()
      setCurrentUser(user)
      setState('dashboard')
    } catch {
      setState('login')
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setState('login')
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-paper-50 dark:bg-midnight-900 flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest uppercase text-paper-400 dark:text-midnight-400">Loading...</span>
      </div>
    )
  }

  if (state === 'login' || !currentUser) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <VersionBadge />
      </>
    )
  }

  return (
    <>
      <Dashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserUpdated={setCurrentUser}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />
      <VersionBadge />
    </>
  )
}

function VersionBadge() {
  return (
    <div className="fixed bottom-3 right-3 font-mono text-[0.58rem] text-paper-400 dark:text-midnight-500 bg-paper-100/80 dark:bg-midnight-800/80 backdrop-blur-sm border border-paper-200 dark:border-midnight-700 rounded-md px-2 py-1 z-10 select-none">
      v{APP_VERSION}
    </div>
  )
}
