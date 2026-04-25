import { getBaseUrl, getAccessToken, getRefreshToken, saveTokens, clearTokens } from './storage'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function doRefresh(): Promise<boolean> {
  const refresh = await getRefreshToken()
  if (!refresh) return false
  const base = await getBaseUrl()
  try {
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'X-Refresh-Token': refresh },
    })
    if (!res.ok) { await clearTokens(); return false }
    const data = await res.json()
    await saveTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const base = await getBaseUrl()
  const access = await getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (access) headers['Authorization'] = `Bearer ${access}`

  const res = await fetch(`${base}/api/v1${path}`, { ...options, headers })

  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    const ok = await doRefresh()
    if (ok) return request(path, options, false)
    await clearTokens()
    throw new ApiError(401, 'AUTH_EXPIRED', 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = body?.error ?? {}
    const detail = err.details?.[0]
    const msg = detail
      ? `${detail.field ? detail.field + ': ' : ''}${detail.issue}`
      : (err.message ?? `HTTP ${res.status}`)
    throw new ApiError(res.status, err.code ?? 'ERROR', msg)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(login_name: string, password: string): Promise<void> {
  const base = await getBaseUrl()
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_name, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  await saveTokens(data.access_token, data.refresh_token)
}

export async function logout(): Promise<void> {
  const refresh = await getRefreshToken()
  const headers: Record<string, string> = {}
  if (refresh) headers['X-Refresh-Token'] = refresh
  await request('/auth/logout', { method: 'POST', headers }).catch(() => {})
  await clearTokens()
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurrentUser {
  user_id: number
  login_name: string
  user_name: string
  email: string
  role: string
  api_key_prefix?: string | null
}

export interface MedicationLookup {
  medication_id: number
  medication_name: string
  generic_name?: string
  strength?: string
  form?: string
  brand_name?: string
}

export interface Prescription {
  prescription_id: number
  user_id: number
  medication_id: number
  medication: { medication_id: number; medication_name: string; generic_name?: string }
  dosage?: string
  frequency?: string
  doctor?: string
  is_active: boolean
  prescribed_date?: string
  start_date?: string
  end_date?: string
  quantity?: number
  refills_remaining?: number
  route?: string
  reason?: string
  pharmacy?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface UserLookup {
  user_id: number
  user_name: string
  login_name: string
}

export interface ApiKeyResponse {
  api_key: string
  prefix: string
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function getMe(): Promise<CurrentUser> {
  return request('/auth/me')
}

export async function lookupUsers(): Promise<UserLookup[]> {
  return request('/lookups/users')
}

export async function lookupMedications(): Promise<MedicationLookup[]> {
  return request('/lookups/medications')
}

export async function getUserPrescriptions(
  userId: number,
  active?: boolean,
): Promise<{ items: Prescription[] }> {
  const params = new URLSearchParams({ page: '1', size: '100' })
  if (active !== undefined) params.set('active', String(active))
  return request(`/users/${userId}/prescriptions?${params}`)
}

export async function updatePrescription(
  id: number,
  data: Partial<Pick<Prescription, 'dosage' | 'frequency' | 'doctor' | 'route' | 'pharmacy' | 'notes' | 'is_active' | 'reason' | 'prescribed_date' | 'start_date' | 'end_date' | 'quantity' | 'refills_remaining'>>,
): Promise<Prescription> {
  return request(`/prescriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function updateMedication(
  id: number,
  data: Partial<Pick<MedicationLookup, 'medication_name' | 'generic_name' | 'strength' | 'form' | 'brand_name'>>,
): Promise<MedicationLookup> {
  return request(`/medications/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function generateApiKey(userId: number): Promise<ApiKeyResponse> {
  return request(`/users/${userId}/api-key`, { method: 'POST' })
}

export async function revokeApiKey(userId: number): Promise<void> {
  return request(`/users/${userId}/api-key`, { method: 'DELETE' })
}
