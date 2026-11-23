import React,{useCallback,useEffect} from 'react';
import {AccessibilityInfo,Platform,View} from 'react-native';
import Text from './LocalizedText';

import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{ReduceMotion,useAnimatedReaction,useAnimatedStyle,useSharedValue,withSpring,withTiming,type SharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import type {TaskCategory} from '../core/types';
import {DEFAULT_CATEGORY_ORDER,moveCategory,normalizeCategoryOrder} from '../core/category-order';
import {CATEGORY_NAMES} from '../core/home-layout';
import {Icon,type IconName} from './components';
import {useTheme} from './theme';

const HEIGHT=72,SPRING={damping:25,stiffness:280,mass:.8,reduceMotion:ReduceMotion.System};
const ICONS:Record<TaskCategory,IconName>={todo:'checkbox-outline',course:'calendar-outline',homework:'book-outline'};
const haptic=()=>{if(Platform.OS!=='web')void Haptics.selectionAsync().catch(()=>{});};
type Motion={positions:SharedValue<TaskCategory[]>;active:SharedValue<TaskCategory|null>;dragY:SharedValue<number>;original:SharedValue<TaskCategory[]>};

function CategoryRow({category,order,motion,commit}:{category:TaskCategory;order:TaskCategory[];motion:Motion;commit:(order:TaskCategory[])=>void}){
  const t=useTheme(),{positions,active,dragY,original}=motion;
  const rowY=useSharedValue(order.indexOf(category)*HEIGHT),start=useSharedValue(0),finger=useSharedValue(0);
  useAnimatedReaction(()=>positions.value.indexOf(category),index=>{rowY.value=withSpring(index*HEIGHT,SPRING);});
  const pan=Gesture.Pan().minDistance(4).maxPointers(1)
    .onStart(e=>{
      original.value=[...positions.value];active.value=category;
      start.value=positions.value.indexOf(category)*HEIGHT;finger.value=e.absoluteY;dragY.value=start.value;scheduleOnRN(haptic);
    })
    .onUpdate(e=>{
      const y=Math.max(0,Math.min((positions.value.length-1)*HEIGHT,start.value+e.absoluteY-finger.value));dragY.value=y;
      const from=positions.value.indexOf(category),to=Math.round(y/HEIGHT);
      if(from!==to)positions.value=moveCategory(positions.value,from,to);
    })
    .onEnd((_e,success)=>{
      if(!success)return;
      rowY.value=dragY.value;rowY.value=withSpring(positions.value.indexOf(category)*HEIGHT,SPRING);active.value=null;
      scheduleOnRN(commit,[...positions.value]);scheduleOnRN(haptic);
    })
    .onFinalize((_e,success)=>{
      if(!success&&active.value===category){positions.value=[...original.value];rowY.value=dragY.value;rowY.value=withSpring(positions.value.indexOf(category)*HEIGHT,SPRING);active.value=null;}
    });
  const style=useAnimatedStyle(()=>({
    zIndex:active.value===category?5:1,
    transform:[{translateY:active.value===category?dragY.value:rowY.value},{scale:withTiming(active.value===category?1.025:1,{duration:130,reduceMotion:ReduceMotion.System})}],
    shadowOpacity:withTiming(active.value===category?.18:0,{duration:130,reduceMotion:ReduceMotion.System}),
  }));
  const adjust=(direction:number)=>{if(active.value!==null)return;const from=order.indexOf(category),to=from+direction;if(to>=0&&to<order.length)commit(moveCategory(order,from,to));};
  const keyboard:React.ComponentProps<typeof View>=Platform.OS==='web'?{onKeyDown:event=>{const key=(event.nativeEvent as unknown as {key?:string}).key;if(key==='ArrowUp'||key==='ArrowDown'){event.preventDefault();adjust(key==='ArrowUp'?-1:1);}}}:{};
  return <Animated.View testID={`category-order-row-${category}`} style={[{position:'absolute',left:0,right:0,height:HEIGHT,borderRadius:20,backgroundColor:t.surface,shadowColor:'#000000',shadowRadius:12,shadowOffset:{width:0,height:5}},style]}>
    <View style={{height:HEIGHT,flexDirection:'row',alignItems:'center',paddingLeft:17,gap:13}}>
      <View style={{width:34,height:34,borderRadius:11,backgroundColor:t.soft,alignItems:'center',justifyContent:'center'}}><Icon name={ICONS[category]} color={t.accent} size={19}/></View>
      <Text style={{flex:1,color:t.fg,fontSize:16,fontWeight:'500'}} maxFontSizeMultiplier={1.4}>{CATEGORY_NAMES[category]}</Text>
      <GestureDetector gesture={pan} touchAction="none">
        <View testID={`category-order-handle-${category}`} accessible accessibilityRole="adjustable" accessibilityLabel={`调整${CATEGORY_NAMES[category]}顺序`} accessibilityHint="上下拖动调整顺序，或使用增减操作。" accessibilityValue={{min:1,max:3,now:order.indexOf(category)+1,text:`第 ${order.indexOf(category)+1} 项，共 3 项`}} accessibilityActions={[{name:'increment',label:'向下移动'},{name:'decrement',label:'向上移动'}]} onAccessibilityAction={e=>adjust(e.nativeEvent.actionName==='increment'?1:-1)} tabIndex={0} {...keyboard} style={{width:56,height:HEIGHT,alignItems:'center',justifyContent:'center'}}>
          <Icon name="reorder-three-outline" color={t.muted} size={27}/>
        </View>
      </GestureDetector>
    </View>
    {order.indexOf(category)<2&&<View pointerEvents="none" style={{position:'absolute',left:64,right:16,bottom:0,height:1,backgroundColor:t.line}}/>}
  </Animated.View>;
}

export default function CategoryOrderList({value,onChange}:{value:TaskCategory[];onChange:(order:TaskCategory[])=>void}){
  const t=useTheme(),order=normalizeCategoryOrder(value),positions=useSharedValue(order),active=useSharedValue<TaskCategory|null>(null),dragY=useSharedValue(0),original=useSharedValue(order);
  const signature=order.join(',');
  useEffect(()=>{if(active.value===null)positions.value=normalizeCategoryOrder(value);},[signature,active,positions]);
  const commit=useCallback((next:TaskCategory[])=>{
    const ordered=normalizeCategoryOrder(next);positions.value=ordered;onChange(ordered);
    AccessibilityInfo.announceForAccessibility(`分类顺序：${ordered.map(c=>CATEGORY_NAMES[c]).join('、')}`);
  },[onChange,positions]);
  return <View testID="category-order-list" style={{height:HEIGHT*DEFAULT_CATEGORY_ORDER.length+2,flexShrink:0,borderRadius:22,borderWidth:1,borderColor:t.line,backgroundColor:t.surface}}>
    {order.map(category=><CategoryRow key={category} category={category} order={order} motion={{positions,active,dragY,original}} commit={commit}/>)}
  </View>;
}
