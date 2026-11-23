import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {FlatList,View} from 'react-native';
import Animated,{useAnimatedScrollHandler,useSharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
const AnimatedList=Animated.createAnimatedComponent(FlatList<number>);
import {addDays,dateKey,daysBetween,parseDate,weekStart} from '../core/calendar';
import type {WeekPagerProps} from './WeekPager';
const RADIUS=104,OFFSETS=Array.from({length:RADIUS*2+1},(_,i)=>i-RADIUS);
export default function WeekPager(props:WeekPagerProps){
  const [size,setSize]=useState({width:0,height:0}),{width,height}=size,step=props.step||7,anchor=step===1?props.selected:dateKey(weekStart(parseDate(props.selected),props.startsOn)),[origin,setOrigin]=useState(anchor);
  const base=step===1?origin:dateKey(weekStart(parseDate(origin),props.startsOn)),index=RADIUS+daysBetween(parseDate(base),parseDate(anchor))/step;
  useLayoutEffect(()=>{if(index<1||index>=OFFSETS.length-1)setOrigin(anchor);},[index,anchor]);
  return <View testID="schedule-week-pager" onLayout={e=>{const n=e.nativeEvent.layout;setSize(old=>old.width===n.width&&old.height===n.height?old:{width:n.width,height:n.height});}} style={{flex:1}}>{width>0&&height>0&&<Pages key={`${base}:${width}:${height}`} {...props} anchor={base} width={width} height={height}/>}</View>;
}
function Pages({anchor,width,height,...props}:WeekPagerProps&{anchor:string;width:number;height:number}){
  const step=props.step||7,selectedAnchor=step===1?props.selected:dateKey(weekStart(parseDate(props.selected),props.startsOn)),selectedIndex=RADIUS+daysBetween(parseDate(anchor),parseDate(selectedAnchor))/step;
  const initial=Math.max(0,Math.min(OFFSETS.length-1,selectedIndex)),list=useRef<FlatList<number>>(null),settled=useRef(initial),gesture=useRef(false),momentum=useRef(false),lastX=useRef(initial*width);
  const notify=useCallback((date:string)=>current.current.onPreviewDate?.(date),[]);
  const scrolling=useSharedValue(false),scrollX=useSharedValue(initial*width),dates=OFFSETS.map(n=>dateKey(addDays(parseDate(anchor),n*step))),preview=props.previewDate;
  const onScroll=useAnimatedScrollHandler(event=>{scrollX.value=event.contentOffset.x;if(preview&&scrolling.value){const page=Math.max(0,Math.min(dates.length-1,Math.round(event.contentOffset.x/width)));const day=dates[page]!;if(preview.value!==day){preview.value=day;scheduleOnRN(notify,day);}}});
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),current=useRef(props);current.current=props;
  const clear=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=undefined;},[]);useEffect(()=>clear,[clear]);
  useLayoutEffect(()=>{if(selectedIndex===settled.current||selectedIndex<0||selectedIndex>=OFFSETS.length)return;clear();gesture.current=false;scrolling.value=false;momentum.current=false;const animated=Math.abs(selectedIndex-settled.current)<=2;settled.current=selectedIndex;lastX.current=selectedIndex*width;list.current?.scrollToOffset({offset:lastX.current,animated});},[selectedIndex,width,clear]);
  const finish=useCallback((x:number)=>{clear();if(!gesture.current)return;gesture.current=false;scrolling.value=false;const page=Math.max(0,Math.min(OFFSETS.length-1,Math.round(x/width)));settled.current=page;const s=current.current,d=parseDate(s.selected),day=step===1?0:daysBetween(weekStart(d,s.startsOn),d),next=dateKey(addDays(parseDate(anchor),(page-RADIUS)*step+day));if(next!==s.selected)s.onSelect(next);},[anchor,width,clear,step]);
  return <AnimatedList ref={list} testID={step===1?"native-day-pager":"native-schedule-week-pager"} data={OFFSETS} horizontal pagingEnabled initialScrollIndex={initial} getItemLayout={(_,i)=>({length:width,offset:i*width,index:i})} keyExtractor={n=>dateKey(addDays(parseDate(anchor),n*step))} renderItem={({item})=>{const day=dateKey(addDays(parseDate(anchor),item*step)),active=day===selectedAnchor;return <View accessibilityElementsHidden={!active} importantForAccessibility={active?'auto':'no-hide-descendants'} style={{width,height}}>{props.renderPage(day,width)}</View>;}} extraData={props} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3} removeClippedSubviews={false} showsHorizontalScrollIndicator={false} bounces={false} directionalLockEnabled decelerationRate="fast" disableIntervalMomentum snapToInterval={width} snapToAlignment="start" contentInsetAdjustmentBehavior="never" style={{flex:1}} scrollEventThrottle={16} onScroll={onScroll} onScrollBeginDrag={()=>{scrolling.value=true;clear();gesture.current=true;momentum.current=false;}} onScrollEndDrag={()=>{clear();timer.current=setTimeout(()=>{if(!momentum.current)finish(scrollX.value);},180);}} onMomentumScrollBegin={()=>{clear();momentum.current=true;}} onMomentumScrollEnd={e=>{momentum.current=false;lastX.current=e.nativeEvent.contentOffset.x;finish(lastX.current);}}/>;
}
