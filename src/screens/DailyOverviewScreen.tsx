import React from 'react';
import {ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import Animated,{FadeIn,FadeInDown,useReducedMotion} from 'react-native-reanimated';
import Text from '../ui/LocalizedText';
import OnboardingAura from '../ui/OnboardingAura';
import {useStore} from '../state/store';
import {dateKey,semesterWeek} from '../core/calendar';
import {dailyOverviewTasks,taskCategory,CATEGORY_NAMES} from '../core/home-layout';
import {DAILY_GREETINGS} from '../core/daily-greetings';
import {Tap} from '../ui/components';
import {useLanguage} from '../ui/LocaleContext';
export default function DailyOverviewScreen({onClose,greeting=0}:{onClose:()=>void;greeting?:number}){
  const {data}=useStore(),now=new Date(),day=dateKey(now),tasks=dailyOverviewTasks(data,day,now),reduce=useReducedMotion(),language=useLanguage();
  const week=semesterWeek(now,data.settings.semesterStartDate,data.settings.weekStartsOn);
  return <Animated.View testID="daily-overview" entering={reduce?undefined:FadeIn.duration(400)} style={{position:'absolute',inset:0,zIndex:50,backgroundColor:'#123B64'}}>
    <StatusBar style="light"/><OnboardingAura/>
    <SafeAreaView style={{flex:1}}>
      <View style={{paddingHorizontal:26,paddingTop:24,paddingBottom:18,gap:10}}>
        <Text style={{color:'#D9ECFF',fontSize:11,letterSpacing:3,textAlign:'center'}}>TJMUSE · TODAY</Text>
        <Text testID="daily-opening-line" style={{fontSize:34,fontWeight:'800',color:'#FFFFFF',lineHeight:44,textAlign:'center'}}>{DAILY_GREETINGS[greeting]||DAILY_GREETINGS[0]}</Text>
        <View style={{flexDirection:'row',gap:8,justifyContent:'center'}}>{!!week&&<Text style={{color:'#E1EEFA',fontSize:12}}>{`第 ${week} 周`}</Text>}<Text translate={false} style={{color:'#E1EEFA',fontSize:12}}>{now.toLocaleDateString(language,{weekday:'long',month:'long',day:'numeric'})}</Text></View>
      </View>
      <ScrollView testID="daily-agenda-scroll" style={{flex:1}} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{paddingHorizontal:24,paddingBottom:16}}>
        <Animated.View entering={reduce?undefined:FadeInDown.delay(120).duration(400)} style={{gap:5}}>
          {tasks.map(task=><View testID="daily-agenda-row" key={`${task.id}:${task.occurrenceDate}`} style={{paddingHorizontal:12,paddingVertical:7,minHeight:50,borderWidth:1,borderColor:'#FFFFFF38',borderRadius:12,backgroundColor:'#082B5938',gap:2}}>
            <Text testID="daily-task-title" translate={false} numberOfLines={1} style={{color:'#FFFFFF',fontWeight:'700',fontSize:17,lineHeight:23}}>{task.title}</Text>
            <View style={{flexDirection:'row',gap:6,alignItems:'center'}}><Text style={{color:'#D5E9FF',fontSize:9,lineHeight:12}}>{CATEGORY_NAMES[taskCategory(task)]}</Text><Text translate={false} numberOfLines={1} style={{flex:1,color:'#E1EEFA',fontSize:9,lineHeight:12}}>{task.homeworkId?(task.homeworkDueAt?`${task.endDate} ${task.endTime}`:'—'):`${task.dayStartTime}–${task.dayEndTime}`}{task.location?` · ${task.location}`:''}</Text></View>
          </View>)}
          {!tasks.length&&<View style={{paddingVertical:30}}><Text style={{color:'#FFFFFF',fontSize:15,lineHeight:26}}>今天暂无安排，留一点空间给自己。</Text></View>}
        </Animated.View>
      </ScrollView>
      <View testID="daily-overview-footer" style={{paddingHorizontal:27,paddingTop:16,paddingBottom:20}}><Tap label="开始今天" onPress={onClose} style={{backgroundColor:'#FFFFFF',minHeight:58,borderRadius:21,paddingHorizontal:20,paddingVertical:18,alignItems:'center',justifyContent:'center'}}><Text testID="daily-white-button-text" style={{color:'#123B64',fontWeight:'700',fontSize:16}}>开始今天</Text></Tap></View>
    </SafeAreaView>
  </Animated.View>;
}
