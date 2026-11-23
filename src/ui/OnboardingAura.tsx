import React,{memo,useEffect} from 'react';
import {Image,View} from 'react-native';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useReducedMotion,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {ONBOARDING_BLUE} from './onboarding-colors';

// Identical cached textures on iOS and Web; no per-frame gradient redraw.
const GlowTexture=memo(function GlowTexture({front}:{front:boolean}){
 return <Image testID={front?'aura-texture-front':'aura-texture-back'} source={front?require('../../assets/onboarding/aura-front.png'):require('../../assets/onboarding/aura-back.png')} resizeMode="stretch" style={{width:'100%',height:'100%'}}/>;
});
export default memo(function OnboardingAura({active=true}:{active?:boolean}){
 const phase=useSharedValue(0),reduce=useReducedMotion();
 useEffect(()=>{
  if(active&&!reduce)phase.value=withRepeat(withTiming(1,{duration:7000,easing:Easing.inOut(Easing.sin)}),-1,true);
  else cancelAnimation(phase);
  return()=>cancelAnimation(phase);
 },[phase,reduce,active]);
 const back=useAnimatedStyle(()=>({transform:[{translateX:-30+60*phase.value},{translateY:38-76*phase.value},{scale:1.28+.08*phase.value}]}));
 const front=useAnimatedStyle(()=>({opacity:.70+.30*phase.value,transform:[{translateX:35-70*phase.value},{translateY:-48+96*phase.value},{scale:1.32-.08*phase.value}]}));
 return <View testID="onboarding-aura" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0,overflow:'hidden',backgroundColor:ONBOARDING_BLUE.deep}}>
  <Animated.View testID="aura-back-layer" shouldRasterizeIOS renderToHardwareTextureAndroid style={[{position:'absolute',inset:0},back]}><GlowTexture front={false}/></Animated.View>
  <Animated.View testID="aura-front-layer" shouldRasterizeIOS renderToHardwareTextureAndroid style={[{position:'absolute',inset:0},front]}><GlowTexture front/></Animated.View>
  <View style={{position:'absolute',inset:0,backgroundColor:'#082B5910'}}/>
 </View>;
});
