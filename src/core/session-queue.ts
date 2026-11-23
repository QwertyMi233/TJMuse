// One embedded browser at a time, with bounded waits and foreground priority.
export interface SessionTask<T>{run:(signal:AbortSignal)=>Promise<T>;signal?:AbortSignal;background:boolean;preemptible:boolean;timeoutMs:number;cancelError:()=>Error;timeoutError:()=>Error}
export function createSessionQueue(delayMs=400){
 type Entry={background:boolean;preemptible:boolean;controller:AbortController;start:()=>void};
 const pending:Entry[]=[];let active:Entry|null=null,cooling=false;
 const pump=()=>{if(active||cooling)return;const index=pending.findIndex(e=>!e.background),entry=pending.splice(index<0?0:index,1)[0];if(entry){active=entry;entry.start();}};
 return {enqueue<T>(task:SessionTask<T>):Promise<T>{return new Promise<T>((resolve,reject)=>{
  const controller=new AbortController();let done=false,timer:ReturnType<typeof setTimeout>;
  const external=()=>controller.abort(task.signal?.reason||task.cancelError());
  const finish=(error:unknown,value?:T)=>{if(done)return;done=true;clearTimeout(timer);task.signal?.removeEventListener('abort',external);controller.signal.removeEventListener('abort',aborted);
   const index=pending.indexOf(entry);if(index>=0)pending.splice(index,1);
   if(active===entry){active=null;cooling=true;setTimeout(()=>{cooling=false;pump();},delayMs);}else pump();
   if(error)reject(error);else resolve(value as T);
  };
  const aborted=()=>finish(controller.signal.reason||task.cancelError());
  const entry:Entry={background:task.background,preemptible:task.preemptible,controller,start:()=>{Promise.resolve().then(()=>{controller.signal.throwIfAborted();return task.run(controller.signal);}).then(value=>finish(null,value),error=>finish(error));}};
  controller.signal.addEventListener('abort',aborted,{once:true});task.signal?.addEventListener('abort',external,{once:true});
  if(task.signal?.aborted){external();return;}
  timer=setTimeout(()=>controller.abort(task.timeoutError()),task.timeoutMs);
  pending.push(entry);
  if(!task.background){for(const older of [...pending])if(older!==entry&&older.background&&older.preemptible)older.controller.abort(task.cancelError());if(active?.preemptible&&active.background)active.controller.abort(task.cancelError());}
  pump();
 });}};
}
