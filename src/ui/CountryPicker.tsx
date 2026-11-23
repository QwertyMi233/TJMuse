import React,{useMemo,useRef,useState} from 'react';
import {FlatList,Modal,PanResponder,View} from 'react-native';
import Text from './LocalizedText';
import TextInput from './LocalizedTextInput';

import {SafeAreaView} from 'react-native-safe-area-context';
import {countryRows} from '../core/countries';
import {useLanguage} from './LocaleContext';
import {useTheme} from './theme';
import {Icon,IconButton,Tap} from './components';
import CloseButton from './CloseButton';
export default function CountryPicker({value,onChange,onClose}:{value?:string;onChange:(code:string)=>void;onClose:()=>void}){
 const t=useTheme(),language=useLanguage(),[query,setQuery]=useState(''),[letter,setLetter]=useState('');
 const rows=useMemo(()=>countryRows(language,query),[language,query]),list=useRef<FlatList<(typeof rows)[number]>>(null),rail=useRef<React.ComponentRef<typeof View>>(null),railBox=useRef({top:0,height:1});
 const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),latest=useRef({letters,rows});latest.current={letters,rows};
 const jump=(y:number)=>{const {letters,rows}=latest.current,n=Math.max(0,Math.min(letters.length-1,Math.floor((y-railBox.current.top)/railBox.current.height*letters.length))),letter=letters[n];if(!letter)return;setLetter(letter);let index=rows.findIndex(r=>!r.code&&r.letter>=letter);if(index<0)index=rows.findLastIndex(r=>!r.code);if(index>=0)list.current?.scrollToIndex({index,animated:false});};
 const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:e=>{rail.current?.measureInWindow((_x,y,_w,h)=>{railBox.current={top:y,height:h};jump(e.nativeEvent.pageY);});},onPanResponderMove:e=>jump(e.nativeEvent.pageY),onPanResponderRelease:()=>setLetter(''),onPanResponderTerminate:()=>setLetter('')}),[]);
 return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:t.bg}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16}}><Text style={{fontSize:24,fontWeight:'700',color:t.fg}}>国家 / 地区</Text><CloseButton label="关闭国家地区选择" onPress={onClose}/></View>
   <TextInput accessibilityLabel="搜索国家或地区" placeholder="搜索国家或地区" placeholderTextColor={t.muted} value={query} onChangeText={setQuery} style={{marginHorizontal:18,marginBottom:14,padding:14,borderRadius:16,backgroundColor:t.soft,color:t.fg}}/>
   <View style={{flex:1}}><FlatList ref={list} testID="country-list" data={rows} keyExtractor={r=>r.key} getItemLayout={(_,i)=>({index:i,length:rows[i]!.height,offset:rows[i]!.offset})} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingRight:38,paddingHorizontal:18}} renderItem={({item})=>item.code?<Tap label={`${item.title} ${item.code}`} onPress={()=>{onChange(item.code!);onClose();}} style={{height:62,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:t.line}}><View style={{flex:1,gap:4}}><Text translate={false} style={{color:t.fg,fontSize:16}}>{item.title}</Text>{language!=='en-US'&&<Text style={{fontSize:10,color:t.muted}}>{item.english}</Text>}</View>{value===item.code&&<Icon name="checkmark" color={t.accent}/>}</Tap>:<View style={{height:30,justifyContent:'center',backgroundColor:t.soft,paddingLeft:8}}><Text style={{fontWeight:'700',color:t.accent}}>{item.letter}</Text></View>} ListEmptyComponent={<Text style={{color:t.muted,padding:20}}>没有找到匹配的地区</Text>}/>
     <View ref={rail} testID="country-alphabet" {...responder.panHandlers} style={{position:'absolute',right:1,top:5,bottom:5,width:30,justifyContent:'center'}}>{letters.map(l=><Tap key={l} label={`定位 ${l}`} onPress={()=>{let index=rows.findIndex(r=>!r.code&&r.letter>=l);if(index<0)index=rows.findLastIndex(r=>!r.code);if(index>=0)list.current?.scrollToIndex({index,animated:false});}} style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:10,fontWeight:'600',color:t.accent}}>{l}</Text></Tap>)}</View>
     {!!letter&&<View pointerEvents="none" style={{position:'absolute',right:50,top:'40%',padding:22,borderRadius:20,backgroundColor:t.soft}}><Text style={{fontSize:38,color:t.accent,fontWeight:'700'}}>{letter}</Text></View>}
   </View>
 </SafeAreaView></Modal>;
}
