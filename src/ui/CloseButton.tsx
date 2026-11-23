import React from 'react';
import {Platform,Pressable} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useTheme} from './theme';
import {useT} from './LocaleContext';
export default function CloseButton({onPress,label='关闭'}:{onPress:()=>void;label?:string}) {
  const t=useTheme(),txt=useT();
  const size=Platform.OS==='web'?52:48;
  return <Pressable accessibilityRole="button" accessibilityLabel={txt(label)} onPress={onPress} hitSlop={8} style={{width:size,height:size,flexShrink:0,alignItems:'center',justifyContent:'center',borderRadius:size/2,backgroundColor:t.soft}}><Ionicons name="close" size={26} color={t.fg}/></Pressable>;
}
