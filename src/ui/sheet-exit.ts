// Complete one presentation once, after its presenter has actually dismissed.
// Saves and navigation share this path with X and swipe-to-dismiss.
export class SheetExit {
  private closing=false;
  private finished=false;
  private after?:()=>void;
  request(close:()=>void,after?:()=>void){
    if(this.closing||this.finished)return;
    this.closing=true;this.after=after;close();
  }
  complete(fallback:()=>void){
    if(this.finished)return;
    this.finished=true;
    const action=this.after||fallback;this.after=undefined;action();
  }
}
