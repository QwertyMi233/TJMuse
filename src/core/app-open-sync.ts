// One sync on cold start and on each background -> foreground transition.
// Permission dialogs cause inactive -> active, which must not trigger another sync.
export function createAppOpenSync(run:()=>Promise<void>,report:(error:unknown)=>void=()=>{}) {
  let state:string|null=null,opened=false,background=false,disposed=false,flight:Promise<void>|null=null,again=false;
  const request=(afterCurrent=false)=>{
    if(disposed||state!=='active')return Promise.resolve();
    if(flight){if(afterCurrent)again=true;return flight;}
    const next=Promise.resolve().then(async()=>{do{again=false;await run().catch(report);}while(again&&!disposed&&state==='active');}).finally(()=>{if(flight===next)flight=null;});
    flight=next;return next;
  };
  return {request,onState(next:string){state=next;if(next==='background')background=true;if(next==='active'&&(!opened||background)){opened=true;background=false;return request(true);}return Promise.resolve();},dispose(){disposed=true;again=false;}};
}
