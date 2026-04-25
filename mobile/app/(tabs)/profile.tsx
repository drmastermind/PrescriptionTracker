import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, useColorScheme, ActivityIndicator,
  Platform, Alert,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import {
  getMe, logout, changePassword, generateApiKey, revokeApiKey,
  type CurrentUser, ApiError,
} from '../../services/api'
import { dark, light, APP_VERSION } from '../../constants/theme'

function ChangePasswordModal({ onDone, onClose, c }: { onDone: () => void; onClose: () => void; c: typeof dark }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const s = modalStyles(c)

  async function handle() {
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next.length < 12) { setError('Password must be at least 12 characters.'); return }
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
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.title}>Change Password</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={s.body}>
          {done ? (
            <>
              <View style={s.successBox}><Text style={s.successText}>Password changed successfully.</Text></View>
              <TouchableOpacity style={s.btn} onPress={onDone}><Text style={s.btnText}>Done</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.label}>Current password</Text>
              <TextInput style={s.input} value={current} onChangeText={setCurrent} secureTextEntry placeholderTextColor={c.textMuted} placeholder="••••••••" />
              <Text style={[s.label, { marginTop: 16 }]}>New password <Text style={s.hint}>(min 12 chars)</Text></Text>
              <TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry placeholderTextColor={c.textMuted} placeholder="••••••••••••" />
              <Text style={[s.label, { marginTop: 16 }]}>Confirm new password</Text>
              <TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor={c.textMuted} placeholder="••••••••••••" />
              {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handle} disabled={loading}>
                {loading ? <ActivityIndicator color="#0a0a14" /> : <Text style={s.btnText}>Change password</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

export default function ProfileScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  const s = styles(c)

  const [me, setMe] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(null)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useFocusEffect(useCallback(() => {
    load()
  }, []))

  async function load() {
    try {
      const user = await getMe()
      setMe(user)
      setApiKeyPrefix(user.api_key_prefix ?? null)
    } catch {
      // auth expired — _layout handles redirect
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await logout()
    router.replace('/login')
  }

  async function handleGenerateApiKey() {
    if (!me) return
    setApiKeyLoading(true)
    try {
      const res = await generateApiKey(me.user_id)
      setApiKeyPrefix(res.prefix)
      setNewApiKey(res.api_key)
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to generate API key')
    } finally {
      setApiKeyLoading(false)
    }
  }

  async function handleRevokeApiKey() {
    if (!me) return
    Alert.alert('Revoke API Key', 'Are you sure you want to revoke your API key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          setApiKeyLoading(true)
          try {
            await revokeApiKey(me.user_id)
            setApiKeyPrefix(null)
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to revoke')
          } finally {
            setApiKeyLoading(false)
          }
        }
      },
    ])
  }

  if (loading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={c.gold} /></View>
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.screenTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* User info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.card}>
            <Row label="Display name" value={me?.user_name} c={c} />
            <Divider c={c} />
            <Row label="Login name" value={me?.login_name} mono c={c} />
            <Divider c={c} />
            <Row label="Email" value={me?.email} c={c} />
            <Divider c={c} />
            <View style={s.row}>
              <Text style={s.rowLabel}>Role</Text>
              <View style={[s.roleBadge, me?.role === 'admin' ? s.roleBadgeAdmin : s.roleBadgeNormal]}>
                <Text style={[s.roleBadgeText, me?.role === 'admin' ? s.roleBadgeAdminText : s.roleBadgeNormalText]}>
                  {me?.role}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Security</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.actionRow} onPress={() => setShowChangePassword(true)}>
              <Text style={s.actionLabel}>Change password</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Key */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>API Key</Text>
          <View style={s.card}>
            {apiKeyPrefix ? (
              <>
                <View style={s.row}>
                  <Text style={s.rowLabel}>Active key</Text>
                  <Text style={s.monoValue}>{apiKeyPrefix}...</Text>
                </View>
                <Divider c={c} />
              </>
            ) : (
              <View style={s.row}>
                <Text style={s.rowLabel}>No API key</Text>
              </View>
            )}
            <Divider c={c} />
            <TouchableOpacity style={s.actionRow} onPress={handleGenerateApiKey} disabled={apiKeyLoading}>
              <Text style={[s.actionLabel, s.actionTeal]}>
                {apiKeyLoading ? '...' : apiKeyPrefix ? 'Regenerate key' : 'Generate key'}
              </Text>
            </TouchableOpacity>
            {apiKeyPrefix && (
              <>
                <Divider c={c} />
                <TouchableOpacity style={s.actionRow} onPress={handleRevokeApiKey} disabled={apiKeyLoading}>
                  <Text style={[s.actionLabel, s.actionRose]}>Revoke key</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* New API key display */}
        {newApiKey && (
          <View style={s.section}>
            <View style={s.apiKeyBox}>
              <Text style={s.apiKeyTitle}>New API Key — copy it now</Text>
              <Text style={s.apiKeyValue}>{newApiKey}</Text>
              <TouchableOpacity style={s.apiKeyDismiss} onPress={() => setNewApiKey(null)}>
                <Text style={s.apiKeyDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Settings</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.actionRow} onPress={() => router.push('/settings')}>
              <Text style={s.actionLabel}>Server URL</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <View style={s.section}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
            {signingOut
              ? <ActivityIndicator color={c.rose} />
              : <Text style={s.signOutText}>Sign out</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.version}>v{APP_VERSION}</Text>
      </ScrollView>

      {showChangePassword && (
        <ChangePasswordModal
          onDone={() => setShowChangePassword(false)}
          onClose={() => setShowChangePassword(false)}
          c={c}
        />
      )}
    </View>
  )
}

function Row({ label, value, mono, c }: { label: string; value?: string; mono?: boolean; c: typeof dark }) {
  const s = styles(c)
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, mono && s.monoValue]}>{value ?? '—'}</Text>
    </View>
  )
}

