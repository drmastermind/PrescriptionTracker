import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, useColorScheme, ActivityIndicator,
  Platform, TextInput, Switch, Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import {
  getMe, lookupUsers, getUserPrescriptions, updatePrescription,
  type CurrentUser, type UserLookup, type Prescription, ApiError,
} from '../../services/api'
import { dark, light } from '../../constants/theme'

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  p, onClose, onSaved, c,
}: { p: Prescription; onClose: () => void; onSaved: (updated: Prescription) => void; c: typeof dark }) {
  const [dosage, setDosage] = useState(p.dosage ?? '')
  const [frequency, setFrequency] = useState(p.frequency ?? '')
  const [doctor, setDoctor] = useState(p.doctor ?? '')
  const [route, setRoute] = useState(p.route ?? '')
  const [pharmacy, setPharmacy] = useState(p.pharmacy ?? '')
  const [reason, setReason] = useState(p.reason ?? '')
  const [notes, setNotes] = useState(p.notes ?? '')
  const [isActive, setIsActive] = useState(p.is_active)
  const [saving, setSaving] = useState(false)
  const s = editStyles(c)

  async function save() {
    setSaving(true)
    try {
      const updated = await updatePrescription(p.prescription_id, {
        dosage: dosage.trim() || undefined,
        frequency: frequency.trim() || undefined,
        doctor: doctor.trim() || undefined,
        route: route.trim() || undefined,
        pharmacy: pharmacy.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: isActive,
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
          <Text style={s.title} numberOfLines={1}>{p.medication.medication_name}</Text>
          <TouchableOpacity onPress={save} style={s.saveBtn} disabled={saving}>
            {saving ? <ActivityIndicator color={c.gold} size="small" /> : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Field label="Dosage" value={dosage} onChange={setDosage} c={c} placeholder="e.g. 500 mg" />
          <Field label="Frequency" value={frequency} onChange={setFrequency} c={c} placeholder="e.g. Twice daily" />
          <Field label="Doctor" value={doctor} onChange={setDoctor} c={c} placeholder="Prescribing doctor" />
          <Field label="Route" value={route} onChange={setRoute} c={c} placeholder="e.g. oral" />
          <Field label="Pharmacy" value={pharmacy} onChange={setPharmacy} c={c} placeholder="Pharmacy name" />
          <Field label="Reason" value={reason} onChange={setReason} c={c} placeholder="Indication" />
          <Field label="Notes" value={notes} onChange={setNotes} c={c} placeholder="Additional notes" multiline />

          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: c.cardBorder, true: c.teal }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function Field({
  label, value, onChange, c, placeholder, multiline,
}: { label: string; value: string; onChange: (v: string) => void; c: typeof dark; placeholder?: string; multiline?: boolean }) {
  const s = editStyles(c)
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({
  p, onClose, onEdit, c,
}: { p: Prescription; onClose: () => void; onEdit: () => void; c: typeof dark }) {
  const s = detailStyles(c)
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{p.medication.medication_name}</Text>
            {p.medication.generic_name && <Text style={s.sub}>{p.medication.generic_name}</Text>}
          </View>
          <TouchableOpacity onPress={onEdit} style={s.editBtn}>
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <View style={s.badgeRow}>
            <View style={[s.badge, p.is_active ? s.badgeActive : s.badgeInactive]}>
              <Text style={[s.badgeText, p.is_active ? s.badgeActiveText : s.badgeInactiveText]}>
                {p.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={s.grid}>
            {p.dosage && <FieldCell label="Dosage" value={p.dosage} c={c} />}
            {p.frequency && <FieldCell label="Frequency" value={p.frequency} c={c} />}
            {p.doctor && <FieldCell label="Doctor" value={p.doctor} c={c} />}
            {p.route && <FieldCell label="Route" value={p.route} c={c} />}
            {p.prescribed_date && <FieldCell label="Prescribed" value={p.prescribed_date} c={c} />}
            {p.start_date && <FieldCell label="Start date" value={p.start_date} c={c} />}
            {p.end_date && <FieldCell label="End date" value={p.end_date} c={c} />}
            {p.quantity != null && <FieldCell label="Quantity" value={String(p.quantity)} c={c} />}
            {p.refills_remaining != null && <FieldCell label="Refills" value={String(p.refills_remaining)} c={c} />}
            {p.pharmacy && <FieldCell label="Pharmacy" value={p.pharmacy} c={c} />}
          </View>

          {p.reason && (
            <View style={s.fullField}>
              <Text style={s.fieldLabel}>Reason</Text>
              <Text style={s.fieldValue}>{p.reason}</Text>
            </View>
          )}
          {p.notes && (
            <View style={s.fullField}>
              <Text style={s.fieldLabel}>Notes</Text>
              <Text style={s.fieldValue}>{p.notes}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function FieldCell({ label, value, c }: { label: string; value: string; c: typeof dark }) {
  return (
    <View style={{ width: '50%', paddingVertical: 10, paddingRight: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: c.text }}>{value}</Text>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PrescriptionsScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  const s = styles(c)

  const [me, setMe] = useState<CurrentUser | null>(null)
  const [users, setUsers] = useState<UserLookup[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [showActive, setShowActive] = useState<boolean | undefined>(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Prescription | null>(null)
  const [editing, setEditing] = useState<Prescription | null>(null)

  useFocusEffect(useCallback(() => { init() }, []))

  async function init() {
    try {
      const user = await getMe()
      setMe(user)
      if (user.role === 'admin') {
        const all = await lookupUsers()
        setUsers(all)
        setSelectedUserId(all[0]?.user_id ?? user.user_id)
      } else {
        setSelectedUserId(user.user_id)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUserId !== null) fetchPrescriptions()
  }, [selectedUserId, showActive])

  async function fetchPrescriptions(isRefresh = false) {
    if (selectedUserId === null) return
    if (isRefresh) setRefreshing(true)
    setError('')
    try {
      const data = await getUserPrescriptions(selectedUserId, showActive)
      const sorted = [...data.items].sort((a, b) =>
        a.medication.medication_name.localeCompare(b.medication.medication_name)
      )
      setPrescriptions(sorted)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load prescriptions')
    } finally {
      setRefreshing(false)
    }
  }

  function handleSaved(updated: Prescription) {
    setPrescriptions(prev => prev.map(p => p.prescription_id === updated.prescription_id ? updated : p))
    setEditing(null)
    setDetail(updated)
  }

  if (loading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={c.gold} /></View>
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.screenTitle}>Prescriptions</Text>
      </View>

      <View style={s.filterRow}>
        {me?.role === 'admin' && users.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.userScroll}>
            {users.map(u => (
              <TouchableOpacity
                key={u.user_id}
                onPress={() => setSelectedUserId(u.user_id)}
                style={[s.chip, selectedUserId === u.user_id && s.chipActive]}
              >
                <Text style={[s.chipText, selectedUserId === u.user_id && s.chipActiveText]}>
                  {u.user_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={s.statusChips}>
          {(['Active', 'Inactive', 'All'] as const).map(label => {
            const val = label === 'All' ? undefined : label === 'Active'
            const active = showActive === val
            return (
              <TouchableOpacity key={label} onPress={() => setShowActive(val)} style={[s.chip, active && s.chipActive]}>
                <Text style={[s.chipText, active && s.chipActiveText]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPrescriptions(true)} tintColor={c.gold} />}
      >
        {error ? (
          <Text style={s.error}>{error}</Text>
        ) : prescriptions.length === 0 ? (
          <Text style={s.empty}>No prescriptions found.</Text>
        ) : (
          prescriptions.map(p => (
            <TouchableOpacity key={p.prescription_id} style={s.card} onPress={() => setDetail(p)} activeOpacity={0.7}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.medName}>{p.medication.medication_name}</Text>
                  {p.medication.generic_name && <Text style={s.medGeneric}>{p.medication.generic_name}</Text>}
                </View>
                <View style={[s.statusBadge, p.is_active ? s.badgeActive : s.badgeInactive]}>
                  <Text style={[s.statusText, p.is_active ? s.badgeActiveText : s.badgeInactiveText]}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={s.pillRow}>
                {p.dosage && <View style={s.pillGold}><Text style={s.pillGoldText}>{p.dosage}</Text></View>}
                {p.frequency && <View style={s.pill}><Text style={s.pillText}>{p.frequency}</Text></View>}
              </View>

              {p.doctor && <Text style={s.doctor}>{p.doctor}</Text>}

              <View style={s.cardFooter}>
                <Text style={s.detailsLink}>Tap for details  •  Edit</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {detail && !editing && (
        <DetailModal
          p={detail}
          onClose={() => setDetail(null)}
          onEdit={() => setEditing(detail)}
          c={c}
        />
      )}
      {editing && (
        <EditModal
          p={editing}
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
  },
  screenTitle: { fontSize: 22, fontWeight: '700', color: c.text },
  filterRow: { backgroundColor: c.card, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
  userScroll: { paddingHorizontal: 16, paddingTop: 10 },
  statusChips: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder, marginRight: 8,
  },
  chipActive: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { fontSize: 12, color: c.textSub, fontWeight: '600' },
  chipActiveText: { color: '#0a0a14' },
  list: { padding: 16, gap: 12 },
  error: { color: c.rose, textAlign: 'center', marginTop: 40, fontSize: 14 },
  empty: { color: c.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },
  card: {
    backgroundColor: c.card, borderRadius: 14,
    borderWidth: 1, borderColor: c.cardBorder, padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  medName: { fontSize: 16, fontWeight: '600', color: c.text },
  medGeneric: { fontSize: 12, color: c.textSub, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeActive: { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: 'rgba(20,184,166,0.3)' },
  badgeInactive: { backgroundColor: c.surface, borderColor: c.cardBorder },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeActiveText: { color: '#2dd4bf' },
  badgeInactiveText: { color: c.textMuted },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pillGold: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(217,119,6,0.12)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
  },
  pillGoldText: { fontSize: 11, color: c.gold, fontWeight: '600' },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder,
  },
  pillText: { fontSize: 11, color: c.textSub },
  doctor: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  cardFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
  detailsLink: { fontSize: 12, color: c.textSub },
})

const detailStyles = (c: typeof dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 24,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    backgroundColor: c.card,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.textSub, marginTop: 3 },
  editBtn: { paddingLeft: 12, paddingTop: 2 },
  editText: { color: c.gold, fontSize: 16, fontWeight: '600' },
  closeBtn: { paddingLeft: 16, paddingTop: 2 },
  closeText: { color: c.textSub, fontSize: 16 },
  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeActive: { backgroundColor: 'rgba(20,184,166,0.12)', borderColor: 'rgba(20,184,166,0.3)' },
  badgeInactive: { backgroundColor: c.surface, borderColor: c.cardBorder },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeActiveText: { color: '#2dd4bf' },
  badgeInactiveText: { color: c.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  fullField: { marginTop: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  fieldValue: { fontSize: 14, color: c.text, lineHeight: 20 },
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
  inputMulti: { height: 80, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toggleLabel: { fontSize: 15, color: c.text, fontWeight: '500' },
})
