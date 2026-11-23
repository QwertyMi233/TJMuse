import {useRef} from 'react';
export type SheetDismiss=(afterDismiss?:()=>void)=>void;
export function useSheetDismiss(onClose:()=>void){
  const closeRef=useRef<SheetDismiss|null>(null);
  const dismiss=(afterDismiss:()=>void=onClose)=>{closeRef.current?.(afterDismiss);};
  return {closeRef,dismiss};
}
