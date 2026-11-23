import {Column,Row,Text} from '@expo/ui/jetpack-compose';
import {background,fillMaxSize,paddingAll} from '@expo/ui/jetpack-compose/modifiers';
import {createWidget,type WidgetEnvironment} from 'expo-widgets';
import type {WidgetView} from '../core/widget-agenda';
export interface AndroidAgendaProps {entries:{timestamp:number;view:WidgetView}[]}
const Agenda=(props:AndroidAgendaProps,environment:WidgetEnvironment)=>{
  'widget';
  const now=Date.now(),entry=[...(props.entries||[])].reverse().find(e=>e.timestamp<=now),view=entry?.view;
  const fg=environment.colorScheme==='dark'?'#F2F6FC':'#123B64';
  return <Column modifiers={[fillMaxSize(),background(environment.colorScheme==='dark'?'#111D2D':'#FFFFFF'),paddingAll(16)]} verticalArrangement={{spacedBy:10}}>
    <Text style={{fontSize:20,fontWeight:"bold"}} color={fg}>{view?.header||'TJMuse'}</Text><Text style={{fontSize:12}} color={fg}>{view?.date||''}</Text>
    {(view?.rows||[]).map(row=><Column key={row.id}><Text style={{fontSize:14,fontWeight:"600"}} maxLines={1} color={fg}>{row.title}</Text><Text style={{fontSize:11}} maxLines={1} color={fg}>{row.time} · {row.detail}</Text></Column>)}
    {!view?.rows?.length&&<Text style={{fontSize:13}} color={fg}>{view?.empty||'Open TJMuse to sync your day'}</Text>}{!!view?.more&&<Text style={{fontSize:11}} color={fg}>{view.more}</Text>}
  </Column>;
};
export default createWidget<AndroidAgendaProps>('DailyAgenda',Agenda,{entries:[]});
