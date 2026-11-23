import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getCanvasToken, saveCanvasToken } from './canvas';
import { runOfficialSession, WebSessionError, type CanvasCandidate, type CanvasTokenOption } from './web-session';
import { haokeSecret, readHaokeCredentials, renewHaokeCredentials, verifyHaokeAccount, withHaokeLoginRecovery, HaokeError, type HaokeCredentials } from '../core/haoke-api';
import {haokeStudentLogin} from './haoke-credentials';
import {haokeNativeLogin} from './native-auto-login';
import {completeReservedLogin} from '../core/tongji-login';
import type { CanvasRenewal } from '../core/types';
import { canvasRenewalDue } from '../core/canvas-renewal';
export { canvasRenewalDue } from '../core/canvas-renewal';

const memory = new Map<string, string>();
let writes: Promise<void> = Promise.resolve();
const read = (key: string) => Platform.OS === 'web' ? Promise.resolve(memory.get(key) || null) : SecureStore.getItemAsync(key);
async function save(key: string, value: unknown) {
  writes = writes.catch(() => {}).then(async () => {
    const encoded = value === null ? null : JSON.stringify(value);
    if (Platform.OS === 'web') { if (encoded) memory.set(key, encoded); else memory.delete(key); }
    else if (encoded) await SecureStore.setItemAsync(key, encoded, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(key);
  });
  await writes;
}
const CANVAS_PENDING = 'tjmuse.canvas.rotation.pending.v1', HAOKE_ACTIVE = 'tjmuse.haoke.credentials.v1', HAOKE_PENDING = 'tjmuse.haoke.pending.v1';
export async function listCanvasSessionTokens(signal?:AbortSignal): Promise<CanvasTokenOption[]> {
  let presented=false,closed=false,notifyClosed!:()=>void;
  const dismissed=new Promise<void>(resolve=>notifyClosed=resolve);
  let result:Awaited<ReturnType<typeof runOfficialSession>>;
  try{result=await runOfficialSession({kind:'canvas-list',signal,onPresented:()=>{presented=true;},onDismissed:()=>{closed=true;notifyClosed();}});}
  finally{
    // Cancellation can reject the queue promise before the native modal exits.
    if(presented&&!closed){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([dismissed,new Promise<void>(resolve=>{timer=setTimeout(resolve,4000);})]);}finally{clearTimeout(timer);}}
  }
  if (!/^\d+$/.test(result.accountId || '') || !Array.isArray(result.tokens) || result.tokens.length > 50) throw new WebSessionError('invalid_list');
  return result.tokens.map(token => {
    if (!/^\d+$/.test(String(token.id)) || typeof token.purpose !== 'string' || !token.purpose.trim() || token.purpose.length > 200) throw new WebSessionError('invalid_list');
    return { id: String(token.id), purpose: token.purpose, accountId: result.accountId! };
  });
}
export async function prepareCanvasRenewal(config: CanvasRenewal, force = false) {
  const raw = await read(CANVAS_PENDING), pending: CanvasCandidate | null = raw ? JSON.parse(raw) : null;
  const matches = (value: CanvasCandidate) => value.accountId === config.accountId && value.tokenId === config.tokenId && value.purpose === config.purpose;
  if (pending?.quarantined && matches(pending)) throw new WebSessionError('rotation_identity_or_scope_changed');
  const recovering = !!pending && matches(pending);
  const currentToken = recovering ? pending.token : await getCanvasToken();
  let candidate = recovering ? pending : null;
  try {
    const result = await runOfficialSession({ kind: 'canvas-rotate',
      config: { ...config, currentToken, recoverCandidate: recovering, forceRotate: force || canvasRenewalDue({ ...config, lastAttempt: null }) },
      onCandidate: async record => {
        if (!record || !matches(record) || !/^[A-Za-z0-9._~-]{30,4096}$/.test(record.token)) throw new Error('Invalid candidate');
        candidate = record; await save(CANVAS_PENDING, record);
      },
      onVerified: async () => { await saveCanvasToken(candidate?.token || currentToken); await save(CANVAS_PENDING, null); },
    });
    return { ...config, enabled: true, status: 'ready' as const, message: '', lastAttempt: new Date().toISOString(),
      lastRotated: result.rotated || recovering ? new Date().toISOString() : config.lastRotated, expiresAt: result.expiresAt || null };
  } catch (error) {
    if (error instanceof WebSessionError && ['rotation_identity_or_scope_changed','bearer_account_changed','account_changed'].includes(error.code) && candidate) await save(CANVAS_PENDING, { ...candidate, quarantined: true });
    throw error;
  }
}
export const clearCanvasRenewal = () => save(CANVAS_PENDING, null);
export async function keepCanvasSession(accountId: string) {
  const result=await runOfficialSession({kind:'canvas-keepalive',config:{accountId}});
  if(result.accountId!==accountId)throw new WebSessionError('account_changed');
}
export async function connectHaokeSession(expected?:string,silent=false,signal?:AbortSignal) {
  const savedLogin=await haokeStudentLogin.status();
  if(silent&&Platform.OS!=='web'&&savedLogin.enabled)return haokeNativeLogin(expected,signal);
  const result = await runOfficialSession({ kind: 'haoke-login',silent,signal,config:{expectedAccountId:expected,forceLogin:!silent||savedLogin.enabled} });
  return completeReservedLogin(result.loginAttempt,haokeStudentLogin,async()=>{
    const pair=await readHaokeCredentials(haokeSecret(result.token),undefined,signal);signal?.throwIfAborted();
    if(expected&&pair.userId!==expected)throw new HaokeError('好课账户已改变，请先断开连接再切换账户。',409);
    return pair;
  });
}
export const saveHaokeCredentials = async (value: HaokeCredentials | null) => { await save(HAOKE_ACTIVE, value); await save(HAOKE_PENDING, null); };
async function readSavedHaokeCredentials(expected: string,signal?:AbortSignal): Promise<HaokeCredentials> {
  const pendingRaw = await read(HAOKE_PENDING), activeRaw = await read(HAOKE_ACTIVE);
  if (!activeRaw) throw new HaokeError('请先登录好课。',401);
  const active: HaokeCredentials = JSON.parse(activeRaw);
  if (active.userId !== expected) throw new Error('好课账户已改变，请重新连接。');
  const pending: HaokeCredentials | null = pendingRaw ? JSON.parse(pendingRaw) : null;
  if (pending && pending.userId !== expected) throw new Error('好课候选凭据的账户不一致，请重新连接。');
  const candidate = pending || await renewHaokeCredentials(active,undefined,signal);
  signal?.throwIfAborted();if (!pending) await save(HAOKE_PENDING, candidate);
  await verifyHaokeAccount(candidate.token, expected,undefined,signal);signal?.throwIfAborted();
  await saveHaokeCredentials(candidate);
  return candidate;
}
export async function getHaokeCredentials(expected:string,signal?:AbortSignal):Promise<HaokeCredentials>{
  return withHaokeLoginRecovery(()=>readSavedHaokeCredentials(expected,signal),async()=>{
    if(!(await haokeStudentLogin.status()).enabled)throw new HaokeError('好课登录已失效，请重新连接或开启学号自动填充。',401);
    signal?.throwIfAborted();const pair=await connectHaokeSession(expected,true,signal);signal?.throwIfAborted();await saveHaokeCredentials(pair);return pair;
  });
}
