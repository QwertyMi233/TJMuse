import {useEffect} from 'react';
import {cancelAnimation,Easing,interpolateColor,useAnimatedStyle,useReducedMotion,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {ONBOARDING_BLUE} from './onboarding-colors';
export default function useOnboardingPalette(step:number,paused=false){
 const paper=step>0&&step<6,reduce=useReducedMotion(),aura=useSharedValue(paper?0:1),tint=useSharedValue(0);
 useEffect(()=>{if(paper&&!reduce&&!paused)tint.value=withRepeat(withTiming(1,{duration:3600,easing:Easing.inOut(Easing.sin)}),-1,true);else cancelAnimation(tint);return()=>cancelAnimation(tint);},[reduce,tint,paper,paused]);
 useEffect(()=>()=>cancelAnimation(aura),[aura]);
 const background=useAnimatedStyle(()=>({opacity:aura.value}));
 const title=useAnimatedStyle(()=>({color:paper?interpolateColor(tint.value,[0,1],[ONBOARDING_BLUE.deep,ONBOARDING_BLUE.light]):'#FFFFFF'}),[paper]);
 const prepare=(target:number)=>{aura.value=withTiming(target>0&&target<6?0:1,{duration:reduce?0:210,easing:Easing.out(Easing.quad)});};
 return {paper,background,title,prepare,text:paper?ONBOARDING_BLUE.deep:'#FFFFFF',secondary:paper?ONBOARDING_BLUE.muted:'#FFFFFFD9'};
}
