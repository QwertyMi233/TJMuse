import type {AuthStage} from './native-platform-login';
type Entry={at:string;kind:'sheet-viewport'|'sheet-layout'|'keyboard'|'auth';values:(number|string)[]};
const entries:Entry[]=[];
function append(kind:Entry['kind'],values:Entry['values']){entries.push({at:new Date().toISOString(),kind,values});if(entries.length>150)entries.shift();}
export const recordViewport=(height:number)=>append('sheet-viewport',[Math.round(height)]);
export const recordSheetLayout=(mode:'content'|'form',requested:number,viewport:number,body:number,footer:number)=>append('sheet-layout',[mode,requested,viewport,body,footer].map(v=>typeof v==='number'?Math.round(v):v));
export const recordKeyboard=(visible:boolean,y:number,height:number)=>append('keyboard',[visible?'show':'hide',Math.round(y),Math.round(height)]);
// Only enum stages, never account names, task text, URLs, secrets or API bodies.
export const recordAuthStage=(stage:AuthStage|'failed'|'cached'|'paused',platform:'haoke'|'zhixuemeng')=>append('auth',[platform,stage]);
export const diagnosticEntries=()=>entries.map(e=>({...e,values:[...e.values]}));
