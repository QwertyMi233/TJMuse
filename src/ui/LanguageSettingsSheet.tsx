import React from 'react';
import {View} from 'react-native';
import {LANGUAGES,LANGUAGE_NAMES} from '../core/locales';
import {useStore} from '../state/store';
import {useTheme} from './theme';
import {Icon,Sheet,Tap} from './components';
import Text from './LocalizedText';
export default function LanguageSettingsSheet({onClose}:{onClose:()=>void}){
 const {data,updateSettings}=useStore(),t=useTheme();
 return <Sheet visible title="语言" onClose={onClose}>{(['system',...LANGUAGES] as const).map(language=><Tap key={language} label={language==='system'?'跟随系统':LANGUAGE_NAMES[language]} onPress={()=>updateSettings({language})} style={{paddingVertical:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:t.line}}><Text style={{color:t.fg,fontSize:16}}>{language==='system'?'跟随系统':LANGUAGE_NAMES[language]}</Text>{data.settings.language===language&&<Icon name="checkmark" color={t.accent}/>}</Tap>)}</Sheet>;
}
