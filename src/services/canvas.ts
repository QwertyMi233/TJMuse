import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { canvasToken, fetchCanvasSnapshot } from '../core/canvas-api';
const TOKEN_KEY = 'tjmuse.canvas.personal-token.v1';
let webToken = '';
let writes: Promise<void> = Promise.resolve();
export const getCanvasToken = () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(TOKEN_KEY).then(value => value || '');
export async function saveCanvasToken(value: string) {
  const token = value ? canvasToken(value) : '';
  writes = writes.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') { webToken = token; return; }
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync('tjmuse.canvas.session').catch(() => {});
  });
  await writes;
}
export async function fetchCanvasAssignments(base: string) {
  const token = await getCanvasToken();
  if (!token) throw new Error('请填写 Canvas 个人访问令牌；网页刷新后需要重新填写。');
  return fetchCanvasSnapshot(base, token);
}
