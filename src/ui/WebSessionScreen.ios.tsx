import React from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import NativeInputSheet from './NativeInputSheet.ios';
import Text from './LocalizedText';
import CloseButton from './CloseButton';
import {useTheme} from './theme';
import useSheetWindowDimensions from './useSheetWindowDimensions';
import WebSessionCloseBinding from './WebSessionCloseBinding';
export default function WebSessionScreen({title,hint,message,onClose,children,footer,dismissRef,onCloseRequest}:{title:string;hint:string;message?:string;onClose:()=>void;children:React.ReactNode;footer:React.ReactNode;dismissRef?:React.RefObject<(()=>void)|null>;onCloseRequest?:()=>void}){
 const t=useTheme(),insets=useSafeAreaInsets(),screen=useSheetWindowDimensions(),cap=screen.height-Math.max(insets.top,12);
 return <NativeInputSheet visible ready height={cap} cap={cap} backgroundColor={t.bg} dark={t.dark} onClose={onClose} onViewport={()=>{}}>{(_header,close)=><WebSessionCloseBinding close={close} closeRef={dismissRef}><View testID="web-session-viewport" style={{flex:1,minHeight:0,backgroundColor:t.bg}}>
  <View style={{paddingHorizontal:16,paddingVertical:10,gap:6}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontSize:20,fontWeight:'700',color:t.fg}}>{title}</Text><CloseButton onPress={onCloseRequest||close}/></View><Text style={{fontSize:12,lineHeight:18,color:t.muted}}>{hint}</Text>{!!message&&<Text style={{fontSize:12,color:t.muted}}>{message}</Text>}</View>
  <View testID="official-web-content" style={{flex:1,minHeight:0}}>{children}</View>
  <View style={{paddingHorizontal:12,paddingTop:8,paddingBottom:8,gap:8,backgroundColor:t.bg}}>{footer}</View>
 </View></WebSessionCloseBinding>}</NativeInputSheet>;
}
