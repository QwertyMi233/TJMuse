import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {initialData} from '../src/core/defaults';
import type {Task} from '../src/core/types';
import {restoreData} from '../src/core/storage';
import {taskPriority,priorityLabel} from '../src/core/task-priority';
import {parseFlexibleArguments,mergeFlexible} from '../src/core/ai-actions';
import {proposeTodos,readAISchedule,commitAIReply,undoAIReply} from '../src/core/ai-schedule';
import {plannerContext} from '../src/services/ai';
import {createWidgetRefresh} from '../src/core/widget-refresh';
import {widgetTimeline,sameWidgetView} from '../src/core/widget-agenda';
import {dateTime} from '../src/core/calendar';

const base=()=>structuredClone(initialData),day='2026-11-19';
const task:Task={id:'todo',title:'测试待办',description:'',location:'',date:day,time:'23:00',duration:30,color:'#0066B3',kind:'todo',repeat:null,subtasks:[],completedDates:[]};
const draft={title:task.title,description:'',location:'',date:day,time:'23:00',end_date:day,end_time:'23:30',flexible_id:null};

test('old records default to neither; four priority classes survive storage round trips',()=>{
  const d=base();d.tasks=[task];d.flexibleTasks=[{id:'f',title:'旧事项',description:'',completed:false}];
  const old=restoreData(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(taskPriority(old.tasks[0]),{important:false,urgent:false});assert.equal(priorityLabel(old.flexibleTasks[0]!),'不紧急不重要');
  const labels=[];
  for(const important of [false,true])for(const urgent of [false,true]){
    d.tasks=[{...task,important,urgent}];d.flexibleTasks=[{...d.flexibleTasks[0]!,important,urgent}];
    const roundTrip=restoreData(JSON.parse(JSON.stringify(d)));
    assert.deepEqual(taskPriority(roundTrip.tasks[0]),{important,urgent});assert.deepEqual(taskPriority(roundTrip.flexibleTasks[0]),{important,urgent});labels.push(priorityLabel(roundTrip.tasks[0]!));
  }
  assert.deepEqual(labels,['不紧急不重要','不重要紧急','重要不紧急','重要紧急']);
});

test('AI reads priorities in automatic plan context and queried schedules',()=>{
  const d=base();d.tasks=[{...task,important:true,urgent:false}];d.flexibleTasks=[{id:'f',title:'自由事项',description:'',completed:false,important:false,urgent:true}];
  const context=plannerContext(d,dateTime(day,'09:00'));
  assert.match(context,/"important":true,"urgent":false,"优先级":"重要不紧急"/);assert.match(context,/"important":false,"urgent":true,"优先级":"不重要紧急"/);
  const item=readAISchedule(d,JSON.stringify({from_date:day,to_date:day}))[0]!.tasks[0]!;
  assert.equal(item.important,true);assert.equal(item.urgent,false);assert.equal(item.priority,'重要不紧急');
});

test('AI scheduling carries flexible priority; omitted edits preserve flags and undo restores them',()=>{
  const d=base();d.flexibleTasks=[{id:'f',title:task.title,description:'',completed:false,important:true,urgent:true}];
  const p=proposeTodos(d,JSON.stringify({tasks:[{...draft,flexible_id:'f'}]}),'create',()=>task.id);
  assert.deepEqual(taskPriority(p.data.tasks[0]),{important:true,urgent:true});
  const {flexible_id,...details}=draft;
  const edit=proposeTodos(p.data,JSON.stringify({tasks:[{...details,task_id:task.id,title:'更改时间',time:'22:30'}]}),'update',()=> 'unused');
  assert.deepEqual(taskPriority(edit.data.tasks[0]),{important:true,urgent:true});
  const changed=proposeTodos(p.data,JSON.stringify({tasks:[{...details,task_id:task.id,important:false,urgent:false}]}),'update',()=> 'unused');
  const message={id:'reply',role:'assistant' as const,content:'已更新',date:day,createdAt:dateTime(day,'09:00').toISOString()};
  const saved=commitAIReply(p.data,message,[],changed.changes);
  assert.deepEqual(taskPriority(saved.tasks[0]),{important:false,urgent:false});assert.deepEqual(taskPriority(undoAIReply(saved,'reply').tasks[0]),{important:true,urgent:true});
  assert.throws(()=>proposeTodos(d,JSON.stringify({tasks:[{...draft,important:'true'}]}),'create',()=> 'x'),/开关/);
  assert.deepEqual(taskPriority(proposeTodos(base(),JSON.stringify({tasks:[draft]}),'create',()=> 'x').data.tasks[0]),{important:false,urgent:false});
});

test('AI-created flexible tasks accept booleans, reject coercion and retain default compatibility',()=>{
  const drafts=parseFlexibleArguments(JSON.stringify({tasks:[{title:'小事',description:'',important:true,urgent:false}]}));
  assert.deepEqual(taskPriority(mergeFlexible([],drafts,()=> 'f').added[0]),{important:true,urgent:false});
  assert.throws(()=>parseFlexibleArguments(JSON.stringify({tasks:[{title:'小事',description:'',urgent:1}]})),/开关/);
});

test('widget foreground refresh republishes an unchanged store using the current day',async()=>{
  let now=dateTime(day,'09:00');const d=base();d.tasks=[task];const published:ReturnType<typeof widgetTimeline>[]=[];
  const refresh=createWidgetRefresh({read:()=>d,publish:async data=>{published.push(widgetTimeline(data,now));}});
  await refresh.flush();assert.equal(published[0]![0]!.props.rows[0]!.title,task.title);
  now=dateTime('2026-11-20','09:00');await refresh.flush();
  assert.equal(published.length,2);assert.equal(published[1]![0]!.props.rows.length,0);assert.equal(published[1]![0]!.date.getTime(),now.getTime());refresh.dispose();
});

test('widget updates coalesce, use the latest state and recover after a failed write',async()=>{
  let current=base(),pending:(()=>void)|undefined,reported=0,fail=true;const seen:string[]=[];
  const refresh=createWidgetRefresh({read:()=>current,publish:async data=>{if(fail)throw new Error('failed');seen.push(data.tasks[0]?.title||'');},report:()=>reported++,setTimer:((fn:()=>void)=>{pending=fn;return 1;}) as any,clearTimer:(()=>{pending=undefined;}) as any});
  await refresh.flush();assert.equal(reported,1);fail=false;
  refresh.changed();current={...current,tasks:[task]};refresh.changed();pending!();await refresh.flush();assert.equal(seen.at(-1),task.title);
  refresh.changed();refresh.dispose();assert.equal(pending,undefined);await refresh.flush();
});

test('widget publication in flight queues the latest schedule without losing edits',async()=>{
  let current=base(),release!:()=>void;const seen:string[]=[];
  const refresh=createWidgetRefresh({read:()=>current,publish:async data=>{seen.push(data.tasks[0]?.title||'empty');if(seen.length===1)await new Promise<void>(resolve=>{release=resolve;});}});
  const flight=refresh.flush();await Promise.resolve();current={...current,tasks:[task]};void refresh.flush();release();await flight;
  assert.deepEqual(seen,['empty',task.title]);refresh.dispose();
});

// Exercise the production transport (not the web no-op) with the native SDK boundary.
function nativeTransport(os:'ios'|'android',sharedDirectory:string|null='file:///shared/'){
  let entries:any[]=[],snapshot:any,schedule:any;
  const Widget={updateTimeline:(value:any[])=>{entries=value;},getTimeline:async()=>entries,updateSnapshot:(value:any)=>{snapshot=value;}};
  const exports:any={},source=ts.transpileModule(readFileSync('src/services/widget-sync.native.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,require:(name:string)=>{
    if(name==='react-native')return {Platform:{OS:os}};
    if(name==='expo')return {requireOptionalNativeModule:()=>({schedule:(value:any)=>{schedule=value;}})};
    if(name==='expo-widgets')return {widgetsDirectory:sharedDirectory};
    if(name.includes('AgendaWidget'))return {__esModule:true,default:Widget};
    if(name.includes('widget-agenda'))return {sameWidgetView,widgetTimeline:(data:any)=>widgetTimeline(data,dateTime(day,'09:00'))};
    throw new Error(name);
  }});
  return {sync:exports.syncAgendaWidget as (data:any)=>Promise<void>,Widget,get entries(){return entries;},get snapshot(){return snapshot;},get schedule(){return schedule;}};
}
test('iOS transport writes and reads back todays actual rows plus future timeline',async()=>{
  const d=base();d.tasks=[task];const native=nativeTransport('ios');await native.sync(d);
  assert.equal(native.entries[0].props.rows[0].title,task.title);assert.ok(native.entries.length>7);
  native.Widget.getTimeline=async()=>native.entries.map(e=>({...e,props:Object.fromEntries(Object.entries(e.props).reverse())}));await native.sync(d);
  native.Widget.getTimeline=async()=>native.entries.map(e=>({...e,props:{...e.props,rows:[]}}));await assert.rejects(native.sync(d),/未写入/);
  native.Widget.getTimeline=async()=>[];await assert.rejects(native.sync(d),/未写入/);
  await assert.rejects(nativeTransport('ios',null).sync(d),/共享权限/);
});
test('Android transport saves todays rows and schedules expiry redraws',async()=>{
  const d=base();d.tasks=[task];const native=nativeTransport('android');await native.sync(d);
  assert.equal(native.snapshot.entries[0].view.rows[0].title,task.title);assert.equal(native.schedule.length,native.snapshot.entries.length);assert.equal(native.snapshot.entries.at(-1).view.rows.length,0);
});
