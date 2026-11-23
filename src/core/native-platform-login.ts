import {encryptHaokePassword} from './haoke-password';
import {haokeSecret,type HaokeCredentials} from './haoke-api';
import readZhixuemeng from './zhixuemeng-reader.native.generated';
import {isExpiredPlatformSession} from './platform-session-errors';
export class NativeLoginError extends Error{
 constructor(public reason:'credentials-rejected'|'verification-required'|'expired'|'network'|'invalid-result'|'account-changed'|'cancelled'){
  super(reason==='credentials-rejected'?'保存的账号或密码被平台拒绝，请在自动登录设置中更新。':reason==='verification-required'?'平台要求验证码或额外验证，请在应用内登录页完成。':reason==='account-changed'?'平台账户已改变，请先断开连接再切换账户。':reason==='cancelled'?'已取消同步。':reason==='expired'?'平台登录已失效。':'后台登录或读取未完成，已有作业保留，可稍后重试。');
 }
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export type AuthStage='haoke-key'|'haoke-password'|'haoke-ticket'|'haoke-exchange'|'haoke-identity'|'zxm-password'|'zxm-read'|'complete';
export const MOBILE_AGENT='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Mobile Safari/537.36';
const uuid=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.random()*16|0;return (c==='x'?n:n&3|8).toString(16);});
export function nativeJson(transport:typeof fetch=fetch,signal?:AbortSignal){
 const deadline=Date.now()+120000;
 return async(url:string,method:'GET'|'POST',headers:Record<string,string>,body?:unknown)=>{
  if(signal?.aborted)throw new NativeLoginError('cancelled');
  const c=new AbortController(),abort=()=>c.abort(),remaining=deadline-Date.now();if(remaining<=0)throw new NativeLoginError('network');
  signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,Math.min(15000,remaining));
  try{
   const r=await transport(url,{method,headers:{Accept:'application/json',...headers},credentials:'omit',redirect:'error',cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)}),signal:c.signal});
   signal?.throwIfAborted();
   if(r.redirected||r.url&&new URL(r.url).origin!==new URL(url).origin)throw new NativeLoginError('invalid-result');
   if([401,403].includes(r.status))throw new NativeLoginError('expired');
   const text=await r.text();if(text.length>2000000)throw new NativeLoginError('invalid-result');
   let value:unknown;try{value=JSON.parse(text);}catch{throw new NativeLoginError(r.ok?'invalid-result':'network');}
   // Zhixuemeng returns HTTP 500 with "Token失效" for expired sessions.
   // Inspect its error body before treating all 5xx responses as network errors.
   if(!r.ok&&object(value)&&isExpiredPlatformSession(r.status,value.code??value.status,value.message||value.msg))throw new NativeLoginError('expired');
   if(!r.ok)throw new NativeLoginError('network');
   if(!object(value))throw new NativeLoginError('invalid-result');return value;
  }catch(e){if(e instanceof NativeLoginError)throw e;throw new NativeLoginError(signal?.aborted?'cancelled':'network');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 };
}
// Same five official requests as TJ-Class-Schedule's PasswordLoginClient.
export async function loginHaokePassword(account:string,password:string,expected?:string,transport:typeof fetch=fetch,signal?:AbortSignal,stage:(s:AuthStage)=>void=()=>{}):Promise<HaokeCredentials>{
 const request=nativeJson(transport,signal);
 const post=async(origin:string,path:string,body:Record<string,unknown>,token?:string)=>{
  const value=await request(origin+path,'POST',{'Content-Type':'application/json','X-Language':'zh-CN',Origin:origin,...(token?{Authorization:'Bearer '+haokeSecret(token)}:{})},{...body,requestId:uuid()});
  if(Number(value.code)!==200){
   const message=String(value.message||value.msg||'');
   if(Number(value.code)===603||/验证码|人机验证|captcha|verify/i.test(message))throw new NativeLoginError('verification-required');
   if(path==='/api/auth/userNoLogin'&&(/密码|账号|学号|password|credential/i.test(message)||[400,401,1001,1002].includes(Number(value.code))))throw new NativeLoginError('credentials-rejected');
   throw new NativeLoginError('invalid-result');
  }
  if(!object(value.data))throw new NativeLoginError('invalid-result');return value.data;
 };
 const passport='https://passport.aihaoke.net',school='https://tongji.aihaoke.net';
 stage('haoke-key');const key=await post(passport,'/api/auth/getRsaKey',{encType:'aes'});
 if(typeof key.key!=='string'||typeof key.keyId!=='string'&&typeof key.keyId!=='number')throw new NativeLoginError('invalid-result');
 stage('haoke-password');const login=await post(passport,'/api/auth/userNoLogin',{autoLogin:true,keyId:key.keyId,userPassword:encryptHaokePassword(password,key.key),deviceType:'pc',encType:'aes',validate:'',tenantId:88,userNo:account});
 stage('haoke-ticket');const ticket=await post(passport,'/api/auth/getTicket',{deviceType:'pc'},haokeSecret(login.token));
 stage('haoke-exchange');const schoolLogin=await post(school,'/api/auth/loginByTicket',{ticket:haokeSecret(ticket.data)});
 stage('haoke-identity');const identity=await post(school,'/api/auth/queryCurrentUserInfo',{},haokeSecret(schoolLogin.token));
 if(!object(identity.userInfo)||!/^\d{1,30}$/.test(String(identity.userInfo.userId)))throw new NativeLoginError('invalid-result');
 const userId=String(identity.userInfo.userId);if(expected&&expected!==userId)throw new NativeLoginError('account-changed');
 signal?.throwIfAborted();stage('complete');return {userId,token:haokeSecret(identity.token),ticket:haokeSecret(identity.ticket)};
}
export interface ZxmNativeSession {token:string;identity:{id:string;username:string};loginAccount:string}
export async function withNativeSessionRecovery<T>(read:()=>Promise<T>,login:()=>Promise<T>):Promise<T>{
 try{return await read();}catch(e){if(!(e instanceof NativeLoginError)||e.reason!=='expired')throw e;return login();}
}
export async function loginZhixuemengPassword(account:string,password:string,transport:typeof fetch=fetch,signal?:AbortSignal):Promise<ZxmNativeSession>{
 const v=await nativeJson(transport,signal)('https://admin.zhixuemeng.com/jeecg-boot/sys/mLogin','POST',{'Content-Type':'application/json','User-Agent':MOBILE_AGENT,Origin:'https://h5.zhixuemeng.com'},{username:account,password});
 if(v.success!==true||![0,200].includes(Number(v.code))){
  if(/验证码|人机验证|captcha|verify/i.test(String(v.message||v.msg||'')))throw new NativeLoginError('verification-required');
  if(/密码|账号|用户不存在|password|credential/i.test(String(v.message||v.msg||'')))throw new NativeLoginError('credentials-rejected');
  throw new NativeLoginError('invalid-result');
 }
 const result=v.result;if(!object(result)||typeof result.token!=='string'||!result.token||result.token.length>8192||!object(result.userInfo)||!/^[A-Za-z0-9_-]{1,128}$/.test(String(result.userInfo.id))||typeof result.userInfo.username!=='string'||!result.userInfo.username)throw new NativeLoginError('invalid-result');
 return {token:result.token,identity:{id:String(result.userInfo.id),username:result.userInfo.username},loginAccount:account};
}
export async function readZhixuemengNative(session:ZxmNativeSession,expected?:string,transport:typeof fetch=fetch,signal?:AbortSignal){
 const request=nativeJson(transport,signal),allowed=['/sys/user/queryById','/edu/eduCourseUser/appList','/edu/eduCourseWork/todoList','/edu/eduCourseWorkUser/list','/edu/eduCourseWorkTi/list'];
 try{return await readZhixuemeng(async(path,query)=>{
  if(!allowed.includes(path))throw new NativeLoginError('invalid-result');
  const url=new URL('https://admin.zhixuemeng.com/jeecg-boot'+path);for(const[k,v]of Object.entries(query))url.searchParams.set(k,String(v));
  const v=await request(url.href,'GET',{'X-Access-Token':session.token,'User-Agent':MOBILE_AGENT});
  if(isExpiredPlatformSession(200,v.code,v.message||v.msg))throw new NativeLoginError('expired');
  if(v.success!==true||![0,200].includes(Number(v.code))||!object(v.result))throw new NativeLoginError('invalid-result');return v.result;
 },session.identity,expected);}catch(e){if(e instanceof NativeLoginError)throw e;throw new NativeLoginError(e instanceof Error&&e.message==='account_changed'?'account-changed':'invalid-result');}
}
