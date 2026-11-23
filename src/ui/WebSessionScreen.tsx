import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Modal,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import Text from './LocalizedText';
import CloseButton from './CloseButton';
import {useTheme} from './theme';

// WKWebView owns keyboard scrolling/insets. Keep its native frame stable;
// neither the measured sheet nor KeyboardAvoidingView may shrink it again.
export default function WebSessionScreen(props:{title:string;hint:string;message?:string;onClose:()=>void;children:React.ReactNode;footer:React.ReactNode;dismissRef?:React.RefObject<(()=>void)|null>;onCloseRequest?:()=>void}){
 const [closing,setClosing]=useState(false),latest=useRef(props.onClose);latest.current=props.onClose;
 const close=useCallback(()=>setClosing(true),[]);
 useLayoutEffect(()=>{if(props.dismissRef)props.dismissRef.current=close;return()=>{if(props.dismissRef?.current===close)props.dismissRef.current=null;};},[props.dismissRef,close]);
 useEffect(()=>{if(!closing)return;const timer=setTimeout(()=>latest.current(),400);return()=>clearTimeout(timer);},[closing]);
 const requestClose=props.onCloseRequest||props.onClose;
 return <Modal visible={!closing} animationType="slide" presentationStyle="fullScreen" onRequestClose={requestClose}><SafeAreaProvider><WebSessionContent {...props} onClose={requestClose}/></SafeAreaProvider></Modal>;
}
function WebSessionContent({title,hint,message,onClose,children,footer}:React.ComponentProps<typeof WebSessionScreen>){
 const t=useTheme(),insets=useSafeAreaInsets();
 return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:t.bg}}>
  <View testID="web-session-viewport" style={{flex:1}}>
   <View style={{paddingHorizontal:16,paddingVertical:8,gap:6}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontSize:20,fontWeight:'700',color:t.fg}}>{title}</Text><CloseButton onPress={onClose}/></View><Text style={{fontSize:12,color:t.muted,lineHeight:18}}>{hint}</Text>{!!message&&<Text style={{fontSize:12,color:t.muted}}>{message}</Text>}</View>
   <View testID="official-web-content" style={{flex:1,minHeight:0,overflow:'hidden'}}>{children}</View>
   <View style={{paddingHorizontal:12,paddingTop:8,paddingBottom:Math.max(12,insets.bottom),gap:8,backgroundColor:t.bg}}>{footer}</View>
  </View>
 </SafeAreaView>;
}
