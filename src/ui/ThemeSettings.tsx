import React, { useState } from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { useTheme } from './theme';
import { DARK_PALETTE, LIGHT_PALETTE, validHex, isDark } from '../core/theme';
import { ACCENTS, BACKGROUNDS, FOREGROUNDS } from '../core/defaults';
import { Button, Field, Hint, Icon, Pill, Sheet, Tap } from './components';
import {useSheetDismiss} from './useSheetDismiss';
export default function ThemeSettings({onClose}:{onClose:()=>void}) {
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const {data,updateSettings}=useStore(),t=useTheme();
  const [mode,setMode]=useState(data.settings.themeMode),[editing,setEditing]=useState<'light'|'dark'>(t.mode),[palettes,setPalettes]=useState({light:{...data.settings.themePalettes.light},dark:{...data.settings.themePalettes.dark}}),[error,setError]=useState('');
  const current=palettes[editing],patch=(key:keyof typeof current,value:string)=>setPalettes(v=>({...v,[editing]:{...v[editing],[key]:value}}));
  const swatches=(colors:string[],key:keyof typeof current)=><View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}>{colors.map(c=><Tap key={c} label={`选择${editing==='dark'?'深色':'浅色'}${key==='foreground'?'前景':key==='background'?'背景':'强调'} ${c}`} onPress={()=>patch(key,c)} style={{width:34,height:34,borderRadius:12,backgroundColor:c,borderWidth:1,borderColor:t.line,alignItems:'center',justifyContent:'center'}}>{current[key]===c&&<Icon name="checkmark" size={18} color={isDark(c)?'#FFFFFF':'#123B64'} />}</Tap>)}</View>;
  const apply=()=>{
    for(const palette of Object.values(palettes)) {
      if(!Object.values(palette).every(validHex))return setError('颜色请使用 #RRGGBB 格式。');
      if(isDark(palette.foreground)===isDark(palette.background))return setError('前景与背景请选择一深一浅的颜色。');
    }
    const selected=palettes[mode==='system'?t.mode:mode];
    dismiss(()=>{updateSettings({themeMode:mode,themePalettes:palettes,...selected});onClose();});
  };
  return <Sheet visible closeRef={closeRef} size="large" title="外观与颜色" onClose={onClose} footer={<Button title="应用主题" onPress={apply} />}>
    <Text style={{color:t.fg,fontWeight:'600'}}>颜色模式</Text><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{([['system','跟随系统'],['light','浅色模式'],['dark','深色模式']] as const).map(([value,label])=><Pill key={value} title={label} selected={mode===value} onPress={()=>{setMode(value);if(value!=='system')setEditing(value);}} />)}</View>
    <Hint>跟随系统时，手机切换浅色或深色，TJMuse 会同步适配。两套配色分别保存。</Hint>
    <View style={{flexDirection:'row',gap:7}}><Pill title="编辑浅色配色" selected={editing==='light'} onPress={()=>setEditing('light')} /><Pill title="编辑深色配色" selected={editing==='dark'} onPress={()=>setEditing('dark')} /></View>
    <View testID="theme-color-preview" style={{padding:22,borderRadius:22,borderWidth:1,borderColor:validHex(current.accent)?current.accent:t.line,backgroundColor:validHex(current.background)?current.background:t.bg,boxShadow:editing==='dark'&&validHex(current.accent)?`0px 0px 20px ${current.accent}55`:'none',gap:12}}><Text style={{color:validHex(current.foreground)?current.foreground:t.fg,fontSize:23,fontWeight:'700'}}>A day, in your color.</Text><Text style={{color:validHex(current.accent)?current.accent:t.accent,fontWeight:'600'}}>每一天，都有自己的颜色。</Text></View>
    <Field label="前景色" value={current.foreground} onChangeText={v=>patch('foreground',v)} maxLength={7} autoCapitalize="none" />{swatches(FOREGROUNDS,'foreground')}
    <Field label="背景色" value={current.background} onChangeText={v=>patch('background',v)} maxLength={7} autoCapitalize="none" />{swatches(BACKGROUNDS,'background')}
    <Field label="强调色" value={current.accent} onChangeText={v=>patch('accent',v)} maxLength={7} autoCapitalize="none" />{swatches(ACCENTS,'accent')}
    <Button title="恢复同济蓝配色" secondary onPress={()=>{setPalettes({light:{...LIGHT_PALETTE},dark:{...DARK_PALETTE}});setError('');}} />
    <Hint>深色模式为强调按钮、图标和卡片提供柔和发光效果。</Hint>{!!error&&<Hint error>{error}</Hint>}
  </Sheet>;
}
