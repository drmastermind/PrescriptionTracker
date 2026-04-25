import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, useColorScheme, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from '../services/storage'
import { dark, light } from '../constants/theme'

export default function SettingsScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  const s = styles(c)

  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBaseUrl().then(setUrl)
  }, [])

  async function handleSave() {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://')
      return
    }
    setSaving(true)
    await setBaseUrl(trimmed)
    setSaving(false)
    router.back()
  }

  function handleReset() {
    setUrl(DEFAULT_BASE_URL)
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={s.closeText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Server Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.label}>Backend API URL</Text>
          <TextInput
            style={s.input}
            value={url}
            onChangeText={setUrl}
            placeholder={DEFAULT_BASE_URL}
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Text style={s.hint}>
            The base URL of your Prescription Tracker backend.{'\n'}
            Example: {DEFAULT_BASE_URL}
          </Text>

          <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
            <Text style={s.resetText}>Reset to default</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={s.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.card,
  },
  closeBtn: { width: 60 },
  closeText: { color: c.textSub, fontSize: 15 },
  title: { fontSize: 17, fontWeight: '600', color: c.text },
  body: { flex: 1, padding: 24 },
  card: {
    backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.cardBorder, padding: 20,
  },
  label: {
    fontSize: 11, fontWeight: '600', color: c.textSub,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: c.surface, borderRadius: 10, borderWidth: 1,
    borderColor: c.cardBorder, color: c.text,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  hint: { color: c.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  resetBtn: { marginTop: 14, padding: 4 },
  resetText: { color: c.textSub, fontSize: 13 },
  btn: {
    backgroundColor: c.gold, borderRadius: 12,
    padding: 15, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0a0a14', fontWeight: '700', fontSize: 15 },
})
