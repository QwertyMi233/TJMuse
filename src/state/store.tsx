import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState,Platform } from 'react-native';
import {zhixuemengNativeSync,clearNativeZxmSession} from '../services/native-auto-login';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData, uid } from '../core/defaults';
import { type FlexibleDraft } from '../core/ai-actions';
import {proposeCourseRecordActions} from '../core/course-record-actions';
import {proposeStateActions} from '../core/ai-state-actions';
import {proposeTemporaryActions} from '../core/temporary-actions';
import type {CourseOccurrenceEdit,HomeworkLocalEdit} from '../core/types';
import {commitAIReply,undoAIReply as undoReply} from '../core/ai-schedule';
import type {AITodoChange,AIStateChange} from '../core/types';
import { toggleDate } from '../core/calendar';
import { restoreData } from '../core/storage';
import type { AppData, Task, FlexibleTask, Message, Settings, Profile, Holiday, HomeworkPreference } from '../core/types';
import { builtIn2026, fetchHolidays } from '../services/holidays';
import { syncNotifications } from '../services/notifications';
import { fetchCanvasAssignments, saveCanvasToken } from '../services/canvas';
import { canvasOrigin, canvasToken, fetchCanvasSnapshot } from '../core/canvas-api';
import { homeworkCompleted } from '../core/homework';
import { changeHomeworkPreference, cleanHomeworkTrash, homeworkTrashExpiresAt, mergeCanvasHomework } from '../core/homework-trash';
import { createAppOpenSync } from '../core/app-open-sync';
import { canvasStudentLogin } from '../services/tongji-credentials';
import {zhixuemengLogin} from '../services/zhixuemeng-credentials';
import {runOfficialSession} from '../services/web-session';
import { haokeStudentLogin } from '../services/haoke-credentials';
import { allHomeworkPreferences, homeworkPlatform, PLATFORM_ORDER, syncConnectedPlatforms, type PlatformSyncResult } from '../core/platforms';
import { fetchHaokeSnapshot,withHaokeLoginRecovery } from '../core/haoke-api';
import { canvasRenewalDue, clearCanvasRenewal, connectHaokeSession, getHaokeCredentials, keepCanvasSession, prepareCanvasRenewal, saveHaokeCredentials } from '../services/platform-auth';
import { canvasSessionCheckDue, canvasSessionNeedsLogin, canvasSessionCanRecover, withCanvasMaintenance } from '../core/canvas-renewal';
import { WebSessionError, type CanvasTokenOption } from '../services/web-session';
import { DEMO_MODE, demoDelay } from '../services/demo-mode';
import { createDemoData, demoAssignments } from '../core/demo';
import type { CanvasRenewal } from '../core/types';
import type { Timetable } from '../core/types';
import { validateTimetable } from '../core/timetable';
import {createDailyAIPlanner,createAIRequestGate,type AIRequestLease} from '../core/daily-ai-plan';
import {getApiKey} from '../services/secrets';
import {requestAIWithActions} from '../services/ai';
import {dateKey} from '../core/calendar';
import {deviceLocale} from '../services/device-locale';
import {syncAgendaWidget} from '../services/widget-sync';
import {createWidgetRefresh} from '../core/widget-refresh';
import {countryName} from '../core/countries';

