import { useState, useEffect } from 'react'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import { getMe, type CurrentUser, setAccessToken } from './api'

type AppState = 'login' | 'loading' | 'dashboard'

export default function App() {
  const [state, setState] = useState<AppState>('login')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

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
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Dashboard
      currentUser={currentUser}
      onLogout={handleLogout}
      darkMode={darkMode}
      onToggleDark={() => setDarkMode(d => !d)}
    />
  )
}
