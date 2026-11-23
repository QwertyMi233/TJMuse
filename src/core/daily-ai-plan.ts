import {validDate} from './calendar';
export interface DailyPlanOptions {
  today:()=>string;
  read:()=>Promise<string|null>;
  write:(value:string)=>Promise<void>;
  key:()=>Promise<string>;
  generate:(day:string,key:string,signal:AbortSignal)=>Promise<void>;
  report:(error:unknown)=>void;
}
// A module-wide claim queue also serializes remounts in a native JS runtime.
let claims:Promise<unknown>=Promise.resolve();
export function parseDailyPlanLedger(raw:string|null):string[]{
  if(!raw)return [];
  const value=JSON.parse(raw);
  if(!value||value.version!==1||!Array.isArray(value.days))throw new Error('每日AI规划记录无法读取，已暂停自动请求。');
  return [...new Set(value.days.filter((day:unknown):day is string=>typeof day==='string'&&validDate(day)))].slice(-90) as string[];
}
export function createDailyAIPlanner(options:DailyPlanOptions){
  let flight:Promise<void>|null=null,controller:AbortController|null=null,disposed=false;
  const attempted=new Set<string>();
  const request=()=>{
    if(disposed)return Promise.resolve();if(flight)return flight;
    const day=options.today();
    if(!validDate(day)||attempted.has(day))return Promise.resolve();attempted.add(day);
    const claim=claims.catch(()=>{}).then(async()=>{
      if(disposed)return false;
      const days=parseDailyPlanLedger(await options.read());
      if(days.includes(day))return false;
      // Persist before key lookup or HTTP. Failure, cancellation, no key and
      // process restart must never silently spend another automatic request.
      await options.write(JSON.stringify({version:1,days:[...days,day].slice(-90)}));
      return !disposed;
    });
    claims=claim;
    const next=(async()=>{try{
      if(!await claim||disposed)return;
      const key=await options.key();if(!key||disposed)return;
      controller=new AbortController();await options.generate(day,key,controller.signal);
    }catch(e){if(!disposed&&!controller?.signal.aborted)options.report(e);}finally{controller=null;}})();
    flight=next;void next.finally(()=>{if(flight===next)flight=null;});return next;
  };
  return {request,cancel(){controller?.abort();},dispose(){disposed=true;controller?.abort();}};
}
export interface AIRequestLease {release:()=>void}
export function createAIRequestGate(){
  let owner:symbol|null=null;
  return {claim():AIRequestLease|null{if(owner)return null;const token=Symbol();owner=token;return {release:()=>{if(owner===token)owner=null;}};}};
}
