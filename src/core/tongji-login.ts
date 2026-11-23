export type LoginFailureReason='credentials-rejected'|'verification-required';
export type TongjiLoginRecord = { id:string; attemptId:string|null; studentId:string; password:string; state:'ready'|'needs-user'; lastAttempt:string|null; lastSuccess:string|null; blocked?:boolean;failureReason?:LoginFailureReason;nativeAttempted?:boolean };
export type TongjiLoginStatus = { enabled:boolean; studentId:string; state:'off'|'ready'|'needs-user'; lastSuccess:string|null; retryAt?:number };
export const LOGIN_INTERRUPTION_RETRY_MS=30000;
export interface LoginVault { get():Promise<string|null>; set(value:string):Promise<void>; remove():Promise<void> }
export async function completeReservedLogin<T>(attempt:{id:string;attemptId:string}|undefined,service:{succeeded:(id:string,attemptId:string)=>Promise<void>;release:(id:string,attemptId:string)=>Promise<void>},verify:()=>Promise<T>):Promise<T>{
  try{const value=await verify();if(attempt)await service.succeeded(attempt.id,attempt.attemptId);return value;}
  catch(error){if(attempt)await service.release(attempt.id,attempt.attemptId).catch(()=>{});throw error;}
}
export function validateStudentLogin(studentId:string,password:string) {
  if(!/^\d{6,20}$/.test(studentId))throw new Error('请输入 6～20 位数字学号。');
  if(!password || password.length>128 || /[\u0000\r\n]/.test(password))throw new Error('请输入有效的学校密码。');
}
export function createTongjiLoginVault(vault:LoginVault,validate=validateStudentLogin,now=Date.now) {
  const activeAttempts=new Set<string>();
  let queue:Promise<unknown>=Promise.resolve();
  const locked=<T>(work:()=>Promise<T>):Promise<T>=>{const next=queue.catch(()=>{}).then(work);queue=next;return next;};
  const read=async()=>{
    const raw=await vault.get();if(!raw)return null;
    try{const value=JSON.parse(raw) as TongjiLoginRecord;
      validate(value.studentId,value.password);
      if(!value.id || !['ready','needs-user'].includes(value.state))throw new Error();
      // Earlier builds marked DOM/timeouts as rejected passwords. Recheck those
      // ambiguous legacy blocks once; confirmed rejections retain their reason.
      if(value.blocked&&!value.failureReason){const recovered={...value,state:'ready' as const,blocked:false,attemptId:null};await vault.set(JSON.stringify(recovered));return recovered;}
      // A pending attempt is not proof that the password was rejected. Recover
      // interrupted/cold-start attempts after a short durable backoff.
      if(value.state==='needs-user'&&!value.blocked&&!activeAttempts.has(value.attemptId||'')&&now()-Date.parse(value.lastAttempt||'')>=LOGIN_INTERRUPTION_RETRY_MS){
        const recovered={...value,state:'ready' as const,attemptId:null};await vault.set(JSON.stringify(recovered));return recovered;
      }
      return value;
    }catch{throw new Error('本机登录信息无法读取，请重新设置。');}
  };
  return {
    matches:(account:string)=>locked(async()=>{const value=await read();return !!value&&value.studentId===account;}),
    status:()=>locked(async():Promise<TongjiLoginStatus>=>{const value=await read();return value?{enabled:true,studentId:value.studentId.slice(0,3)+'••••'+value.studentId.slice(-2),state:value.state,lastSuccess:value.lastSuccess,...(value.state==='needs-user'&&!value.blocked&&!activeAttempts.has(value.attemptId||'')&&value.lastAttempt?{retryAt:Date.parse(value.lastAttempt)+LOGIN_INTERRUPTION_RETRY_MS}:{})}:{enabled:false,studentId:'',state:'off',lastSuccess:null};}),
    save:(studentId:string,password:string,consent:boolean)=>locked(async()=>{
      if(!consent)throw new Error('请先同意仅在本机安全保存登录信息。');
      validate(studentId.trim(),password);
      await vault.set(JSON.stringify({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),attemptId:null,studentId:studentId.trim(),password,state:'ready',lastAttempt:null,lastSuccess:null} satisfies TongjiLoginRecord));
    }),
    // Reserve one attempt BEFORE returning a password. Failed or interrupted login
    // stays paused across restarts rather than repeatedly submitting a bad password.
    reserve:(protocol?:'native-v1')=>locked(async()=>{let value=await read();
      // Older DOM bridges also paused on missing/unready forms. Give that
      // ambiguous verification state one official native-protocol attempt.
      // Confirmed bad passwords stay blocked; a native challenge blocks again.
      if(value&&protocol==='native-v1'&&!value.nativeAttempted&&value.failureReason==='verification-required'&&!activeAttempts.has(value.attemptId||''))value={...value,state:'ready',blocked:false};
      if(!value||value.state!=='ready')return null;
      const next={...value,...(protocol==='native-v1'?{nativeAttempted:true}:{}),blocked:false,attemptId:now().toString(36)+'-'+Math.random().toString(36).slice(2),state:'needs-user' as const,lastAttempt:new Date(now()).toISOString()};
      await vault.set(JSON.stringify(next));activeAttempts.add(next.attemptId);return next;
    }),
    succeeded:(id:string,attemptId:string)=>locked(async()=>{const value=await read();if(value?.id===id&&value.attemptId===attemptId)await vault.set(JSON.stringify({...value,state:'ready',blocked:false,attemptId:null,lastSuccess:new Date(now()).toISOString()}));activeAttempts.delete(attemptId);}),
    failed:(id:string,attemptId:string,failureReason:LoginFailureReason='credentials-rejected')=>locked(async()=>{const value=await read();if(value?.id===id&&value.attemptId===attemptId)await vault.set(JSON.stringify({...value,state:'needs-user',blocked:true,failureReason}));activeAttempts.delete(attemptId);}),
    release:(id:string,attemptId:string)=>locked(async()=>{const value=await read();if(value?.id===id&&value.attemptId===attemptId)await vault.set(JSON.stringify({...value,state:'ready',attemptId:null}));activeAttempts.delete(attemptId);}),
    retry:()=>locked(async()=>{const value=await read();if(value)await vault.set(JSON.stringify({...value,state:'ready',blocked:false,attemptId:null}));}),
    clear:()=>locked(()=>vault.remove()),
  };
}
