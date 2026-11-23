import React from 'react';
import {Platform} from 'react-native';
import {Host,Button,Image} from '@expo/ui/swift-ui';
import {buttonStyle,buttonBorderShape,controlSize,font,tint,accessibilityLabel} from '@expo/ui/swift-ui/modifiers';
import {useTheme} from './theme';
import {useT} from './LocaleContext';
export default function CloseButton({onPress,label='关闭'}:{onPress:()=>void;label?:string}) {
  const t=useTheme(),txt=useT();
  // Supply the SF Symbol explicitly: role="close" can render the word "Close".
  // Let the native large control size its visible circle, not an outer frame.
  return <Host matchContents alignment="center" style={{minWidth:52,minHeight:52,flexShrink:0}} colorScheme={t.dark?'dark':'light'}><Button onPress={onPress} modifiers={[buttonStyle(Number.parseInt(String(Platform.Version),10)>=26?'glass':'bordered'),buttonBorderShape('circle'),controlSize('large'),tint(t.fg),accessibilityLabel(txt(label))]}><Image systemName="xmark" color={t.fg} modifiers={[font({size:24,weight:'medium'})]}/></Button></Host>;
}
