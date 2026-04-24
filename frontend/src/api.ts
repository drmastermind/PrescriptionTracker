const BASE = '/api/v1'

let accessToken: string | null = null
let refreshToken: string | null = null
let onAuthExpired: (() => void) | null = null

export function setAccessToken(token: string | null) { accessToken = token }
export function setRefreshToken(token: string | null) { refreshToken = token }
export function setOnAuthExpired(cb: () => void) { onAuthExpired = cb }
export function getAccessToken() { return accessToken }

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'X-Refresh-Token': refreshToken },
  })
  if (!res.ok) {
    accessToken = null
    refreshToken = null
    return false
  }
  const data = await res.json()
  accessToken = data.access_token
  refreshToken = data.refresh_token
  return true
}

async function request<T>(path: string, options: RequestInit = {}, _retry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401 && _retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    const refreshed = await doRefresh()
    if (refreshed) return request(path, options, false)
    if (onAuthExpired) onAuthExpired()
    throw new ApiError(401, 'AUTH_EXPIRED', 'Session expired')
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

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Auth
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export async function login(login_name: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_name, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function logout(): Promise<void> {
  const headers: Record<string, string> = {}
  if (refreshToken) headers['X-Refresh-Token'] = refreshToken
  await request('/auth/logout', { method: 'POST', headers }).catch(() => {})
  setAccessToken(null)
  setRefreshToken(null)
}

export interface RegisterData {
  login_name: string
  user_name: string
  email: string
  password: string
}

export async function register(data: RegisterData): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = body?.error ?? body ?? {}
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export interface CurrentUser {
  user_id: number
  login_name: string
  user_name: string
  email: string
  role: string
}

export async function getMe(): Promise<CurrentUser> {
  return request('/auth/me')
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

export async function adminResetPassword(userId: number, new_password: string): Promise<void> {
  return request(`/auth/admin-reset-password/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ new_password }),
  })
}

// Users (admin)
export interface User {
  user_id: number
  user_name: string
  login_name: string
  email: string
  email_verified: boolean
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedUsers {
  items: User[]
  total: number
  page: number
  size: number
  pages: number
}

export async function listUsers(page = 1, size = 50): Promise<PaginatedUsers> {
  return request(`/users?page=${page}&size=${size}`)
}

export async function updateUser(userId: number, data: Partial<{ user_name: string; email: string; login_name: string; role: string; is_active: boolean }>): Promise<User> {
  return request(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Lookups
export interface UserLookup {
  user_id: number
  user_name: string
  login_name: string
}

export interface MedicationLookup {
  medication_id: number
  medication_name: string
  generic_name?: string
  strength?: string
  form?: string
}

export async function lookupUsers(): Promise<UserLookup[]> {
  return request('/lookups/users')
}

export async function lookupMedications(): Promise<MedicationLookup[]> {
  return request('/lookups/medications')
}

export async function createMedication(data: { medication_name: string; generic_name?: string; strength?: string; form?: string; brand_name?: string }): Promise<MedicationLookup> {
  return request('/medications', { method: 'POST', body: JSON.stringify(data) })
}

// Prescriptions
export interface Prescription {
  prescription_id: number
  user_id: number
  medication_id: number
  medication: { medication_id: number; medication_name: string }
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

export interface PrescriptionCreate {
  medication_id: number
  dosage?: string
  frequency?: string
  doctor?: string
}

export interface PaginatedPrescriptions {
  items: Prescription[]
  total: number
  page: number
  size: number
  pages: number
}

export async function getUserPrescriptions(
  userId: number,
  page = 1,
  size = 50,
  active?: boolean,
): Promise<PaginatedPrescriptions> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (active !== undefined) params.set('active', String(active))
  return request(`/users/${userId}/prescriptions?${params}`)
}

export async function createPrescription(userId: number, data: PrescriptionCreate): Promise<Prescription> {
  return request('/prescriptions', {
    method: 'POST',
    body: JSON.stringify({ ...data, user_id: userId }),
  })
}

export async function updatePrescription(
  prescriptionId: number,
  data: Partial<{ medication_id: number; dosage: string; frequency: string; doctor: string; is_active: boolean }>,
): Promise<Prescription> {
  return request(`/prescriptions/${prescriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deletePrescription(prescriptionId: number): Promise<void> {
  return request(`/prescriptions/${prescriptionId}`, { method: 'DELETE' })
}
