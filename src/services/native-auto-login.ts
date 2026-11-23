import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {haokeStudentLogin} from './haoke-credentials';
import {zhixuemengLogin} from './zhixuemeng-credentials';
import {loginHaokePassword,loginZhixuemengPassword,readZhixuemengNative,withNativeSessionRecovery,NativeLoginError,type ZxmNativeSession} from '../core/native-platform-login';
import {recordAuthStage} from '../core/diagnostics';
type LoginService=typeof haokeStudentLogin;
const ZXM_KEY='tjmuse.zhixuemeng.native-session.v1';
export const clearNativeZxmSession=()=>Platform.OS==='web'?Promise.resolve():SecureStore.deleteItemAsync(ZXM_KEY);
async function savedLogin<T>(service:LoginService,platform:'haoke'|'zhixuemeng',work:(account:string,password:string)=>Promise<T>,signal?:AbortSignal){
 if(signal?.aborted)throw new NativeLoginError('cancelled');
 const saved=await service.reserve('native-v1');if(!saved||!saved.attemptId){recordAuthStage('paused',platform);throw new NativeLoginError('verification-required');}
 try{
  const result=await work(saved.studentId,saved.password);signal?.throwIfAborted();
  await service.succeeded(saved.id,saved.attemptId);recordAuthStage('complete',platform);return result;
 }catch(e){
  recordAuthStage('failed',platform);
  if(e instanceof NativeLoginError&&['credentials-rejected','verification-required'].includes(e.reason))await service.failed(saved.id,saved.attemptId,e.reason as 'credentials-rejected'|'verification-required');
  else await service.release(saved.id,saved.attemptId).catch(()=>{});
  throw e;
 }
}
export const haokeNativeLogin=(expected?:string,signal?:AbortSignal)=>savedLogin(haokeStudentLogin,'haoke',(account,password)=>loginHaokePassword(account,password,expected,fetch,signal,s=>recordAuthStage(s,'haoke')),signal);
export async function zhixuemengNativeSync(expected?:string,signal?:AbortSignal){
 if(Platform.OS==='web')throw new NativeLoginError('invalid-result');
 const status=await zhixuemengLogin.status();
 const authenticate=()=>savedLogin(zhixuemengLogin,'zhixuemeng',async(account,password)=>{
  recordAuthStage('zxm-password','zhixuemeng');const session=await loginZhixuemengPassword(account,password,fetch,signal);
  recordAuthStage('zxm-read','zhixuemeng');const snapshot=await readZhixuemengNative(session,expected,fetch,signal);signal?.throwIfAborted();
  if(!(await zhixuemengLogin.matches(account)))throw new NativeLoginError('account-changed');
  await SecureStore.setItemAsync(ZXM_KEY,JSON.stringify(session),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});return snapshot;
 },signal);
 const cached=await SecureStore.getItemAsync(ZXM_KEY);
 if(cached){
  let session:ZxmNativeSession|null=null;try{const v=JSON.parse(cached);if(v?.token&&v.identity?.id&&v.identity?.username&&typeof v.loginAccount==='string')session=v;}catch{}
  if(session&&(!status.enabled||await zhixuemengLogin.matches(session.loginAccount))){
   recordAuthStage('cached','zhixuemeng');return withNativeSessionRecovery(()=>readZhixuemengNative(session!,expected,fetch,signal),async()=>{await clearNativeZxmSession();return authenticate();});
  }
  await clearNativeZxmSession();
 }
 return authenticate();
}
