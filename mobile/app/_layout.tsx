import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme, View, ActivityIndicator } from 'react-native'
import { getAccessToken } from '../services/storage'
import { getMe } from '../services/api'
import { dark, light } from '../constants/theme'

export default function RootLayout() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAccessToken()
        if (!token) { router.replace('/login'); return }
        await getMe()
        router.replace('/(tabs)/prescriptions')
      } catch {
        router.replace('/login')
      }
    }
    checkAuth()
  }, [])

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}
