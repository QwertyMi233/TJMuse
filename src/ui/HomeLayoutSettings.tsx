import React from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Hint, Pill } from './components';
import CategoryOrderList from './CategoryOrderList';
export default function HomeLayoutSettings() {
  const {data,updateSettings}=useStore(),t=useTheme();
  return <View style={{gap:18}}><Text style={{color:t.fg,fontWeight:'600'}}>课程、作业与 To-do</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Pill title="按时间穿插" selected={data.settings.homeLayout==='timeline'} onPress={()=>updateSettings({homeLayout:'timeline'})} /><Pill title="按分类显示" selected={data.settings.homeLayout==='grouped'} onPress={()=>updateSettings({homeLayout:'grouped'})} /></View><Hint>按时间穿插会将全部事项按当天时间排序。分类显示时，每个分类和其中已勾选的任务都可以单独折叠。</Hint>
    <Text style={{color:t.fg,fontSize:15,fontWeight:'600'}}>分类顺序</Text>
    <CategoryOrderList value={data.settings.homeCategoryOrder} onChange={homeCategoryOrder=>updateSettings({homeCategoryOrder})}/>
    <Hint>拖动右侧三横线调整，松手后自动保存。默认 To-do、课程、作业；在“按分类显示”时应用，按时间穿插仍按时间排序。</Hint>
  </View>;
}
