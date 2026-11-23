import React,{useCallback,useState} from 'react';
import {View} from 'react-native';
import {BottomSheet,Group,Host,RNHostView} from '@expo/ui/swift-ui';
import {frame,presentationSizing,presentationBackground,presentationCornerRadius,presentationDetents,presentationDragIndicator} from '@expo/ui/swift-ui/modifiers';
import type {SheetFrameProps} from './sheet-types';
import {recordViewport} from '../core/diagnostics';
// A single owner of keyboard avoidance: SwiftUI's presented view safe area.
// No UIScreen/keyboard-screenY subtraction, translated parent, or second KAV.
export default function NativeInputSheet({visible,ready=true,height,cap,dark,backgroundColor,onClose,onViewport,children}:SheetFrameProps){
 const [closing,setClosing]=useState(false),[expanded,setExpanded]=useState(false);
 // SwiftUI dismisses its keyboard together with the sheet. A separate RN
 // keyboard dismissal would resize the form in the middle of its exit.
 const close=useCallback(()=>setClosing(true),[]);
 const content=()=>children(v=>v,close);
 const large=height>=cap-2;
 return <>
  {!ready&&<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',left:0,right:0,height:cap,opacity:0}}>{content()}</View>}
  <Host pointerEvents="box-none" style={{position:'absolute',width:0,height:0}} colorScheme={dark?'dark':'light'}>
   <BottomSheet isPresented={visible&&ready&&!closing} onIsPresentedChange={value=>{if(!value)setClosing(true);}} onDismiss={onClose}>
    <Group modifiers={[frame({minWidth:0,maxWidth:Infinity,minHeight:0,maxHeight:Infinity,alignment:'bottom'}),presentationSizing('page'),presentationDetents(large?['large']:[{height},'large'],{selection:large||expanded?'large':{height},onSelectionChange:value=>setExpanded(value==='large')}),presentationDragIndicator('hidden'),presentationCornerRadius(null),presentationBackground(backgroundColor)]}>
     <RNHostView><View pointerEvents={closing?'none':'auto'} onLayout={e=>{recordViewport(e.nativeEvent.layout.height);onViewport(e.nativeEvent.layout.height);}} style={{flex:1,minHeight:0,backgroundColor}}>{content()}</View></RNHostView>
    </Group>
   </BottomSheet>
  </Host>
 </>;
}