function Divider({ c }: { c: typeof dark }) {
  return <View style={{ height: 1, backgroundColor: c.cardBorder, marginLeft: 0 }} />
}

const styles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
  },
  screenTitle: { fontSize: 22, fontWeight: '700', color: c.text },
  body: { padding: 20, gap: 4, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: c.card, borderRadius: 14,
    borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  rowLabel: { fontSize: 15, color: c.text },
  rowValue: { fontSize: 15, color: c.textSub },
  monoValue: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, color: c.textSub },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionLabel: { fontSize: 15, color: c.text },
  actionTeal: { color: c.teal },
  actionRose: { color: c.rose },
  chevron: { fontSize: 20, color: c.textMuted, lineHeight: 24 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  roleBadgeAdmin: { backgroundColor: 'rgba(217,119,6,0.12)', borderColor: 'rgba(217,119,6,0.3)' },
  roleBadgeNormal: { backgroundColor: c.surface, borderColor: c.cardBorder },
  roleBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleBadgeAdminText: { color: c.gold },
  roleBadgeNormalText: { color: c.textMuted },
  apiKeyBox: {
    backgroundColor: 'rgba(20,184,166,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)', padding: 16,
  },
  apiKeyTitle: { fontSize: 12, fontWeight: '700', color: c.teal, marginBottom: 10 },
  apiKeyValue: {
    fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: c.text, lineHeight: 18,
  },
  apiKeyDismiss: { marginTop: 12, alignItems: 'center' },
  apiKeyDismissText: { color: c.textSub, fontSize: 13 },
  signOutBtn: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1,
    borderColor: c.cardBorder, padding: 16, alignItems: 'center',
  },
  signOutText: { color: c.rose, fontSize: 16, fontWeight: '600' },
  version: {
    textAlign: 'center', color: c.textMuted, fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
  },
})

const modalStyles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 24,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.card,
  },
  cancel: { color: c.textSub, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '600', color: c.text },
  body: { padding: 24 },
  label: { fontSize: 11, fontWeight: '600', color: c.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  hint: { fontSize: 10, color: c.textMuted, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input: {
    backgroundColor: c.surface, borderRadius: 10, borderWidth: 1,
    borderColor: c.cardBorder, color: c.text,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  errorBox: { backgroundColor: '#450a0a', borderRadius: 8, borderWidth: 1, borderColor: '#7f1d1d', padding: 12, marginTop: 16 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)', padding: 12 },
  successText: { color: c.teal, fontSize: 14 },
  btn: { backgroundColor: c.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0a0a14', fontWeight: '700', fontSize: 15 },
})
