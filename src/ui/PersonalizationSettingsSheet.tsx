import React,{useState} from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import {Icon,Sheet,Tap,type IconName} from './components';
import {ThemeSheet} from './SettingsSheets';
import HomeLayoutSettings from './HomeLayoutSettings';
import {useTheme} from './theme';
export default function PersonalizationSettingsSheet({onClose}:{onClose:()=>void}){
  const [panel,setPanel]=useState<'theme'|'layout'|null>(null),t=useTheme();
  if(panel==='theme')return <ThemeSheet onClose={onClose}/>;
  if(panel==='layout')return <Sheet key="layout" visible title="首页排版" onClose={onClose}><HomeLayoutSettings/></Sheet>;
  const row=(name:string,description:string,icon:IconName,target:'theme'|'layout')=><Tap dismiss key={name} label={name} onPress={()=>setPanel(target)} style={{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14}}><Icon name={icon}/><View style={{flex:1,gap:7}}><Text style={{fontWeight:'600',color:t.fg,fontSize:16}}>{name}</Text><Text style={{color:t.muted,fontSize:12}}>{description}</Text></View><Icon name="chevron-forward" size={17}/></Tap>;
  return <Sheet key="appearance" visible title="外观" onClose={onClose}>
    {row('主题颜色','系统配色、浅色与深色主题','color-palette-outline','theme')}
    {row('首页排版','课程、作业和 To-do 的顺序与折叠','layers-outline','layout')}
  </Sheet>;
}
