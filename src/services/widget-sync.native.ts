import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import {widgetsDirectory} from 'expo-widgets';
import Widget from '../widgets/AgendaWidget';
import type {AppData} from '../core/types';
import {widgetTimeline,sameWidgetView} from '../core/widget-agenda';
export async function syncAgendaWidget(data:AppData){
  const entries=widgetTimeline(data);
  if(Platform.OS==='ios'){
    if(!widgetsDirectory)throw new Error('桌面小组件无法共享日程，请检查安装包的小组件共享权限。');
    Widget.updateTimeline(entries);
    const saved=await Widget.getTimeline();
    if(saved.length!==entries.length||saved[0]?.date.getTime()!==entries[0]?.date.getTime()||!sameWidgetView(saved[0]?.props,entries[0]?.props))throw new Error('桌面小组件日程未写入，请重新打开 App。');
  }
  else {
    Widget.updateSnapshot({entries:entries.map(e=>({timestamp:e.date.getTime(),view:e.props}))} as any);
    requireOptionalNativeModule('AgendaRefresh')?.schedule(entries.map(e=>e.date.getTime()));
  }
}
