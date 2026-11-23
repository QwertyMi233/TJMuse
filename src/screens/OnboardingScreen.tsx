import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,ScrollView,View,KeyboardAvoidingView,Keyboard} from 'react-native';
import Text from '../ui/LocalizedText';

import {SafeAreaView} from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import {StatusBar} from 'expo-status-bar';
import useOnboardingPalette from '../ui/useOnboardingPalette';
import {ONBOARDING_BLUE} from '../ui/onboarding-colors';
import OnboardingAura from '../ui/OnboardingAura';
import useOnboardingMotion from '../ui/useOnboardingMotion';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {Platform} from 'react-native';
import {useStore} from '../state/store';
import {Button,Field,Hint,Icon,IconButton,Pill,Tap} from '../ui/components';
import SemesterWeekField from '../ui/SemesterWeekField';
import TimetableManager from '../ui/TimetableManager';
import HomeworkScreen from './HomeworkScreen';
import {AISettingsSheet,NotificationsSheet,CalendarSettingsSheet} from '../ui/SettingsSheets';
import CountryPicker from '../ui/CountryPicker';
import {countryName} from '../core/countries';
import {useLanguage} from '../ui/LocaleContext';
import {dateKey,validTime,minutes} from '../core/calendar';
import {useTheme,ThemeOverrideProvider} from '../ui/theme';
import LanguageSettingsSheet from '../ui/LanguageSettingsSheet';
import OnboardingSound from '../ui/OnboardingSound';
const TITLES=['让每一天，\n从容展开。','先认识一下你','从你的第一周开始','让作业各归其位','为时间添一点灵感','找到舒服的节奏','准备好了，\n开始你的每一天。'];
const SUBTITLES=['留一点空间，给重要的事，也给自己。','一个属于你的空间，从你的名字开始。','把课程带进来，让日程自然衔接。','连接学习平台，重要的截止日不再错过。','连接你熟悉的模型，一起安排日常。','让提醒适时响起，也为休息留出时间。','不用一次设定完美，以后随时可以调整。'];
const AnimatedTitle=Animated.createAnimatedComponent(Text);
const ONBOARDING_THEME={foreground:ONBOARDING_BLUE.deep,background:ONBOARDING_BLUE.paper,accent:ONBOARDING_BLUE.accent};
export default function OnboardingScreen(){return <ThemeOverrideProvider value={ONBOARDING_THEME}><OnboardingContent/></ThemeOverrideProvider>;}
function OnboardingContent(){
 const t=useTheme(),store=useStore(),{data}=store,step=data.settings.onboardingStep,language=useLanguage();
 const [panel,setPanel]=useState<'language'|'country'|'courses'|'homework'|'ai'|'notifications'|'calendar'|null>(null),[muted,setMuted]=useState(false),[error,setError]=useState('');
 const [nickname,setNickname]=useState(data.profile.nickname),[editing,setEditing]=useState(false),[foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 const [showAura,setShowAura]=useState(step===0||step===6);
 const saveNickname=()=>{if(nickname!==data.profile.nickname)store.updateProfile({...data.profile,nickname});};
 const saveDraft=useRef(saveNickname);saveDraft.current=saveNickname;
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{setForeground(state==='active');if(state!=='active')saveDraft.current();});return()=>sub.remove();},[]);
 useEffect(()=>setShowAura(step===0||step===6),[step]);
 const palette=useOnboardingPalette(step,editing||panel!==null||!foreground);
 const [playCue,setPlayCue]=useState(true),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const motion=useOnboardingMotion(step,(target,forward,complete)=>{
   setPlayCue(forward);setError('');
   if(complete){store.updateSettings({onboardingCompleted:true});return;}
   store.updateSettings({onboardingStep:target});scroll.current?.scrollTo({y:0,animated:false});
 });
 const move=(target:number)=>{if(motion.transition(target,target>step)){if(step===1)saveNickname();if(target===0||target===6)setShowAura(true);palette.prepare(target);Keyboard.dismiss();setPlayCue(false);}};
 const next=()=>{if(step===1&&!nickname.trim())return setError('请填写昵称，或选择跳过。');if(step===5&&(!validTime(data.settings.dayStart)||!validTime(data.settings.dayEnd)||minutes(data.settings.dayStart)>=minutes(data.settings.dayEnd)))return setError('请设置有效的作息时间。');if(step===2&&!data.settings.semesterStartDate)store.updateSettings({semesterStartDate:dateKey(new Date())});if(step===6){if(motion.transition(step,false,true)){Keyboard.dismiss();setPlayCue(false);}}else move(step+1);};
 const avatar=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)return setError('请允许访问相册以选择头像。');const image=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.7,base64:Platform.OS==='web'});if(image.canceled)return;const asset=image.assets[0]!;let uri=asset.uri;if(Platform.OS==='web'&&asset.base64)uri=`data:${asset.mimeType||'image/jpeg'};base64,${asset.base64}`;else if(Platform.OS!=='web'){uri=`${FileSystem.documentDirectory}avatar-${Date.now()}.jpg`;await FileSystem.copyAsync({from:asset.uri,to:uri});}store.updateProfile({...data.profile,avatar:uri});}catch{setError('无法选择头像，请重试。');}};
 return <View testID="onboarding" pointerEvents={motion.busy?'none':'auto'} aria-busy={motion.busy} accessibilityState={{busy:motion.busy}} style={{flex:1,backgroundColor:ONBOARDING_BLUE.paper}}>
   <StatusBar style={palette.paper?'dark':'light'}/>
   <Animated.View testID="onboarding-aura-layer" pointerEvents="none" style={[{position:'absolute',inset:0},palette.background]}>{showAura&&<OnboardingAura active={foreground&&panel===null}/>}</Animated.View>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}><SafeAreaView style={{flex:1}}>
     <Animated.View style={[motion.header,{paddingHorizontal:22,paddingTop:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]}>{step>0&&step<6?<IconButton icon="chevron-back" label="上一步" onPress={()=>move(step-1)} color={palette.text}/>:<Text style={{color:palette.text,letterSpacing:3,fontWeight:'600'}}>TJMUSE</Text>}<IconButton icon="language-outline" label="语言" color={palette.text} onPress={()=>setPanel('language')}/><IconButton icon={muted?'volume-mute-outline':'volume-high-outline'} label={muted?'开启音效':'关闭音效'} color={palette.text} onPress={()=>setMuted(v=>!v)}/></Animated.View>
     <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,paddingHorizontal:27,paddingTop:step===0||step===6?70:24,paddingBottom:24,gap:20,justifyContent:step===0||step===6?'center':undefined}}>
       <View style={{gap:16}}><Animated.View testID="onboarding-title" style={motion.title}><AnimatedTitle testID="onboarding-colored-title" style={[palette.title,{textAlign:'center',fontSize:step===0||step===6?41:32,lineHeight:step===0||step===6?55:42,fontWeight:'700',letterSpacing:-1}]}>{TITLES[step]}</AnimatedTitle></Animated.View><Animated.View testID="onboarding-subtitle" style={motion.subtitle}><Text style={{textAlign:'center',color:palette.secondary,fontSize:14,lineHeight:24}}>{SUBTITLES[step]}</Text></Animated.View></View>
       {(step>0&&step<6||!!error)&&<Animated.View testID="onboarding-form" style={[{gap:20},motion.body]}>
       {step===1&&<View style={{padding:18,borderRadius:24,backgroundColor:t.surface,borderWidth:1,borderColor:'#E5EDF6',gap:17}}>
         <Tap label="选择头像" onPress={()=>void avatar()} style={{alignSelf:'center',width:84,height:84,borderRadius:28,backgroundColor:'#EAF3FC',justifyContent:'center',alignItems:'center',overflow:'hidden'}}>{data.profile.avatar?<Image source={{uri:data.profile.avatar}} style={{width:84,height:84}}/>:<Icon name="person-add-outline" size={33} color="#0066B3"/>}</Tap>
         <Field label="昵称" value={nickname} maxLength={30} onChangeText={setNickname} onFocus={()=>setEditing(true)} onBlur={()=>{setEditing(false);saveNickname();}}/>
         <View style={{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:8}}>{['女','男','不愿透露'].map(gender=><Pill key={gender} title={gender} selected={data.profile.gender===gender} onPress={()=>store.updateProfile({...data.profile,gender})}/>)}</View>
         <Tap label="选择国家或地区" onPress={()=>{Keyboard.dismiss();setPanel('country');}} style={{padding:14,backgroundColor:'#EAF3FC',borderRadius:16,flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:'#123B64'}}>{countryName(data.profile.regionCode,language)||data.profile.region}</Text><Icon name="chevron-forward" color="#123B64" size={17}/></Tap>
       </View>}
       {step===2&&<View style={{padding:18,borderRadius:24,backgroundColor:t.surface,borderWidth:1,borderColor:'#E5EDF6',gap:16}}><Button title="导入或添加课表" onPress={()=>setPanel('courses')} icon="calendar-outline"/><SemesterWeekField value={data.settings.semesterStartDate||dateKey(new Date())} onChange={semesterStartDate=>store.updateSettings({semesterStartDate})} weekStartsOn={data.settings.weekStartsOn}/><View style={{flexDirection:'row',justifyContent:'center',gap:8}}><Pill title="周一" selected={data.settings.weekStartsOn===1} onPress={()=>store.updateSettings({weekStartsOn:1})}/><Pill title="周日" selected={data.settings.weekStartsOn===0} onPress={()=>store.updateSettings({weekStartsOn:0})}/></View><Hint center>{data.timetables.length} 份课表已保存</Hint></View>}
       {step===3&&<View style={{padding:20,borderRadius:24,backgroundColor:t.surface,borderWidth:1,borderColor:'#E5EDF6',gap:16}}><Button title="连接学习平台" icon="book-outline" onPress={()=>setPanel('homework')}/><Hint center>Canvas · {data.canvas.connected?'已连接':'未连接'}　好课 · {data.haoke.connected?'已连接':'未连接'}　智学盟 · {data.zhixuemeng.connected?'已连接':'未连接'}</Hint></View>}
       {step===4&&<View style={{padding:20,borderRadius:24,backgroundColor:t.surface,borderWidth:1,borderColor:'#E5EDF6',gap:16}}><Button title="连接你的 AI" icon="sparkles-outline" onPress={()=>setPanel('ai')}/><Hint center>ChatGPT · DeepSeek · 自定义接口</Hint></View>}
       {step===5&&<View style={{padding:20,borderRadius:24,backgroundColor:t.surface,borderWidth:1,borderColor:'#E5EDF6',gap:16}}><Button title="通知设置" icon="notifications-outline" onPress={()=>setPanel('notifications')}/><Button title="作息时间" secondary icon="moon-outline" onPress={()=>setPanel('calendar')}/><Hint center>{data.settings.dayStart} — {data.settings.dayEnd}</Hint></View>}
       {!!error&&<Text style={{color:'#FFFFFF',backgroundColor:'#38163D66',padding:14,borderRadius:15}}>{error}</Text>}
       </Animated.View>}
     </ScrollView>
     <Animated.View testID="onboarding-actions" style={[{paddingHorizontal:27,paddingBottom:20,gap:12},motion.footer]}>
       {step>0&&step<6&&<View accessibilityLabel={`第 ${step} 步，共 5 步`} style={{flexDirection:'row',gap:7,marginBottom:8}}>{[1,2,3,4,5].map(n=><View key={n} style={{height:3,flex:1,borderRadius:2,backgroundColor:n<=step?(palette.paper?ONBOARDING_BLUE.deep:'#FFFFFF'):(palette.paper?'#DEE8F2':'#FFFFFF40')}}/>)}</View>}
       <Tap label={step===6?'进入 TJMuse':'下一步'} onPress={next} style={{backgroundColor:palette.paper?ONBOARDING_BLUE.deep:'#FFFFFF',padding:18,borderRadius:21,alignItems:'center'}}><Text style={{textAlign:'center',color:palette.paper?'#FFFFFF':ONBOARDING_BLUE.deep,fontSize:16,fontWeight:'700'}}>{step===6?'进入 TJMuse':step===0?'让我们开始吧':'下一步'}</Text></Tap>
       {step<6&&<Tap label="跳过" onPress={()=>move(step===0?6:step+1)} style={{padding:10,alignItems:'center'}}><Text style={{textAlign:'center',color:palette.secondary,fontSize:13}}>跳过</Text></Tap>}
     </Animated.View>
   </SafeAreaView></KeyboardAvoidingView>
   <OnboardingSound key={step} step={step} muted={muted} playOnEntry={playCue}/>
   {panel==='language'&&<LanguageSettingsSheet onClose={()=>setPanel(null)}/>}
   {panel==='country'&&<CountryPicker value={data.profile.regionCode} onChange={regionCode=>store.updateProfile({...data.profile,regionCode,region:countryName(regionCode)})} onClose={()=>setPanel(null)}/>}
   {panel==='courses'&&<TimetableManager onClose={()=>setPanel(null)}/>}
   {panel==='homework'&&<HomeworkScreen settingsOnly onClose={()=>setPanel(null)}/>}
   {panel==='ai'&&<AISettingsSheet onClose={()=>setPanel(null)}/>}
   {panel==='notifications'&&<NotificationsSheet onClose={()=>setPanel(null)}/>}
   {panel==='calendar'&&<CalendarSettingsSheet onClose={()=>setPanel(null)}/>}
 </View>;
}
