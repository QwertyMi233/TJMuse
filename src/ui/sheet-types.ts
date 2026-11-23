import type React from 'react';
export interface SheetFrameProps {
  visible:boolean; height:number; cap:number; backgroundColor:string; dark:boolean;
  ready?:boolean;
  presentation?:'content'|'form';
  onClose:()=>void; onViewport:(height:number)=>void;
  children:(header:(content:React.ReactElement)=>React.ReactElement,close:()=>void)=>React.ReactNode;
}
