import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_ACCESS = 'rx_access_token'
const KEY_REFRESH = 'rx_refresh_token'
const KEY_BASE_URL = 'rx_base_url'

export const DEFAULT_BASE_URL = 'http://10.0.0.67:42069'

export async function getBaseUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(KEY_BASE_URL)
  return url ?? DEFAULT_BASE_URL
}

export async function setBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEY_BASE_URL, url.replace(/\/+$/, ''))
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS)
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH)
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
  ])
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ])
}
