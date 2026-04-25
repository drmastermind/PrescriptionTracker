import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, useColorScheme, ActivityIndicator,
  Platform, TextInput, Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getMe, lookupMedications, updateMedication, type MedicationLookup, type CurrentUser, ApiError } from '../../services/api'
import { dark, light } from '../../constants/theme'

// ── Edit modal (admin only) ───────────────────────────────────────────────────

function EditModal({
  m, onClose, onSaved, c,
}: { m: MedicationLookup; onClose: () => void; onSaved: (updated: MedicationLookup) => void; c: typeof dark }) {
  const [name, setName] = useState(m.medication_name)
  const [generic, setGeneric] = useState(m.generic_name ?? '')
  const [strength, setStrength] = useState(m.strength ?? '')
  const [form, setForm] = useState(m.form ?? '')
  const [brand, setBrand] = useState(m.brand_name ?? '')
  const [saving, setSaving] = useState(false)
  const s = editStyles(c)

  async function save() {
    if (!name.trim()) { Alert.alert('Error', 'Medication name is required'); return }
    setSaving(true)
    try {
      const updated = await updateMedication(m.medication_id, {
        medication_name: name.trim(),
        generic_name: generic.trim() || undefined,
        strength: strength.trim() || undefined,
        form: form.trim() || undefined,
        brand_name: brand.trim() || undefined,
      })
      onSaved(updated)
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>Edit Medicine</Text>
          <TouchableOpacity onPress={save} style={s.saveBtn} disabled={saving}>
            {saving ? <ActivityIndicator color={c.gold} size="small" /> : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Field label="Medication name *" value={name} onChange={setName} c={c} placeholder="Required" />
          <Field label="Generic name" value={generic} onChange={setGeneric} c={c} placeholder="Optional" />
          <Field label="Brand name" value={brand} onChange={setBrand} c={c} placeholder="Optional" />
          <Field label="Strength" value={strength} onChange={setStrength} c={c} placeholder="e.g. 500 mg" />
          <Field label="Form" value={form} onChange={setForm} c={c} placeholder="e.g. tablet, capsule" />
        </ScrollView>
      </View>
    </Modal>
  )
}

function Field({
  label, value, onChange, c, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; c: typeof dark; placeholder?: string }) {
  const s = editStyles(c)
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
      />
    </View>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({
  m, isAdmin, onClose, onEdit, c,
}: { m: MedicationLookup; isAdmin: boolean; onClose: () => void; onEdit: () => void; c: typeof dark }) {
  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'flex-start',
      padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 24,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.card,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text, flex: 1 },
    sub: { fontSize: 13, color: c.textSub, marginTop: 3 },
    editBtn: { paddingLeft: 12, paddingTop: 2 },
    editText: { color: c.gold, fontSize: 16, fontWeight: '600' },
    closeBtn: { paddingLeft: 16, paddingTop: 2 },
    closeText: { color: c.textSub, fontSize: 16 },
    body: { padding: 20, gap: 16 },
    row: { gap: 4 },
    label: { fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    value: { fontSize: 15, color: c.text },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    pill: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder,
    },
    pillText: { fontSize: 12, color: c.textSub, fontWeight: '600' },
    empty: { color: c.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  })

  const hasDetails = m.generic_name || m.strength || m.form || m.brand_name

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{m.medication_name}</Text>
            {m.generic_name && <Text style={s.sub}>{m.generic_name}</Text>}
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={onEdit} style={s.editBtn}>
              <Text style={s.editText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.body}>
          {!hasDetails ? (
            <Text style={s.empty}>No additional details on file.</Text>
          ) : (
            <>
              {m.brand_name && (
                <View style={s.row}>
                  <Text style={s.label}>Brand name</Text>
                  <Text style={s.value}>{m.brand_name}</Text>
                </View>
              )}
              {m.generic_name && (
                <View style={s.row}>
                  <Text style={s.label}>Generic name</Text>
                  <Text style={s.value}>{m.generic_name}</Text>
                </View>
              )}
              <View style={s.pillRow}>
                {m.strength && <View style={s.pill}><Text style={s.pillText}>{m.strength}</Text></View>}
                {m.form && <View style={s.pill}><Text style={s.pillText}>{m.form}</Text></View>}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  const s = styles(c)

  const [me, setMe] = useState<CurrentUser | null>(null)
  const [medications, setMedications] = useState<MedicationLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<MedicationLookup | null>(null)
  const [editing, setEditing] = useState<MedicationLookup | null>(null)

  useFocusEffect(useCallback(() => { load() }, []))

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    setError('')
    try {
      const [user, meds] = await Promise.all([getMe(), lookupMedications()])
      setMe(user)
      setMedications(meds)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load medications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleSaved(updated: MedicationLookup) {
    setMedications(prev => prev.map(m => m.medication_id === updated.medication_id ? updated : m))
    setEditing(null)
    setDetail(updated)
  }

  const isAdmin = me?.role === 'admin'

  if (loading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={c.gold} /></View>
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.screenTitle}>Medicines</Text>
        <Text style={s.count}>{medications.length} total</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.gold} />}
      >
        {error ? (
          <Text style={s.error}>{error}</Text>
        ) : medications.length === 0 ? (
          <Text style={s.empty}>No medications found.</Text>
        ) : (
          medications.map(m => (
            <TouchableOpacity key={m.medication_id} style={s.card} onPress={() => setDetail(m)} activeOpacity={0.7}>
              <View style={s.cardBody}>
                <View style={{ flex: 1 }}>
                  <Text style={s.medName}>{m.medication_name}</Text>
                  {m.generic_name && <Text style={s.medGeneric}>{m.generic_name}</Text>}
                  {m.brand_name && <Text style={s.medBrand}>{m.brand_name}</Text>}
                </View>
                <View style={s.pillCol}>
                  {m.strength && <View style={s.pill}><Text style={s.pillText}>{m.strength}</Text></View>}
                  {m.form && <View style={s.pill}><Text style={s.pillText}>{m.form}</Text></View>}
                </View>
              </View>
              <View style={s.cardFooter}>
                <Text style={s.detailsLink}>Tap for details{isAdmin ? '  •  Edit' : ''}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {detail && !editing && (
        <DetailModal
          m={detail}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
          onEdit={() => setEditing(detail)}
          c={c}
        />
      )}
      {editing && (
        <EditModal
          m={editing}
          onClose={() => { setEditing(null); setDetail(editing) }}
          onSaved={handleSaved}
          c={c}
        />
      )}
    </View>
  )
}

const styles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  screenTitle: { fontSize: 22, fontWeight: '700', color: c.text },
  count: { fontSize: 12, color: c.textMuted },
  list: { padding: 16, gap: 10 },
  error: { color: c.rose, textAlign: 'center', marginTop: 40, fontSize: 14 },
  empty: { color: c.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },
  card: {
    backgroundColor: c.card, borderRadius: 14,
    borderWidth: 1, borderColor: c.cardBorder, padding: 16,
  },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  medName: { fontSize: 15, fontWeight: '600', color: c.text },
  medGeneric: { fontSize: 12, color: c.textSub, marginTop: 2 },
  medBrand: { fontSize: 12, color: c.textMuted, marginTop: 1, fontStyle: 'italic' },
  pillCol: { gap: 6, alignItems: 'flex-end' },
  pill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder,
  },
  pillText: { fontSize: 11, color: c.textSub, fontWeight: '600' },
  cardFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
  detailsLink: { fontSize: 12, color: c.textSub },
})

const editStyles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.card,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text, textAlign: 'center', marginHorizontal: 8 },
  cancelBtn: { minWidth: 60 },
  cancelText: { color: c.textSub, fontSize: 16 },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { color: c.gold, fontSize: 16, fontWeight: '700' },
  body: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: c.textSub, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder,
    color: c.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
  },
})
