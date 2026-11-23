// Canvas manual-browser transition only; other session and sheet policies stay intact.
export interface CanvasBrowserResult {token?:string}
export interface CanvasBrowserFlowOptions {
 dismiss:(after:()=>void)=>void;hideSettings:()=>void;restoreSettings:()=>void;
 opening:(value:boolean)=>void;onCancel:()=>void;onError:(error:unknown)=>void;
 open:(signal:AbortSignal,shown:()=>void)=>Promise<CanvasBrowserResult>;
 onResult:(result:CanvasBrowserResult)=>Promise<void>;
 cancelError:()=>Error;openingError:()=>Error;isCancelled:(error:unknown)=>boolean;
 closeTimeoutMs?:number;settleMs?:number;openingTimeoutMs?:number;
}
export function createCanvasBrowserFlow(o:CanvasBrowserFlowOptions){
 type Attempt={phase:'closing'|'opening'|'browser'|'saving'|'returning';controller:AbortController;timers:Set<ReturnType<typeof setTimeout>>};
 let current:Attempt|null=null,disposed=false;
 const live=(a:Attempt)=>!disposed&&current===a;
 const clear=(a:Attempt)=>{for(const timer of a.timers)clearTimeout(timer);a.timers.clear();};
 const later=(a:Attempt,ms:number,run:()=>void)=>{const timer=setTimeout(()=>{a.timers.delete(timer);if(live(a))run();},ms);a.timers.add(timer);return timer;};
 const stop=(a:Attempt)=>{clear(a);if(current===a)current=null;};
 const returning=(a:Attempt,error?:unknown)=>{
  if(!live(a)||a.phase==='returning')return;
  clear(a);a.phase='returning';o.opening(false);if(error)o.onError(error);
  later(a,o.settleMs??350,()=>{stop(a);o.restoreSettings();});
 };
 const cancel=()=>{const a=current;if(!a)return;stop(a);a.controller.abort(o.cancelError());if(!disposed){o.opening(false);o.onCancel();}};
 return {
  get active(){return !!current;},
  start(){
   if(disposed||current)return false;
   const a:Attempt={phase:'closing',controller:new AbortController(),timers:new Set()};current=a;o.opening(true);
   const launch=()=>{
    if(!live(a)||a.phase!=='closing')return;
    clear(a);a.phase='opening';o.hideSettings();
    later(a,o.settleMs??350,()=>{
     const timeout=later(a,o.openingTimeoutMs??30000,()=>{const error=o.openingError();returning(a,error);a.controller.abort(error);});
     const shown=()=>{if(live(a)&&a.phase==='opening'){clearTimeout(timeout);a.timers.delete(timeout);a.phase='browser';o.opening(false);}};
     void Promise.resolve().then(()=>{if(!live(a)||a.controller.signal.aborted)throw o.cancelError();return o.open(a.controller.signal,shown);}).then(async result=>{
      if(!live(a)||!['opening','browser'].includes(a.phase))return;
      clear(a);a.phase='saving';o.opening(false);await o.onResult(result);
      if(live(a))returning(a);
     }).catch(error=>{
      if(!live(a)||a.phase==='returning')return;
      if(o.isCancelled(error))cancel();else returning(a,error);
     });
    });
   };
   // Native onDismiss can be lost. Only this Canvas entry gets a bounded fallback.
   later(a,o.closeTimeoutMs??1200,launch);
   try{o.dismiss(launch);}catch{launch();}
   return true;
  },
  cancel,
  dispose(){disposed=true;const a=current;if(a){stop(a);a.controller.abort(o.cancelError());}},
 };
}
