// Only the interactive Canvas token-list reader uses this lifecycle.
export function createCanvasListLifecycle<T>(o:{
 nonce:string;reading:(value:boolean)=>void;readTimedOut:()=>void;
 requestClose:()=>boolean;forceUnmount:()=>void;
 complete:(error?:Error,result?:T)=>void;cancelError:()=>Error;
 readMs?:number;closeMs?:number;settleMs?:number;
}){
 let phase:'open'|'reading'|'closing'|'done'='open',sequence=0,readNonce:string|null=null;
 let readTimer:ReturnType<typeof setTimeout>|undefined,closeTimer:ReturnType<typeof setTimeout>|undefined,settleTimer:ReturnType<typeof setTimeout>|undefined;
 let outcome:{error?:Error;result?:T}|undefined;
 const clear=()=>{clearTimeout(readTimer);clearTimeout(closeTimer);clearTimeout(settleTimer);};
 const dismissed=()=>{
  if(phase==='done')return;
  const value=outcome||{error:o.cancelError()};phase='done';readNonce=null;clear();o.complete(value.error,value.result);
 };
 const force=()=>{if(phase!=='closing')return;clearTimeout(closeTimer);o.forceUnmount();settleTimer=setTimeout(dismissed,o.settleMs??400);};
 const finish=(error?:Error,result?:T)=>{
  if(phase==='closing'||phase==='done')return;
  phase='closing';readNonce=null;clearTimeout(readTimer);outcome={error,result};o.reading(false);
  // Resolve after native dismissal, so the settings sheet cannot overlap it.
  closeTimer=setTimeout(force,o.closeMs??1500);
  try{if(!o.requestClose())force();}catch{force();}
 };
 return {
  begin(){
   if(phase!=='open')return null;
   phase='reading';readNonce=`${o.nonce}:list:${++sequence}`;o.reading(true);
   readTimer=setTimeout(()=>{if(phase!=='reading')return;phase='open';readNonce=null;o.reading(false);o.readTimedOut();},o.readMs??30000);
   return readNonce;
  },
  accept(nonce:string,error?:Error,result?:T){if(phase!=='reading'||nonce!==readNonce)return false;finish(error,result);return true;},
  finish,dismissed,
  dispose(){phase='done';readNonce=null;clear();},
 };
}
