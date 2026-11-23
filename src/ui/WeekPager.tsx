import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Animated,View} from 'react-native';
import type {SharedValue} from 'react-native-reanimated';
import {addDays,dateKey,parseDate,weekStart} from '../core/calendar';
export interface WeekPagerProps {selected:string;startsOn:0|1;step?:1|7;previewDate?:SharedValue<string>;onPreviewDate?:(date:string)=>void;onSelect:(date:string)=>void;renderPage:(anchor:string,width:number)=>React.ReactNode}
// Web uses Pointer Events so horizontal drags work with both a mouse and touch,
// while vertical scrolling remains with the browser. Native uses a paged FlatList.
export default function WeekPager(props:WeekPagerProps){
  const root=useRef<HTMLDivElement>(null),[width,setWidth]=useState(0),pan=useRef(new Animated.Value(0)).current,moving=useRef(false);
  const current=useRef({...props,width});current.current={...props,width};
  const start=useRef<{id:number;x:number;y:number;at:number;dragged:boolean}|null>(null),blockClick=useRef(false);
  const step=props.step||7,anchor=step===1?props.selected:dateKey(weekStart(parseDate(props.selected),props.startsOn));
  useEffect(()=>{if(!root.current)return;const node=root.current;setWidth(node.clientWidth);const observer=new ResizeObserver(()=>setWidth(node.clientWidth));observer.observe(node);return()=>observer.disconnect();},[]);
  useLayoutEffect(()=>{pan.stopAnimation();pan.setValue(0);moving.current=false;if(props.previewDate)props.previewDate.value=props.selected;},[anchor,width,pan]);
  useEffect(()=>()=>pan.stopAnimation(),[pan]);
  const settle=(dx:number,vx:number)=>{
    if(Math.abs(dx)<45&&!(Math.abs(vx)>.45&&Math.abs(dx)>16)){if(current.current.previewDate)current.current.previewDate.value=current.current.selected;Animated.spring(pan,{toValue:0,stiffness:280,damping:30,mass:1,useNativeDriver:false,isInteraction:false}).start();return;}
    moving.current=true;const direction=dx<0?1:-1,state=current.current,next=dateKey(addDays(parseDate(state.selected),direction*(state.step||7)));
    Animated.timing(pan,{toValue:-direction*state.width,duration:Math.max(90,Math.min(220,(state.width-Math.abs(dx))/Math.max(.8,Math.abs(vx)))),useNativeDriver:false,isInteraction:false}).start(({finished})=>{if(finished)current.current.onSelect(next);else moving.current=false;});
  };
  return <div ref={root} data-testid={step===1?"day-pager":"schedule-week-pager"} style={{flex:1,minHeight:0,display:'flex',overflow:'hidden',touchAction:'pan-y'}}
    onPointerDown={e=>{if(moving.current||!e.isPrimary||e.button!==0)return;blockClick.current=false;start.current={id:e.pointerId,x:e.clientX,y:e.clientY,at:e.timeStamp,dragged:false};}}
    onPointerMove={e=>{const s=start.current;if(!s||s.id!==e.pointerId)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(!s.dragged&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3){s.dragged=true;e.currentTarget.setPointerCapture(e.pointerId);}if(s.dragged){e.preventDefault();const state=current.current;if(state.previewDate){const day=dateKey(addDays(parseDate(state.selected),Math.abs(dx)>=width/2?(dx<0?1:-1)*(state.step||7):0));if(state.previewDate.value!==day){state.previewDate.value=day;state.onPreviewDate?.(day);}}pan.setValue(Math.max(-width,Math.min(width,dx)));}}}
    onPointerUp={e=>{const s=start.current;start.current=null;if(!s?.dragged)return;e.preventDefault();e.stopPropagation();blockClick.current=true;settle(e.clientX-s.x,(e.clientX-s.x)/Math.max(1,e.timeStamp-s.at));}}
    onPointerCancel={()=>{start.current=null;if(current.current.previewDate)current.current.previewDate.value=current.current.selected;pan.stopAnimation();pan.setValue(0);}}
    onClickCapture={e=>{if(blockClick.current){blockClick.current=false;e.preventDefault();e.stopPropagation();}}}>
    {width>0&&<Animated.View style={{flex:1,width:width*3,flexDirection:'row',transform:[{translateX:Animated.subtract(pan,width)}]}}>{[-1,0,1].map(offset=><View key={offset} aria-hidden={offset!==0} accessibilityElementsHidden={offset!==0} importantForAccessibility={offset===0?'auto':'no-hide-descendants'} style={{width,flexShrink:0}}>{props.renderPage(dateKey(addDays(parseDate(anchor),offset*step)),width)}</View>)}</Animated.View>}
  </div>;
}
