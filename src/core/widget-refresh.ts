import type {AppData} from './types';

// Read the latest store at publication time. Foreground refresh must work even
// when no task has changed since yesterday, and message streaming must not delay it.
export function createWidgetRefresh({read,publish,report=()=>{},delay=150,setTimer=setTimeout,clearTimer=clearTimeout}:{read:()=>AppData;publish:(data:AppData)=>Promise<void>;report?:(error:unknown)=>void;delay?:number;setTimer?:typeof setTimeout;clearTimer?:typeof clearTimeout}){
  let disposed=false,queued=false,timer:ReturnType<typeof setTimeout>|undefined,flight:Promise<void>|null=null,lastPublished:AppData|undefined;
  const flush=(force=true):Promise<void>=>{
    if(timer!==undefined){clearTimer(timer);timer=undefined;}
    if(disposed)return Promise.resolve();
    if(flight){queued=true;return flight;}
    const next=Promise.resolve().then(async()=>{
      do{queued=false;const data=read();if(!force&&data===lastPublished)break;try{await publish(data);lastPublished=data;}catch(error){if(!disposed)report(error);}}while(queued&&!disposed);
    }).finally(()=>{if(flight===next)flight=null;});
    flight=next;return next;
  };
  return {flush,changed(){
    if(disposed)return;
    if(timer!==undefined)clearTimer(timer);
    timer=setTimer(()=>{timer=undefined;void flush(false);},delay);
  },dispose(){disposed=true;queued=false;if(timer!==undefined)clearTimer(timer);timer=undefined;}};
}
