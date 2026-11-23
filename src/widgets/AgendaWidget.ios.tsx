import {HStack,Text,VStack,Spacer} from '@expo/ui/swift-ui';
import {containerBackground,font,foregroundStyle,lineLimit,frame,widgetURL} from '@expo/ui/swift-ui/modifiers';
import {createWidget,type WidgetEnvironment} from 'expo-widgets';
import type {WidgetView} from '../core/widget-agenda';
const Agenda=(props:WidgetView,environment:WidgetEnvironment)=>{
  'widget';
  const fg=environment.colorScheme==='dark'?'#F2F6FC':'#123B64',muted=environment.colorScheme==='dark'?'#B7CDE5':'#61788D';
  return <VStack alignment="leading" spacing={10} modifiers={[containerBackground(environment.colorScheme==='dark'?'#111D2D':'#FFFFFF','widget'),widgetURL('tjmuse://')]}>
    <Text modifiers={[font({size:19,weight:'bold'}),foregroundStyle(fg)]}>{props.header||'TJMuse'}</Text><Text modifiers={[font({size:12}),foregroundStyle(muted)]}>{props.date||'TJMuse'}</Text>
    {(props.rows||[]).map(row=><HStack key={row.id} spacing={8}><VStack alignment="leading" spacing={2}><Text modifiers={[font({size:13,weight:'semibold'}),foregroundStyle(fg),lineLimit(1)]}>{row.title}</Text><Text modifiers={[font({size:10}),foregroundStyle(muted),lineLimit(1)]}>{row.detail}</Text></VStack><Spacer/><Text modifiers={[font({size:10}),foregroundStyle(muted)]}>{row.time}</Text></HStack>)}
    {!props.rows?.length&&<Text modifiers={[font({size:14}),foregroundStyle(muted)]}>{props.empty||'Open TJMuse to sync your day'}</Text>}<Spacer/>{!!props.more&&<Text modifiers={[font({size:11}),foregroundStyle(muted)]}>{props.more}</Text>}
  </VStack>;
};
export default createWidget<WidgetView>('DailyAgenda',Agenda,{header:'TJMuse',date:'',empty:'Open TJMuse to sync your day',more:'',rows:[]});
