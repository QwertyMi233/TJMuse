import {useCallback,useEffect,useRef,useState} from 'react';
import {cancelAnimation,Easing,useAnimatedStyle,useReducedMotion,useSharedValue,withTiming,type SharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';

function useLayer(entry:SharedValue<number>,exit:SharedValue<number>,delay:number,duration:number,travel:number,reduce:boolean){
 return useAnimatedStyle(()=>{
  const p=Math.max(0,Math.min(1,(entry.value-delay)/duration)),ease=1-Math.pow(1-p,3);
  return {opacity:ease*exit.value,transform:[{translateY:reduce?0:(1-ease)*travel}]};
 });
}
export default function useOnboardingMotion(step:number,commit:(target:number,forward:boolean,complete:boolean)=>void){
 const entry=useSharedValue(0),exit=useSharedValue(1),reduce=useReducedMotion();
 const [busy,setBusy]=useState(true),locked=useRef(true),alive=useRef(true),latest=useRef(commit);latest.current=commit;
 const unlock=useCallback(()=>{if(alive.current){locked.current=false;setBusy(false);}},[]);
 const finish=useCallback((target:number,forward:boolean,complete:boolean)=>{
  if(!alive.current)return;
  entry.value=0;exit.value=1;latest.current(target,forward,complete);
 },[entry,exit]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancelAnimation(entry);cancelAnimation(exit);};},[entry,exit]);
 useEffect(()=>{
  locked.current=true;setBusy(true);entry.value=0;exit.value=1;
  if(reduce){entry.value=1;unlock();return;}
  entry.value=withTiming(1,{duration:700,easing:Easing.linear},finished=>{if(finished)scheduleOnRN(unlock);});
  return()=>cancelAnimation(entry);
 },[step,reduce,entry,exit,unlock]);
 const transition=useCallback((target:number,forward:boolean,complete=false)=>{
  if(locked.current)return false;locked.current=true;setBusy(true);
  if(reduce)finish(target,forward,complete);
  else exit.value=withTiming(0,{duration:210,easing:Easing.out(Easing.quad)},finished=>{if(finished)scheduleOnRN(finish,target,forward,complete);});
  return true;
 },[reduce,finish,exit]);
 return {busy,transition,
  header:useLayer(entry,exit,0,.5,0,reduce),title:useLayer(entry,exit,0,.70,8,reduce),
  subtitle:useLayer(entry,exit,.12,.70,8,reduce),body:useLayer(entry,exit,.20,.72,10,reduce),footer:useLayer(entry,exit,.31,.69,7,reduce),
 };
}
