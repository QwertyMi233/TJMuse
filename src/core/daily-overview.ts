import {validDate} from './calendar';
import {DAILY_GREETINGS} from './daily-greetings';
// Reserve before presenting, so a remount or foreground event cannot repeat the page.
export function createDailyOverviewGate(read:()=>Promise<string|null>,write:(value:string)=>Promise<void>,random= Math.random){
  let queue:Promise<unknown>=Promise.resolve(),greeting=0;
  return {greeting:()=>greeting,claim(day:string):Promise<boolean>{
    const next=queue.catch(()=>{}).then(async()=>{
      if(!validDate(day))return false;
      const raw=await read();if(raw===day)return false; // 0.5.0 early preview ledger.
      let ledger:{day:string;seen:number[];index:number}|null=null;
      if(raw){
        if(validDate(raw))ledger={day:raw,seen:[],index:-1};
        else {const value=JSON.parse(raw);if(value&&typeof value.day==='string'&&Array.isArray(value.seen))ledger=value;}
      }
      if(ledger?.day===day){greeting=ledger.index;return false;}
      let seen=ledger?.seen.filter(i=>Number.isInteger(i)&&i>=0&&i<DAILY_GREETINGS.length)||[];
      if(new Set(seen).size>=DAILY_GREETINGS.length)seen=[];
      const available=DAILY_GREETINGS.map((_,i)=>i).filter(i=>!seen.includes(i)&&i!==ledger?.index);
      greeting=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))]??0;
      await write(JSON.stringify({day,seen:[...seen,greeting],index:greeting}));return true;
    });
    queue=next;return next;
  }};
}
