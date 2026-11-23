import React,{useState} from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';
import {clockTime,dateKey,durationBetween,taskEnd,validDate,validTime} from '../core/calendar';
import {Button,Icon,IconButton,type IconName} from './components';
import {useTheme} from './theme';
export function EditorFooter({onSave,onDelete,deleteLabel,saveLabel='保存更改'}:{onSave:()=>void;onDelete?:()=>void;deleteLabel?:string;saveLabel?:string}){
 return <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>{onDelete&&<IconButton icon="trash-outline" label={deleteLabel||'删除'} color="#BD5C5C" onPress={onDelete}/>}<View style={{flex:1}}><Button title={saveLabel} icon="checkmark" onPress={onSave}/></View></View>;
}
export function EditorTypeCard({icon,title,subtitle}:{icon:IconName;title:string;subtitle?:string}){
 const t=useTheme();return <View style={{flexDirection:'row',alignItems:'center',gap:10,padding:16,backgroundColor:t.soft,borderRadius:17}}><Icon name={icon} size={20} color={t.accent}/><View style={{flex:1,gap:5}}><Text style={{color:t.fg,fontSize:14,fontWeight:'600'}}>{title}</Text>{subtitle&&<Text style={{color:t.muted,fontSize:12}}>{subtitle}</Text>}</View></View>;
}
export function EditorSection({title,icon,children}:{title:string;icon:IconName;children:React.ReactNode}){
 const t=useTheme();return <View style={{gap:13,paddingVertical:4}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name={icon} size={18} color={t.accent}/><Text style={{color:t.fg,fontSize:14,fontWeight:'600'}}>{title}</Text></View>{children}</View>;
}
// A homework range is an availability window, not continuous busy time.
export function useEditorRange(start:Date,end:Date){
 const [startDate,setStartDate]=useState(dateKey(start)),[startTime,setStartTime]=useState(clockTime(start)),[endDate,setEndDate]=useState(dateKey(end)),[endTime,setEndTime]=useState(clockTime(end)),[duration,setDuration]=useState(String(Math.round((end.getTime()-start.getTime())/60000)));
 const syncEnd=(date:string,time:string,length:string)=>{
  if(!validDate(date)||!validTime(time)||!Number.isSafeInteger(Number(length))||Number(length)<1)return;
  const next=taskEnd({date,time,duration:Number(length)});if(!Number.isFinite(next.getTime())||!validDate(dateKey(next)))return;setEndDate(dateKey(next));setEndTime(clockTime(next));
 };
 const changeStartDate=(value:string)=>{setStartDate(value);syncEnd(value,startTime,duration);};
 const changeStartTime=(value:string)=>{setStartTime(value);syncEnd(startDate,value,duration);};
 const changeEnd=(date:string,time:string)=>{setEndDate(date);setEndTime(time);if(validDate(startDate)&&validTime(startTime)&&validDate(date)&&validTime(time))setDuration(String(durationBetween(startDate,startTime,date,time)));};
 const changeDuration=(value:string)=>{setDuration(value);syncEnd(startDate,startTime,value);};
 return {startDate,startTime,endDate,endTime,duration,changeStartDate,changeStartTime,changeEnd,changeDuration};
}
