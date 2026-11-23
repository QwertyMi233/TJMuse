// A single extent controls both the visible height and dismissal translation.
// These pure helpers also run inside native gesture worklets.
export const SHEET_SPRING={mass:1,damping:30,stiffness:280,overshootClamping:true};
export function sheetSnapTarget(extent:number,velocityY:number,compact:number,maximum:number,wasExpanded:boolean){
  'worklet';
  if(extent<compact*.55||!wasExpanded&&(compact-extent>Math.min(120,compact*.3)||velocityY>1100))return 0;
  if(maximum-compact<40)return compact;
  if(wasExpanded)return extent<maximum-55||velocityY>500?compact:maximum;
  return extent>compact+45||velocityY < -500?maximum:compact;
}
export function sheetExtentLayout(extent:number,compact:number,maximum:number,keyboard=0){
  'worklet';
  const shown=Math.max(0,Math.min(extent,maximum));
  const inset=Math.max(0,Math.min(keyboard,maximum-1));
  return {height:Math.min(Math.max(compact,shown),maximum-inset),bottom:inset,translateY:Math.max(0,compact-shown),dimming:Math.min(1,shown/Math.max(1,compact))};
}
export function sheetKeyboardOverlap(keyboardHeight:number,screenHeight:number,stageBottom:number){
  'worklet';
  // Some presenters already resize. Only avoid the intersection still covering this modal.
  return Math.max(0,Math.min(keyboardHeight,stageBottom-(screenHeight-keyboardHeight)));
}
