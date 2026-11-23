import React,{useLayoutEffect} from 'react';
export default function WebSessionCloseBinding({close,closeRef,children}:{close:()=>void;closeRef?:React.RefObject<(()=>void)|null>;children:React.ReactNode}){
 useLayoutEffect(()=>{if(closeRef)closeRef.current=close;return()=>{if(closeRef?.current===close)closeRef.current=null;};},[close,closeRef]);
 return <>{children}</>;
}
