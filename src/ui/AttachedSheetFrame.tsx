import React,{useCallback,useEffect,useId,useRef,useState} from 'react';
import {Keyboard,Modal,Platform,View} from 'react-native';
import {Gesture,GestureDetector,GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated,{cancelAnimation,useAnimatedReaction,useAnimatedStyle,useSharedValue,withSpring} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {attachedSheetGeometry} from './sheet-layout';
import {SHEET_SPRING,sheetExtentLayout,sheetSnapTarget,sheetKeyboardOverlap} from './sheet-motion';
import {useSheetProgress,useSheetKeyboardHeight} from './SheetMotionContext';
import type {SheetFrameProps} from './sheet-types';
import useSheetWindowDimensions from './useSheetWindowDimensions';

export default function AttachedSheetFrame({visible,height,cap,ready=true,backgroundColor,dark,onClose,onViewport,children}:SheetFrameProps){
  const screen=useSheetWindowDimensions(),insets=useSafeAreaInsets();
  const [viewport,setViewport]=useState({width:screen.width,height:screen.height}),[presented,setPresented]=useState(visible),[exiting,setExiting]=useState(false);
  const geometry=attachedSheetGeometry(viewport.width,viewport.height,height,cap,Platform.OS!=='android',insets.top);
  const maximum=attachedSheetGeometry(viewport.width,viewport.height,cap,cap,Platform.OS!=='android',insets.top).height;
  const extent=useSharedValue(0),compact=useSharedValue(geometry.height),limit=useSharedValue(maximum);
  const expanded=useSharedValue(false),dragging=useSharedValue(false),closing=useSharedValue(false),start=useSharedValue(0),fingerStart=useSharedValue(0);
  const alive=useRef(true),opened=useRef(false),latest=useRef({visible,onClose});latest.current={visible,onClose};
  const notifyAfterDismiss=useRef(false);
  const sceneProgress=useSheetProgress(),motionId=useId();
  const fallbackKeyboard=useSharedValue(0),keyboard=useSheetKeyboardHeight()??fallbackKeyboard,lastMaximum=useRef(maximum);
  const stage=useRef<React.ComponentRef<typeof View>>(null),stageBottom=useSharedValue(screen.height);
  const finish=useCallback((notify:boolean)=>{if(!alive.current)return;notifyAfterDismiss.current=notify&&Platform.OS==='ios';setPresented(false);if(notify&&Platform.OS!=='ios'&&latest.current.visible)latest.current.onClose();},[]);
  const didDismiss=useCallback(()=>{if(notifyAfterDismiss.current&&alive.current&&latest.current.visible){notifyAfterDismiss.current=false;latest.current.onClose();}},[]);
  const dismissKeyboard=useCallback(()=>Keyboard.dismiss(),[]);
  const close=useCallback(()=>{
    if(closing.value)return;setExiting(true);Keyboard.dismiss();closing.value=true;cancelAnimation(extent);
    extent.value=withSpring(0,SHEET_SPRING,finished=>{if(finished)scheduleOnRN(finish,true);});
  },[closing,extent,finish]);
  useEffect(()=>{
    alive.current=true;return()=>{alive.current=false;cancelAnimation(extent);if(sceneProgress){const next={...sceneProgress.value};delete next[motionId];sceneProgress.value=next;}};
  },[extent,sceneProgress,motionId]);
  useEffect(()=>{
    compact.value=geometry.height;limit.value=maximum;
    const systemResize=Platform.OS==='android'&&Math.abs(maximum-lastMaximum.current)>1;lastMaximum.current=maximum;
    if(visible&&opened.current&&!dragging.value&&!closing.value){
      if(systemResize){cancelAnimation(extent);extent.value=expanded.value?maximum:geometry.height;}
      else extent.value=withSpring(expanded.value?maximum:geometry.height,SHEET_SPRING);
    }
  },[geometry.height,maximum,visible,compact,limit,dragging,closing,extent,expanded]);
  useEffect(()=>{
    if(visible){
      setPresented(true);setExiting(false);opened.current=false;closing.value=false;expanded.value=false;extent.value=0;
    }
    if(opened.current){
      // Navigation can replace this modal with another; never leave two
      // presenting controllers fighting during an external dismissal.
      closing.value=true;cancelAnimation(extent);extent.value=0;setPresented(false);
    }
  },[visible,closing,expanded,extent,compact,finish]);
  useEffect(()=>{
    if(!visible||!presented||!ready||opened.current)return;
    const frame=requestAnimationFrame(()=>{
      // X can be tapped before this scheduled entrance starts. Never let the
      // entrance cancel an in-flight exit and leave an unclosable panel.
      if(!alive.current||closing.value||!latest.current.visible)return;
      opened.current=true;extent.value=withSpring(compact.value,SHEET_SPRING);
    });
    return()=>cancelAnimationFrame(frame);
  },[visible,presented,ready,compact,extent,closing]);
  const pan=Gesture.Pan().activeOffsetY([-6,6]).failOffsetX([-24,24])
    .onBegin(e=>{if(closing.value)return;cancelAnimation(extent);start.value=extent.value;fingerStart.value=e.absoluteY;})
    .onStart(()=>{if(!closing.value)dragging.value=true;})
    // The header itself moves. Window coordinates avoid accumulating that
    // movement into the gesture's translation on either native or web.
    .onUpdate(e=>{if(closing.value)return;extent.value=Math.max(0,Math.min(limit.value,start.value+fingerStart.value-e.absoluteY));})
    .onEnd(e=>{
      if(closing.value)return;
      const target=sheetSnapTarget(extent.value,e.velocityY,compact.value,limit.value,expanded.value);
      dragging.value=false;expanded.value=target>compact.value+1;
      if(target===0){closing.value=true;scheduleOnRN(dismissKeyboard);}
      extent.value=withSpring(target,{...SHEET_SPRING,velocity:-e.velocityY},finished=>{if(finished&&target===0)scheduleOnRN(finish,true);});
    })
    .onFinalize((_e,success)=>{dragging.value=false;if(!success&&!closing.value)extent.value=withSpring(expanded.value?limit.value:compact.value,SHEET_SPRING);});
  const motion=useAnimatedStyle(()=>{
    const overlap=sheetKeyboardOverlap(keyboard.value,screen.height,stageBottom.value);
    const s=sheetExtentLayout(extent.value,compact.value,limit.value,overlap);
    return {height:s.height,bottom:s.bottom,transform:[{translateY:s.translateY}]};
  });
  const dimmer=useAnimatedStyle(()=>({opacity:sheetExtentLayout(extent.value,compact.value,limit.value).dimming*(dark?.22:.12)}));
  useAnimatedReaction(()=>presented?sheetExtentLayout(extent.value,compact.value,limit.value).dimming:null,value=>{if(sceneProgress){const next={...sceneProgress.value};if(value===null)delete next[motionId];else next[motionId]=value;sceneProgress.value=next;}},[presented,sceneProgress,motionId]);
  const header=(content:React.ReactElement)=><GestureDetector gesture={pan}>{content}</GestureDetector>;
  return <Modal visible={presented} animationType="none" transparent presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={close} onDismiss={didDismiss}>
    <GestureHandlerRootView style={{flex:1}} accessibilityElementsHidden={!visible||!ready||exiting} importantForAccessibility={visible&&ready&&!exiting?'auto':'no-hide-descendants'} pointerEvents={visible&&ready&&!exiting?'auto':'none'}><SafeAreaProvider style={{flex:1}}>
      <Animated.View testID="sheet-backdrop" pointerEvents="none" style={[{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#000000'},dimmer]}/>
        <View ref={stage} testID="sheet-motion-stage" onLayout={e=>{const {width,height:h}=e.nativeEvent.layout;setViewport(old=>old.width===width&&old.height===h?old:{width,height:h});stage.current?.measureInWindow((_x,y,_w,height)=>{stageBottom.value=y+height;});}} style={{flex:1,alignItems:'center',justifyContent:'flex-end',overflow:Platform.OS==='web'?'clip' as 'hidden':'hidden'}}>
          <Animated.View testID="attached-sheet-frame" onLayout={e=>onViewport(e.nativeEvent.layout.height)} onAccessibilityEscape={close} style={[{...geometry,backgroundColor,borderCurve:Platform.OS==='ios'?'continuous':undefined,overflow:'hidden'},motion]}>
            {children(header,close)}
          </Animated.View>
        </View>
    </SafeAreaProvider></GestureHandlerRootView>
  </Modal>;
}
