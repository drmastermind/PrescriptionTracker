const BASE = '/api/v1'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message ?? `HTTP ${res.status}`
    throw new ApiError(res.status, body?.error?.code ?? 'ERROR', msg)
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
  token_type: string
  expires_in: number
}

export async function login(login_name: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: login_name, password })
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' }).catch(() => {})
  setAccessToken(null)
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

// Prescriptions
export interface Prescription {
  prescription_id: number
  user_id: number
  medication_id: number
  medication_name: string
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
  prescribed_date?: string
  start_date?: string
  end_date?: string
  quantity?: number
  refills_remaining?: number
  route?: string
  reason?: string
  pharmacy?: string
  notes?: string
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

export async function deletePrescription(prescriptionId: number): Promise<void> {
  return request(`/prescriptions/${prescriptionId}`, { method: 'DELETE' })
}
