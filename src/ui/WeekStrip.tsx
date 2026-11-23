import { regularTasksOn } from '../core/timetable';
import { allHomework, allHomeworkPreferences } from '../core/platforms';
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {Animated,Easing,FlatList,PanResponder,Platform,View,type NativeScrollEvent,type NativeSyntheticEvent} from 'react-native';
import Text from './LocalizedText';

import { addDays, dateKey, daysBetween, parseDate, tasksOn, WEEKDAYS, weekDates, weekStart } from '../core/calendar';
import { homeworkOn } from '../core/homework';
import type { AppData } from '../core/types';
import { builtIn2026 } from '../services/holidays';
import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Tap } from './components';
import DateNumber from './DateNumber';
import Reanimated,{useAnimatedStyle,type SharedValue} from 'react-native-reanimated';
import WeekPager from './WeekPager';

type Props = { previewDate?:SharedValue<string>;selected: string; today: string; onSelect: (date: string) => void;visibleWeek?:string;onWeekChange?:(date:string)=>void };
type PageProps = Props & { anchor: string; width: number; data: AppData; onHeight?: (height: number) => void };

const WeekPage = memo(function WeekPage({ anchor, width, selected, today, onSelect, data, onHeight,previewDate }: PageProps) {
  const t = useTheme(), { tasks, canvas, settings, holidays } = data;
  // Keep task projections out of the gesture path and selection renders.
  const days = useMemo(() => weekDates(parseDate(anchor), settings.weekStartsOn).map(day => {
    const key = dateKey(day), holiday = settings.holidayEnabled
      ? (holidays[key.slice(0, 4)] || (key.startsWith('2026-') ? builtIn2026 : undefined))?.days.find(h => h.date === key)
      : undefined;
    return { day, key, holiday, hasTask: tasksOn(regularTasksOn(data, key), key).length > 0 || homeworkOn(allHomework(data), key, settings, allHomeworkPreferences(data)).length > 0 };
  }), [anchor, tasks, data.timetables, canvas.assignments, canvas.preferences, data.haoke.assignments, data.haoke.preferences, data.zhixuemeng.assignments,data.zhixuemeng.preferences,settings.weekStartsOn, settings.holidayEnabled,
    settings.showHomeworkInTodo, settings.showDatedHomeworkByDefault, settings.showUndatedHomeworkByDefault, holidays]);
  return <View onLayout={onHeight ? event => onHeight(event.nativeEvent.layout.height) : undefined} style={{ width, flexDirection: 'row', paddingHorizontal: 19 }}>
    {days.map(({ day, key, holiday: h, hasTask }) => {
      const active = key === selected, isToday = key === today;
      return <Tap key={key} label={`${key}${isToday ? ' 今天' : ''}${h ? ` ${h.isOffDay ? '休息' : '补班'}` : ''}`} onPress={() => onSelect(key)} style={{ flex: 1, alignItems: 'center', gap: 9, paddingTop: 11, paddingBottom: 8, borderRadius: 19, backgroundColor: !previewDate&&active ? t.soft : 'transparent' }}>
        {previewDate&&<DateHighlight date={key} previewDate={previewDate} color={t.soft}/>}
        <Text style={{ fontSize: 9, fontWeight: '600', letterSpacing: .8, color: active ? t.accent : t.muted }}>{WEEKDAYS[day.getDay()]}</Text>
        <View testID={`date-number-${key}`} style={{ flexDirection: 'row', alignItems: 'flex-start' }}><DateNumber day={day.getDate()} bold={isToday||active} filled={hasTask} color={hasTask?(active||isToday?t.accent:key<today?t.muted:(t.dark?'#B4C8DE':'#A8BED6')):active||isToday?t.accent:t.muted}/>{h && <Text style={{ position: 'absolute', right: -6, top: -4, color: h.isOffDay ? '#B57060' : t.accent, fontSize: 8 }}>{h.isOffDay ? '休' : '班'}</Text>}</View>
      </Tap>;
    })}
  </View>;
});

export default function WeekStrip(props:Props){
  const {data}=useStore();
  return <View testID="week-strip" style={{marginTop:14,height:86,overflow:'hidden'}}>
    <WeekPager selected={props.visibleWeek||props.selected} startsOn={data.settings.weekStartsOn} onSelect={props.onWeekChange||(()=>{})} renderPage={(anchor,width)=><WeekPage {...props} anchor={anchor} width={width} data={data}/>}/>
  </View>;
}

function DateHighlight({date,previewDate,color}:{date:string;previewDate:SharedValue<string>;color:string}){
 const style=useAnimatedStyle(()=>({opacity:previewDate.value===date?1:0}));
 return <Reanimated.View testID={`date-highlight-${date}`} pointerEvents="none" style={[{position:'absolute',inset:0,borderRadius:19,backgroundColor:color},style]}/>;
}
