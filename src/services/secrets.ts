import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Provider } from '../core/types';
const memory: Partial<Record<Provider, string>> = {};
export async function getApiKey(provider: Provider) {
  return Platform.OS === 'web' ? memory[provider] || '' : (await SecureStore.getItemAsync(`tjmuse.key.${provider}`)) || '';
}
export async function saveApiKey(provider: Provider, value: string) {
  if (Platform.OS === 'web') { memory[provider] = value; return; }
  if (value) await SecureStore.setItemAsync(`tjmuse.key.${provider}`, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(`tjmuse.key.${provider}`);
}
