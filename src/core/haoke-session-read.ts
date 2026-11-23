// The WebView may navigate, stop its timers, or fail to deliver a bridge message.
// Keep an independent native deadline and distinguish every retry.
export function createHaokeSessionRead({nonce,reading,expired,setTimer=setTimeout,clearTimer=clearTimeout}:{nonce:string;reading:(value:boolean)=>void;expired:()=>void;setTimer?:typeof setTimeout;clearTimer?:typeof clearTimeout}){
  let sequence=0,current:string|null=null,disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{if(timer!==undefined)clearTimer(timer);timer=undefined;};
  const cancel=()=>{clear();const wasReading=current!==null;current=null;if(wasReading)reading(false);};
  return {begin(){
    if(disposed||current)return null;
    const id=`${nonce}:haoke-read:${++sequence}`;current=id;reading(true);
    timer=setTimer(()=>{if(current!==id||disposed)return;cancel();expired();},30000);
    return id;
  },accept(id:unknown){if(disposed||id!==current||current===null)return false;cancel();return true;},cancel,dispose(){cancel();disposed=true;}};
}
