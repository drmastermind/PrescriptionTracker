import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, useColorScheme, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { login, ApiError } from '../services/api'
import { dark, light, APP_VERSION } from '../constants/theme'

export default function LoginScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  const s = styles(c)

  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!loginName.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      await login(loginName.trim(), password)
      router.replace('/(tabs)/prescriptions')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Check your connection and credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.accent} />
          <Text style={s.title}>Prescription{'\n'}Tracker</Text>
          <Text style={s.subtitle}>Sign in to continue</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Login name</Text>
          <TextInput
            style={s.input}
            value={loginName}
            onChangeText={setLoginName}
            placeholder="your login name"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={c.primaryText} />
              : <Text style={s.btnText}>Sign in</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.settingsLink} onPress={() => router.push('/settings')}>
            <Text style={s.settingsText}>Server settings</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>v{APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32, alignItems: 'flex-start' },
  accent: {
    width: 40, height: 3, backgroundColor: c.gold,
    borderRadius: 2, marginBottom: 20,
  },
  title: {
    fontSize: 32, fontWeight: '700', color: c.text,
    lineHeight: 38, letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: c.textSub, marginTop: 6 },
  card: {
    backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.cardBorder,
    padding: 24,
  },
  label: {
    fontSize: 11, fontWeight: '600', color: c.textSub,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: c.surface, borderRadius: 10, borderWidth: 1,
    borderColor: c.cardBorder, color: c.text,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  errorBox: {
    backgroundColor: '#450a0a', borderRadius: 8,
    borderWidth: 1, borderColor: '#7f1d1d',
    padding: 12, marginTop: 16,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  btn: {
    backgroundColor: c.gold, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: c.primaryText, fontWeight: '700', fontSize: 15 },
  settingsLink: { alignItems: 'center', marginTop: 16, padding: 8 },
  settingsText: { color: c.textSub, fontSize: 13 },
  version: {
    textAlign: 'center', color: c.textMuted,
    fontSize: 11, marginTop: 24, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
})