const STORAGE_KEY = DEMO_MODE ? 'tjmuse.demo.data.v021' : 'tjmuse.data.v1';
type Store = {
  setCourseActive:(id:string,date:string,active:boolean)=>void;
  editCourseOccurrence:(id:string,date:string,edit:CourseOccurrenceEdit|null)=>void;
  editHomeworkLocal:(id:string,edit:HomeworkLocalEdit|null,active?:boolean)=>void;
  deleteCourseRecord:(courseId:string,date?:string)=>void;
  aiPlanning:boolean;aiPlanError:string;cancelAutoPlan:()=>void;claimAIConversation:()=>AIRequestLease|null;
  saveTimetable: (table: Timetable) => void; toggleTimetable: (id: string) => void; deleteTimetable: (id: string) => void;
  data: AppData; ready: boolean; error: string; notice: string; clearNotice: () => void;
  saveTask: (task: Task) => void; deleteTask: (id: string) => void; toggleTask: (id: string, date: string) => void;
  toggleSubtask: (id: string, subId: string, date: string) => void;
  saveFlexible: (task: FlexibleTask) => void; deleteFlexible: (id: string) => void; toggleFlexible: (id: string) => void;
  addMessages: (messages: Message[]) => void; clearMessages: () => void;
  applyAIReply: (message: Message, drafts: FlexibleDraft[], changes?:AITodoChange[],stateChanges?:AIStateChange[]) => void;
  undoAIReply:(messageId:string)=>void;
  updateSettings: (settings: Partial<Settings>) => void; updateProfile: (profile: Profile) => void;
  getHoliday: (date: string) => Holiday | undefined; syncHolidays: (year: number) => Promise<void>;
  syncCanvas: () => Promise<void>; canvasSyncing: boolean; toggleHomework: (id: string) => void;
  connectCanvas: (base: string, token: string) => Promise<void>; disconnectCanvas: () => Promise<void>;
  setHomeworkPreference: (id: string, change: Partial<HomeworkPreference>) => void;
  clearHomeworkTrash: () => void;
  syncHaoke: () => Promise<void>; haokeSyncing: boolean; connectHaoke: (silent?:boolean) => Promise<void>; cancelHaoke:()=>void; disconnectHaoke: () => Promise<void>;
  syncZhixuemeng:()=>Promise<void>;connectZhixuemeng:(silent?:boolean)=>Promise<void>;cancelZhixuemeng:()=>void;disconnectZhixuemeng:()=>Promise<void>;zhixuemengSyncing:boolean;
  syncAllHomework: () => Promise<PlatformSyncResult[]>;
  enableCanvasRenewal: (token: CanvasTokenOption) => Promise<void>;
  disableCanvasRenewal: () => Promise<void>; checkCanvasRenewal: () => Promise<void>; checkCanvasSession: () => Promise<void>; renewalBusy: boolean;
};
const Context = createContext<Store | null>(null);
let writes: Promise<void> = Promise.resolve();
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const latest = useRef(data); latest.current = data;
  const widgetRefresh=useRef<ReturnType<typeof createWidgetRefresh>|null>(null);
  const canvasBusy = useRef(false);
  const canvasAuthorizing = useRef(false), [canvasRevision, setCanvasRevision] = useState(0);
  const canvasEpoch = useRef(0), [canvasSyncing, setCanvasSyncing] = useState(false);
  const zxmFlight=useRef<AbortController|null>(null),zxmEpoch=useRef(0),[zhixuemengSyncing,setZhixuemengSyncing]=useState(false);
  const haokeFlight=useRef<AbortController|null>(null);
  const haokeBusy = useRef(false), haokeAuthorizing = useRef(false), haokeEpoch = useRef(0), [haokeSyncing, setHaokeSyncing] = useState(false);
  const renewBusy = useRef(false), [renewalBusy, setRenewalBusy] = useState(false);
  const canvasMaintenanceFlight=useRef<Promise<void>|null>(null);
  const autoBusy = useRef(false);
  const openSyncController=useRef<ReturnType<typeof createAppOpenSync>|null>(null);
  const [aiPlanning,setAIPlanning]=useState(false),[aiPlanError,setAIPlanError]=useState('');
  const aiGate=useRef(createAIRequestGate()),manualDay=useRef(''),autoPlanner=useRef<ReturnType<typeof createDailyAIPlanner>|null>(null);
  const maintainCanvas = useCallback((options: {rotate?: boolean; duringSync?: boolean; resumed?: boolean; checkNow?: boolean} = {}):Promise<void> => {
    if(canvasMaintenanceFlight.current)return canvasMaintenanceFlight.current;
    const work=async()=>{
    const config = latest.current.canvas.renewal, epoch = canvasEpoch.current;
    if (!config?.enabled || renewBusy.current || canvasAuthorizing.current || canvasBusy.current && !options.duringSync) return;
    const rotate=options.rotate===true||canvasRenewalDue(config);
    if(!rotate&&!options.checkNow&&!canvasSessionCheckDue(config,Date.now(),options.resumed))return;
    renewBusy.current = true; setRenewalBusy(true);
    const attempted = new Date().toISOString();
    const checking={...config,lastSessionAttempt:attempted,...(rotate?{lastAttempt:attempted}:{})};
    setData(d => ({ ...d, canvas: { ...d.canvas, renewal: checking } }));
    try {
      let next: CanvasRenewal;
      if(DEMO_MODE){await demoDelay();next={...checking,...(rotate?{lastRotated:attempted}:{}),status:'ready',message:''};}
      else if(rotate)next=await prepareCanvasRenewal(checking,options.rotate);
      else{await keepCanvasSession(config.accountId);next=canvasSessionCanRecover(config)?{...checking,status:'ready',message:'',lastErrorCode:null}:checking;}
      if(rotate)next={...next,lastErrorCode:null};
      next={...next,lastSessionAttempt:attempted,lastSessionCheck:new Date().toISOString()};
      if (epoch === canvasEpoch.current) setData(d => ({ ...d, canvas: { ...d.canvas, renewal: next } }));
    } catch (e) {
      if (epoch === canvasEpoch.current) setData(d => ({ ...d, canvas: { ...d.canvas, renewal: { ...checking,
        status: e instanceof WebSessionError && e.code==='busy'?config.status:e instanceof WebSessionError && canvasSessionNeedsLogin(e.code)?'needs-login':'error', lastErrorCode: e instanceof WebSessionError && e.code==='busy'?config.lastErrorCode:e instanceof WebSessionError?e.code:'maintenance_failed', message: e instanceof Error ? e.message : '连接维护失败。' } } }));
      throw e;
    } finally { renewBusy.current = false; setRenewalBusy(false); }
    };
    const flight=work();canvasMaintenanceFlight.current=flight;
    void flight.finally(()=>{if(canvasMaintenanceFlight.current===flight)canvasMaintenanceFlight.current=null;}).catch(()=>{});
    return flight;
  }, []);
  const syncCanvas = useCallback(async () => {
    const current = latest.current.canvas;
    if (!current.connected || canvasBusy.current || canvasAuthorizing.current) return;
    const epoch = canvasEpoch.current;
    canvasBusy.current = true;
    setCanvasSyncing(true);
    try {
      const { assignments, userId } = await withCanvasMaintenance(()=>maintainCanvas({duringSync:true}),async()=>DEMO_MODE ? (await demoDelay(), { assignments: demoAssignments('canvas'), userId: '10001' }) : fetchCanvasAssignments(current.baseUrl));
      if (epoch !== canvasEpoch.current) return;
      if (current.userId && current.userId !== userId) throw new Error('Canvas 账户已改变，请重新连接；已有作业已保留。');
      setData(d => {
        if (epoch !== canvasEpoch.current || !d.canvas.connected || d.canvas.baseUrl !== current.baseUrl) return d;
        const now = new Date();
        return { ...d, canvas: { ...mergeCanvasHomework(d.canvas, assignments, now), userId, lastSync: now.toISOString() } };
      });
    } finally { canvasBusy.current = false; setCanvasSyncing(false); }
  }, [maintainCanvas]);
  const cancelHaoke=useCallback(()=>{haokeEpoch.current++;haokeFlight.current?.abort(new WebSessionError('cancelled'));haokeFlight.current=null;haokeBusy.current=false;haokeAuthorizing.current=false;setHaokeSyncing(false);},[]);
  const syncHaoke=useCallback(async()=>{
    const current=latest.current.haoke;if(!current.connected||!current.userId||haokeBusy.current||haokeAuthorizing.current)return;
    const epoch=haokeEpoch.current,controller=new AbortController();haokeFlight.current=controller;haokeBusy.current=true;setHaokeSyncing(true);
    try{
      const pair=DEMO_MODE?null:await getHaokeCredentials(current.userId,controller.signal);controller.signal.throwIfAborted();
      const snapshot=DEMO_MODE?(await demoDelay(),{userId:'20001',assignments:demoAssignments('haoke')}):await withHaokeLoginRecovery(()=>fetchHaokeSnapshot(pair!.token,undefined,controller.signal),async()=>{controller.signal.throwIfAborted();const restored=await connectHaokeSession(current.userId!,true,controller.signal);controller.signal.throwIfAborted();await saveHaokeCredentials(restored);return fetchHaokeSnapshot(restored.token,undefined,controller.signal);});
      controller.signal.throwIfAborted();if(epoch!==haokeEpoch.current)return;
      if(snapshot.userId!==current.userId)throw new Error('好课账户已改变，请重新连接；已有作业保留。');
      setData(d=>epoch!==haokeEpoch.current?d:({...d,haoke:{...mergeCanvasHomework(d.haoke,snapshot.assignments),lastSync:new Date().toISOString()}}));
    }finally{if(haokeFlight.current===controller){haokeFlight.current=null;haokeBusy.current=false;setHaokeSyncing(false);}}
  },[]);
  const connectHaoke=useCallback(async(silent=false)=>{
    if(silent&&(haokeAuthorizing.current||haokeBusy.current))return;
    if(!silent)cancelHaoke();
    const epoch=++haokeEpoch.current,controller=new AbortController();haokeFlight.current=controller;haokeAuthorizing.current=true;setHaokeSyncing(true);
    try{
      const pair=DEMO_MODE?null:await connectHaokeSession(latest.current.haoke.connected?latest.current.haoke.userId||undefined:undefined,silent,controller.signal);controller.signal.throwIfAborted();
      const snapshot=DEMO_MODE?(await demoDelay(),{userId:'20001',assignments:demoAssignments('haoke')}):await fetchHaokeSnapshot(pair!.token,undefined,controller.signal);
      controller.signal.throwIfAborted();if(epoch!==haokeEpoch.current)return;
      if(!DEMO_MODE)await saveHaokeCredentials(pair);controller.signal.throwIfAborted();
      setData(d=>epoch!==haokeEpoch.current?d:({...d,haoke:{...mergeCanvasHomework(d.haoke.userId===snapshot.userId?d.haoke:{...d.haoke,assignments:[],preferences:{},lastSync:null},snapshot.assignments),connected:true,userId:snapshot.userId,lastSync:new Date().toISOString()}}));
    }finally{if(haokeFlight.current===controller){haokeFlight.current=null;haokeAuthorizing.current=false;setHaokeSyncing(false);}}
  },[cancelHaoke]);
  const cancelZhixuemeng=useCallback(()=>{zxmEpoch.current++;zxmFlight.current?.abort(new WebSessionError('cancelled'));zxmFlight.current=null;setZhixuemengSyncing(false);},[]);
  const zxmWork=useCallback(async(silent:boolean)=>{
    if(silent&&zxmFlight.current)return;if(!silent)cancelZhixuemeng();
    const controller=new AbortController(),epoch=++zxmEpoch.current;zxmFlight.current=controller;setZhixuemengSyncing(true);
    try{
      const current=latest.current.zhixuemeng;
      const snapshot=DEMO_MODE?(await demoDelay(),{userId:'demo-zxm-user',assignments:demoAssignments('zhixuemeng')}):silent&&Platform.OS!=='web'&&(await zhixuemengLogin.status()).enabled?await zhixuemengNativeSync(current.connected?current.userId||undefined:undefined,controller.signal):(await runOfficialSession({kind:'zhixuemeng-sync',silent,signal:controller.signal,config:{expectedAccountId:current.connected?current.userId:undefined}})).homework;
      controller.signal.throwIfAborted();if(epoch!==zxmEpoch.current)return;if(!snapshot)throw new WebSessionError('invalid_result');
      if(current.connected&&current.userId!==snapshot.userId)throw new WebSessionError('account_changed');
      setData(d=>epoch!==zxmEpoch.current?d:({...d,zhixuemeng:{...mergeCanvasHomework(d.zhixuemeng.userId===snapshot.userId?d.zhixuemeng:{...initialData.zhixuemeng},snapshot.assignments),connected:true,userId:snapshot.userId,lastSync:new Date().toISOString()}}));
    }finally{if(zxmFlight.current===controller){zxmFlight.current=null;setZhixuemengSyncing(false);}}
  },[cancelZhixuemeng]);
  const syncZhixuemeng=useCallback(()=>zxmWork(true),[zxmWork]);
  const connectZhixuemeng=useCallback((silent=false)=>zxmWork(silent),[zxmWork]);
  const syncOnOpen = useCallback(async () => {
    if(autoBusy.current)return;
    autoBusy.current=true;
    try {
      await Promise.all(PLATFORM_ORDER.map(async platform=>{
        try {
          if(latest.current[platform].connected)await (platform==='canvas'?syncCanvas():platform==='haoke'?syncHaoke():syncZhixuemeng());
          else if(platform==='zhixuemeng'){if((await zhixuemengLogin.status()).enabled)await syncZhixuemeng();}
          else if(platform==='haoke'&&!DEMO_MODE){const saved=await haokeStudentLogin.status();if(saved.enabled)await connectHaoke(true);}
        } catch(e){if(!(e instanceof WebSessionError&&e.code==='cancelled'))setNotice(e instanceof Error?e.message:'自动同步未完成，可在作业页手动重试。');}
      }));
    } finally {autoBusy.current=false;}
  },[syncCanvas,syncHaoke,connectHaoke,syncZhixuemeng]);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        setData(restoreData(JSON.parse(raw)));
      } else if (DEMO_MODE) setData(createDemoData());
      else {const {region}=deviceLocale();setData(d=>({...d,profile:{...d.profile,regionCode:region,region:countryName(region)||d.profile.region}}));}
      if(DEMO_MODE&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('welcome')==='1'){
        setData(d=>({...d,settings:{...d.settings,onboardingCompleted:false,onboardingStep:0}}));
        const url=new URL(window.location.href);url.searchParams.delete('welcome');window.history.replaceState(null,'',url.toString());
      }
      setReady(true);
    }).catch(() => setError('无法读取本地数据。为保护已有记录，暂未写入更改。请重新打开 App。'));
  }, []);
  useEffect(() => {
    if (!ready) return;
    writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)));
    void writes.catch(() => setNotice('本地保存失败，请检查设备存储空间。'));
  }, [data, ready]);
  useEffect(()=>{
    if(!ready)return;
    const refresh=createWidgetRefresh({read:()=>latest.current,publish:syncAgendaWidget,report:error=>setNotice(error instanceof Error?error.message:'桌面小组件暂未刷新，请重新打开 App。')});
    widgetRefresh.current=refresh;void refresh.flush();
    const sub=AppState.addEventListener('change',state=>{if(state==='active'||state==='background')void refresh.flush();});
    return()=>{sub.remove();refresh.dispose();if(widgetRefresh.current===refresh)widgetRefresh.current=null;};
  },[ready]);
  useEffect(()=>{if(ready)widgetRefresh.current?.changed();},[ready,data.tasks,data.timetables,data.courseExceptions,data.courseOverrides,data.canvas.assignments,data.canvas.preferences,data.haoke.assignments,data.haoke.preferences,data.zhixuemeng.assignments,data.zhixuemeng.preferences,data.settings]);
  useEffect(()=>{
    if(!ready||!data.settings.onboardingCompleted)return;
    let active=true;
    let planSnapshot:AppData|null=null;
    const ledger=DEMO_MODE?'tjmuse.demo.ai-plan.v1':'tjmuse.ai-plan.v1';
    const planner=createDailyAIPlanner({
      today:()=>dateKey(new Date()),read:()=>AsyncStorage.getItem(ledger),write:value=>AsyncStorage.setItem(ledger,value),
      key:()=>{planSnapshot=latest.current;if(active)setAIPlanError('');return getApiKey(planSnapshot.settings.provider);},
      report:e=>{if(active)setAIPlanError(e instanceof Error?e.message:'今日自动规划未完成，可发送提示词继续。');},
      generate:async(day,key,signal)=>{
        if(manualDay.current===day)return;
        const lease=aiGate.current.claim();if(!lease)return;
        setAIPlanning(true);setAIPlanError('');
        try{
          const snapshot=planSnapshot||latest.current;
          const holiday=snapshot.settings.holidayEnabled?(snapshot.holidays[day.slice(0,4)]||(day.startsWith('2026')?builtIn2026:undefined))?.days.find(h=>h.date===day):undefined;
          const reply=await requestAIWithActions(snapshot,key,[{role:'user',content:'请根据启动时的任务、课程和当前时间，生成今天的时间规划。'}],holiday,signal,false);
          if(active&&!signal.aborted)setData(d=>({...d,messages:[...d.messages,{id:uid(),role:'assistant' as const,content:reply.text,date:day,createdAt:new Date().toISOString()}].slice(-500)}));
        }finally{lease.release();if(active)setAIPlanning(false);}
      },
    });
    autoPlanner.current=planner;
    const open=createAppOpenSync(()=>planner.request());
    const timer=setTimeout(()=>{void open.onState(AppState.currentState||'unknown');},800);
    const sub=AppState.addEventListener('change',state=>{void open.onState(state);});
    return()=>{active=false;clearTimeout(timer);sub.remove();open.dispose();planner.dispose();if(autoPlanner.current===planner)autoPlanner.current=null;};
  },[ready,data.settings.onboardingCompleted]);
  useEffect(() => {
    if (!ready) return;
    const clean = () => setData(d => {
      const canvas = cleanHomeworkTrash(d.canvas), haoke = cleanHomeworkTrash(d.haoke),zhixuemeng=cleanHomeworkTrash(d.zhixuemeng);
      return canvas === d.canvas && haoke === d.haoke && zhixuemeng===d.zhixuemeng? d : { ...d, canvas, haoke,zhixuemeng };
    });
    const expiries = Object.values(allHomeworkPreferences(data)).map(homeworkTrashExpiresAt).filter((at): at is number => at !== null);
    const next = expiries.length ? Math.min(...expiries) : null;
    const timer = next === null ? undefined : setTimeout(clean, Math.max(0, Math.min(next - Date.now() + 25, 2147483647)));
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') clean(); });
    return () => { if (timer) clearTimeout(timer); subscription.remove(); };
  }, [ready, data.canvas.preferences, data.haoke.preferences,data.zhixuemeng.preferences]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void syncNotifications(data).catch(e => setNotice(e.message || '提醒更新失败。')); }, 350);
    return () => clearTimeout(timer);
  }, [data.tasks, data.timetables, data.courseExceptions,data.courseOverrides,data.canvas.assignments, data.canvas.preferences, data.haoke.assignments, data.haoke.preferences,data.zhixuemeng.assignments,data.zhixuemeng.preferences, data.settings.todoNotifications, data.settings.courseNotifications, data.settings.homeworkNotifications, data.settings.reminderMinutes, ready]);
  useEffect(() => {
    if(!ready)return;
    const sync=createAppOpenSync(syncOnOpen);openSyncController.current=sync;
    const timer=setTimeout(()=>{void sync.onState(AppState.currentState||'unknown');},450);
    const sub=AppState.addEventListener('change',state=>{void sync.onState(state);});
    const canvas=canvasStudentLogin.subscribe(()=>{void (async()=>{
      const status=await canvasStudentLogin.status();
      if(status.enabled&&status.state==='ready'&&latest.current.canvas.renewal?.enabled)await maintainCanvas({checkNow:true});
      await sync.request(true);
    })().catch(e=>setNotice(e instanceof Error?e.message:'Canvas 自动连接未完成。'));});
    const haoke=haokeStudentLogin.subscribe(()=>{void sync.request(true);}),zxm=zhixuemengLogin.subscribe(()=>{void sync.request(true);});
    return()=>{clearTimeout(timer);sub.remove();canvas();haoke();zxm();sync.dispose();if(openSyncController.current===sync)openSyncController.current=null;};
  },[ready,syncOnOpen,maintainCanvas]);
  useEffect(()=>{
    if(!ready||DEMO_MODE)return;
    let alive=true,timer:ReturnType<typeof setTimeout>|undefined;
    const arm=async()=>{
      const statuses=await Promise.all([haokeStudentLogin.status(),zhixuemengLogin.status(),canvasStudentLogin.status()]);
      if(!alive)return;clearTimeout(timer);
      const retries=statuses.map(s=>s.retryAt).filter((at):at is number=>typeof at==='number'&&Number.isFinite(at));
      if(retries.length)timer=setTimeout(()=>{if(AppState.currentState==='active')void openSyncController.current?.request(true);},Math.max(50,Math.min(...retries)-Date.now()+100));
    };
    void arm().catch(()=>{});const sub=AppState.addEventListener('change',s=>{if(s==='active')void arm().catch(()=>{});});
    return()=>{alive=false;clearTimeout(timer);sub.remove();};
  },[ready,syncOnOpen]);
  useEffect(() => {
    if (!ready || !data.canvas.renewal?.enabled) return;
    const check = (resumed=false) => { if (AppState.currentState === 'active') void maintainCanvas({resumed}).catch(() => {}); };
    check(true); const timer = setInterval(()=>check(), 60000), sub = AppState.addEventListener('change', state=>{if(state==='active')check(true);});
    return () => { clearInterval(timer); sub.remove(); };
  }, [ready, data.canvas.renewal?.enabled, data.canvas.renewal?.status, maintainCanvas]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && ready) {
        void syncNotifications(latest.current).catch(e => setNotice(e.message));
      }
    });
    return () => subscription.remove();
  }, [ready, syncCanvas]);
  const syncHolidays = useCallback(async (year: number) => {
    const result = await fetchHolidays(year);
    setData(d => ({ ...d, holidays: { ...d.holidays, [year]: result }, lastHolidaySync: new Date().toISOString() }));
  }, []);
  useEffect(() => {
    if (!ready || !data.settings.holidayEnabled) return;
    const year = new Date().getFullYear();
    const last = data.lastHolidaySync ? new Date(data.lastHolidaySync).getTime() : 0;
    if (Date.now() - last > 7 * 86400000) void syncHolidays(year).catch(() => {});
  }, [ready, data.settings.holidayEnabled, syncHolidays]);
  const store: Store = {
    setCourseActive:(id,date,active)=>setData(d=>proposeStateActions(d,JSON.stringify({items:[{occurrence_id:id,date,active}]}),'course').data),
    editCourseOccurrence:(id,date,edit)=>setData(d=>proposeTemporaryActions(d,JSON.stringify({items:[{occurrence_id:id,date,changes:edit||{},reset:edit===null}]}),'course-local').data),
    editHomeworkLocal:(id,edit,active)=>setData(d=>proposeTemporaryActions(d,JSON.stringify({items:[{homework_id:id,changes:edit||{},reset:edit===null,...(active===undefined?{}:{active})}]}),'homework-local').data),
    deleteCourseRecord:(courseId,date)=>{const raw=JSON.stringify({items:[{course_id:courseId,scope:date?'occurrence':'session',date:date||null}]});proposeCourseRecordActions(latest.current,raw,'delete');setData(d=>proposeCourseRecordActions(d,raw,'delete').data);},
    aiPlanning,aiPlanError,cancelAutoPlan:()=>autoPlanner.current?.cancel(),
    claimAIConversation:()=>{const lease=aiGate.current.claim();if(lease){manualDay.current=dateKey(new Date());setAIPlanError('');}return lease;},
    saveTimetable: table => {
      validateTimetable(table);
      if(latest.current.timetables.length>=50&&!latest.current.timetables.some(t=>t.id===table.id))throw new Error('最多保存 50 份课表，请先删除不再需要的课表。');
      setData(d=>({...d,timetables:d.timetables.some(t=>t.id===table.id)?d.timetables.map(t=>t.id===table.id?table:t):[...d.timetables,table]}));
    },
    toggleTimetable: id => setData(d=>({...d,timetables:d.timetables.map(t=>t.id===id?{...t,enabled:!t.enabled}:t)})),
    deleteTimetable: id => setData(d=>({...d,timetables:d.timetables.filter(t=>t.id!==id)})),
    data, ready, error, notice, clearNotice: () => setNotice(''),
    saveTask: task => setData(d => ({ ...d, tasks: d.tasks.some(t => t.id === task.id) ? d.tasks.map(t => t.id === task.id ? task : t) : [...d.tasks, task] })),
    deleteTask: id => setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })),
    toggleTask: (id, date) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id && t.kind === 'todo' ? { ...t, completedDates: toggleDate(t.completedDates, date) } : t) })),
    toggleSubtask: (id, subId, date) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completedDates: toggleDate(s.completedDates, date) } : s) } : t) })),
    saveFlexible: task => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.some(t => t.id === task.id) ? d.flexibleTasks.map(t => t.id === task.id ? task : t) : [...d.flexibleTasks, task] })),
    deleteFlexible: id => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.filter(t => t.id !== id) })),
    toggleFlexible: id => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })),
    addMessages: messages => setData(d => ({ ...d, messages: [...d.messages, ...messages].slice(-500) })),
    applyAIReply: (message,drafts,changes=[],stateChanges=[]) => setData(d=>commitAIReply(d,message,drafts,changes,stateChanges)),
    undoAIReply:messageId=>setData(d=>undoReply(d,messageId)),
    clearMessages: () => setData(d => ({ ...d, messages: [] })),
    updateSettings: settings => setData(d => ({ ...d, settings: { ...d.settings, ...settings } })),
    updateProfile: profile => setData(d => ({ ...d, profile })),
    getHoliday: date => data.settings.holidayEnabled ? (data.holidays[date.slice(0, 4)] || (date.startsWith('2026-') ? builtIn2026 : undefined))?.days.find(h => h.date === date) : undefined,
    syncHolidays, syncCanvas, canvasSyncing,
    syncHaoke, haokeSyncing, renewalBusy,syncZhixuemeng,connectZhixuemeng,cancelZhixuemeng,zhixuemengSyncing,
    disconnectZhixuemeng:async()=>{cancelZhixuemeng();const hold=new AbortController();zxmFlight.current=hold;try{await zhixuemengLogin.clear();await clearNativeZxmSession();setData(d=>({...d,zhixuemeng:{...initialData.zhixuemeng}}));}finally{if(zxmFlight.current===hold)zxmFlight.current=null;}},
    syncAllHomework: () => syncConnectedPlatforms({ canvas: latest.current.canvas.connected, haoke: latest.current.haoke.connected,zhixuemeng:latest.current.zhixuemeng.connected }, { canvas: syncCanvas, haoke: syncHaoke,zhixuemeng:syncZhixuemeng }),
    connectHaoke,cancelHaoke,
    disconnectHaoke: async () => {
      if (haokeAuthorizing.current || haokeBusy.current) throw new Error('好课正在处理中，请稍候。');
      haokeAuthorizing.current = true; haokeEpoch.current++;
      try { if (!DEMO_MODE) await saveHaokeCredentials(null); setData(d => ({ ...d, haoke: { ...initialData.haoke } })); }
      finally { haokeAuthorizing.current = false; }
    },
    enableCanvasRenewal: async option => {
      if (canvasAuthorizing.current || canvasBusy.current || renewBusy.current) throw new Error('Canvas 正在处理中，请稍候。');
      if (latest.current.canvas.connected && latest.current.canvas.userId !== option.accountId) throw new Error('网页登录与当前 Canvas 账户不同，请先断开连接再切换账户。');
      if (latest.current.canvas.connected && latest.current.canvas.baseUrl !== 'https://canvas.tongji.edu.cn') throw new Error('自动更换目前适配同济 Canvas，请使用对应的学校连接。');
      canvasAuthorizing.current = true; canvasEpoch.current++; setRenewalBusy(true);
      try {
        const config: CanvasRenewal = { enabled: true, tokenId: option.id, purpose: option.purpose, accountId: option.accountId, lastAttempt: null, lastRotated: null, expiresAt: null, status: 'ready', message: '' };
        if (!DEMO_MODE) await clearCanvasRenewal();
        const renewed = DEMO_MODE ? (await demoDelay(), { ...config, lastAttempt: new Date().toISOString(), lastRotated: new Date().toISOString() }) : await prepareCanvasRenewal(config, true);
        const renewal={...renewed,lastSessionAttempt:new Date().toISOString(),lastSessionCheck:new Date().toISOString()};
        const snapshot = DEMO_MODE ? { userId: '10001', assignments: demoAssignments('canvas') } : await fetchCanvasAssignments('https://canvas.tongji.edu.cn');
        if (snapshot.userId !== option.accountId) throw new Error('Canvas 账户不一致，请重新连接。');
        setData(d => {
          const sameAccount = d.canvas.userId === snapshot.userId && d.canvas.baseUrl === 'https://canvas.tongji.edu.cn';
          const previous = sameAccount ? d.canvas : { ...d.canvas, assignments: [], preferences: {}, lastSync: null };
          return { ...d, canvas: { ...mergeCanvasHomework(previous, snapshot.assignments), baseUrl: 'https://canvas.tongji.edu.cn', userId: snapshot.userId, connected: true, lastSync: new Date().toISOString(), renewal } };
        });
      } finally { canvasAuthorizing.current = false; setRenewalBusy(false); }
    },
    disableCanvasRenewal: async () => {
      if (renewBusy.current || canvasAuthorizing.current) throw new Error('Canvas 正在处理中，请稍候。');
      setData(d => ({ ...d, canvas: { ...d.canvas, renewal: d.canvas.renewal ? { ...d.canvas.renewal, enabled: false } : undefined } }));
    },
    checkCanvasRenewal: () => maintainCanvas({rotate:true}),
    checkCanvasSession: () => maintainCanvas({checkNow:true}),
    connectCanvas: async (base, value) => {
      if (canvasAuthorizing.current || renewBusy.current || canvasBusy.current) throw new Error('Canvas 连接正在处理中，请稍候。');
      const baseUrl = canvasOrigin(base), token = canvasToken(value);
      canvasAuthorizing.current = true; canvasEpoch.current++;
      try {
        const snapshot = DEMO_MODE ? (await demoDelay(), { userId: '10001', assignments: demoAssignments('canvas') }) : await fetchCanvasSnapshot(baseUrl, token);
        if (!DEMO_MODE) { await saveCanvasToken(token); await clearCanvasRenewal(); }
        setData(d => {
          const sameAccount = d.canvas.baseUrl === baseUrl && d.canvas.userId === snapshot.userId;
          const now = new Date(), previous = sameAccount ? d.canvas : { ...d.canvas, assignments: [], preferences: {}, lastSync: null };
          return { ...d, canvas: { ...mergeCanvasHomework(previous, snapshot.assignments, now), authMode: 'personal-token', baseUrl, userId: snapshot.userId, connected: true, lastSync: now.toISOString(), renewal: undefined } };
        });
        setCanvasRevision(value => value + 1);
      } finally { canvasAuthorizing.current = false; }
    },
    disconnectCanvas: async () => {
      if (canvasAuthorizing.current || renewBusy.current || canvasBusy.current) throw new Error('Canvas 连接正在处理中，请稍候。');
      canvasAuthorizing.current = true; canvasEpoch.current++;
      try {
        if (!DEMO_MODE) { await saveCanvasToken(''); await clearCanvasRenewal(); }
        setData(d => ({ ...d, canvas: { ...d.canvas, connected: false, userId: null, assignments: [], preferences: {}, lastSync: null, renewal: undefined } }));
        setCanvasRevision(value => value + 1);
      } finally { canvasAuthorizing.current = false; }
    },
    toggleHomework: id => setData(d => {
      const platform = homeworkPlatform(id), state = d[platform], assignment = state.assignments.find(a => a.id === id);
      if (!assignment || state.preferences[id]?.deleted) return d;
      const completed = !homeworkCompleted(assignment);
      return { ...d, [platform]: { ...state,
        preferences: { ...state.preferences, [id]: { visibility: 'default', deleted: false, ...state.preferences[id], completedOverride: completed } },
        assignments: state.assignments.map(a => a.id === id ? { ...a, completed, completedOverride: completed } : a),
      } };
    }),
    setHomeworkPreference: (id, change) => setData(d => { const platform = homeworkPlatform(id); return { ...d, [platform]: changeHomeworkPreference(d[platform], id, change) }; }),
    clearHomeworkTrash: () => setData(d => ({ ...d, canvas: cleanHomeworkTrash(d.canvas, new Date(), true), haoke: cleanHomeworkTrash(d.haoke, new Date(), true),zhixuemeng:cleanHomeworkTrash(d.zhixuemeng,new Date(),true) })),
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value; }
