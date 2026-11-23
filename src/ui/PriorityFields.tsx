import React from 'react';
import {Switch,View} from 'react-native';
import Text from './LocalizedText';
import {Hint} from './components';
import {useTheme} from './theme';
import {priorityLabel} from '../core/task-priority';

export default function PriorityFields({important,urgent,onImportant,onUrgent}:{important:boolean;urgent:boolean;onImportant:(value:boolean)=>void;onUrgent:(value:boolean)=>void}){
  const t=useTheme();
  return <View style={{gap:12}}>
    {([['重要',important,onImportant],['紧急',urgent,onUrgent]] as const).map(([label,value,onChange])=><View key={label} style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,color:t.fg,fontSize:14}}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{false:t.line,true:t.accent}}/></View>)}
    <Hint>{priorityLabel({important,urgent})}</Hint>
  </View>;
}
