import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/core/defaults';
import {applyTodoChanges,commitAIReply,proposeTodos,readAISchedule,undoAIReply} from '../src/core/ai-schedule';
import {requestAIWithActions} from '../src/services/ai';
import type {AppData,Task,Message} from '../src/core/types';
const base=()=>structuredClone(initialData),json=(v:unknown)=>JSON.stringify(v);
const draft={title:'复习',description:'阅读笔记',location:'图书馆',date:'2026-11-06',time:'18:00',end_date:'2026-11-06',end_time:'19:00',flexible_id:null};
const message:Message={id:'reply',role:'assistant',date:'2026-11-05',createdAt:'2026-11-05T10:00:00Z',content:'已按要求安排。'};
const task=(id='old'):Task=>({id,title:'原任务',description:'',location:'',date:'2026-11-06',time:'17:00',duration:30,color:'#AAC4B5',kind:'todo',repeat:null,subtasks:[],completedDates:[]});
test('AI creates timed todos with an explicit end, including cross-midnight tasks, without mutating the snapshot',()=>{
  const data=base();const p=proposeTodos(data,json({tasks:[{...draft,time:'23:30',end_date:'2026-11-07',end_time:'00:30'}]}),'create',()=> 'new');assert.equal(p.changes[0]!.after.duration,60);assert.equal(p.data.tasks.length,1);assert.equal(data.tasks.length,0);
  assert.throws(()=>proposeTodos(data,json({tasks:[{...draft,end_time:'17:00'}]}),'create',()=> 'x'),/结束时间/);
  assert.throws(()=>proposeTodos(data,json({tasks:[{...draft,date:'2026-02-30'}]}),'create',()=> 'x'),/有效/);
  assert.throws(()=>proposeTodos(data,json({tasks:[{...draft,kind:'course'}]}),'create',()=> 'x'),/无效字段/);
});
test('AI refuses time conflicts, including the next day of a cross-day course, and a rejected batch is atomic',()=>{
  const data=base();data.tasks=[{...task(),kind:'course',date:'2026-11-05',time:'23:30',duration:120}];
  assert.throws(()=>proposeTodos(data,json({tasks:[{...draft,time:'00:20',end_time:'00:50'}]}),'create',()=> 'x'),/冲突/);
  let n=0;assert.throws(()=>proposeTodos(data,json({tasks:[draft,{...draft,title:'重叠任务'}]}),'create',()=>`x${n++}`),/冲突/);assert.equal(data.tasks.length,1);
});
test('AI updates only local single todos and preserves unrelated fields; exact duplicate creates are skipped',()=>{
  const data=base();data.tasks=[task()];const {flexible_id,...fields}=draft;
  const p=proposeTodos(data,json({tasks:[{...fields,task_id:'old'}]}),'update',()=> 'unused');assert.equal(p.data.tasks[0]!.id,'old');assert.equal(p.data.tasks[0]!.color,data.tasks[0]!.color);
  const duplicate=proposeTodos(p.data,json({tasks:[draft]}),'create',()=> 'new');assert.equal(duplicate.duplicates,1);assert.equal(duplicate.changes.length,0);
  for(const protectedTask of [{...task(),kind:'course' as const},{...task(),homeworkId:'1:1'},{...task(),repeat:{interval:1,unit:'day' as const,weekdays:[],weekStartsOn:1 as const}}]){const d=base();d.tasks=[protectedTask];assert.throws(()=>proposeTodos(d,json({tasks:[{...fields,task_id:'old'}]}),'update',()=> 'x'),/本机一次性/);}
});
test('scheduled flexible tasks move into the dated list and can be undone without losing their descriptions',()=>{
  const data=base();data.flexibleTasks=[{id:'f',title:'复习',description:'阅读笔记',completed:false}];
  const plan=proposeTodos(data,json({tasks:[{...draft,flexible_id:'f'}]}),'create',()=> 'new');const saved=commitAIReply(data,message,[],plan.changes);assert.equal(saved.flexibleTasks.length,0);assert.equal(saved.tasks.length,1);assert.ok(saved.messages[0]!.aiUndo);
  const restored=undoAIReply(saved,'reply');assert.deepEqual(restored.tasks,[]);assert.deepEqual(restored.flexibleTasks,data.flexibleTasks);assert.equal(restored.messages[0]!.aiUndo,undefined);
});
test('commit rechecks task edits, latest conflicts and permissions; rejected writes do not claim success',()=>{
  const data=base();data.tasks=[task()];const {flexible_id,...fields}=draft;const plan=proposeTodos(data,json({tasks:[{...fields,task_id:'old'}]}),'update',()=> 'x');
  const edited=structuredClone(data);edited.tasks[0]!.title='用户刚修改';assert.throws(()=>applyTodoChanges(edited,plan.changes),/已改变/);
  const clash=structuredClone(data);clash.tasks.push({...task('other'),time:'18:15'});assert.throws(()=>applyTodoChanges(clash,plan.changes),/冲突/);
  const disabled=structuredClone(data);disabled.settings.aiWriteEnabled=false;const result=commitAIReply(disabled,message,[],plan.changes);assert.deepEqual(result.tasks,disabled.tasks);assert.match(result.messages[0]!.content,/没有写入/);assert.equal(result.messages[0]!.aiUndo,undefined);
});
test('one-click undo preserves later unrelated edits and refuses to overwrite a changed AI task',()=>{
  const data=base();data.tasks=[task()];const plan=proposeTodos(data,json({tasks:[draft]}),'create',()=> 'new');const saved=commitAIReply(data,message,[{title:'散步',description:''}],plan.changes);
  const later=structuredClone(saved);later.tasks[0]!.title='后来编辑的无关任务';const undone=undoAIReply(later,message.id);assert.equal(undone.tasks.length,1);assert.equal(undone.tasks[0]!.title,'后来编辑的无关任务');assert.equal(undone.flexibleTasks.length,0);
  const changed=structuredClone(saved);changed.tasks.find(t=>t.id==='new')!.title='用户改名';const blocked=undoAIReply(changed,message.id);assert.equal(blocked.tasks.length,2);assert.match(blocked.messages[0]!.content,/无法安全撤销/);
  const readonly=commitAIReply(saved,{...message,id:'suggestion'},[],[]);assert.ok(readonly.messages.find(m=>m.id==='reply')?.aiUndo);
});
test('schedule lookup includes stable editable IDs and bounds query size',()=>{
  const data=base();data.tasks=[task()];const days=readAISchedule(data,json({from_date:'2026-11-06',to_date:'2026-11-06'}));assert.equal(days[0]!.tasks[0]!.id,'old');assert.equal(days[0]!.tasks[0]!.editable,true);
  assert.throws(()=>readAISchedule(data,json({from_date:'2026-11-06',to_date:'2027-11-06'})),/31天/);
});
test('GPT and DeepSeek stage writes via tool calls, preserving reasoning content; errors and truncation commit nothing',async()=>{
  const original=globalThis.fetch;
  try{
    for(const provider of ['openai','deepseek'] as const){let count=0;const data=base();data.settings.provider=provider;
      globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));count++;assert.ok(body.tools.some((t:any)=>t.function.name==='create_todos'));
        if(count===1)return new Response(json({choices:[{message:{content:null,reasoning_content:'private reasoning fixture',tool_calls:[{id:'c1',type:'function',function:{name:'create_todos',arguments:json({tasks:[draft]})}}]}}]}));
        assert.equal(body.messages.at(-1).role,'tool');assert.equal(body.messages.at(-2).reasoning_content,'private reasoning fixture');return new Response(json({choices:[{message:{content:'已安排。'},finish_reason:'stop'}]}));};
      const reply=await requestAIWithActions(data,'fixture',[{role:'user',content:'明晚安排复习'}],undefined,undefined,true);assert.equal(reply.todoChanges.length,1);assert.equal(data.tasks.length,0);
    }
    let count=0;globalThis.fetch=async()=>new Response(json(++count===1?{choices:[{message:{tool_calls:[{id:'c',type:'function',function:{name:'create_todos',arguments:json({tasks:[draft]})}}]}}]}:{choices:[{message:{content:'截断'},finish_reason:'length'}]}));
    await assert.rejects(requestAIWithActions(base(),'fixture',[{role:'user',content:'安排任务'}],undefined,undefined,true),/尚未保存/);
  }finally{globalThis.fetch=original;}
});
test('automatic planning and disabled writes never expose mutation tools',async()=>{
  const original=globalThis.fetch;try{globalThis.fetch=async(_u,init)=>{const body=JSON.parse(String(init?.body));assert.equal(body.tools,undefined);return new Response(json({choices:[{message:{content:'建议'},finish_reason:'stop'}]}));};
    await requestAIWithActions(base(),'fixture',[{role:'user',content:'建议'}]);const disabled=base();disabled.settings.aiWriteEnabled=false;await requestAIWithActions(disabled,'fixture',[{role:'user',content:'安排'}],undefined,undefined,true);
  }finally{globalThis.fetch=original;}
});
test('cancelling after staged tool calls returns no write outcome and leaves source data unchanged',async()=>{
  const original=globalThis.fetch,controller=new AbortController(),data=base();let count=0;
  try{globalThis.fetch=async()=>{
    if(++count===1)return new Response(json({choices:[{message:{tool_calls:[{id:'c',type:'function',function:{name:'create_todos',arguments:json({tasks:[draft]})}}]}}]}));
    controller.abort();throw new DOMException('cancelled','AbortError');
  };await assert.rejects(requestAIWithActions(data,'fixture',[{role:'user',content:'安排'}],undefined,controller.signal,true),/已取消/);assert.equal(data.tasks.length,0);
  }finally{globalThis.fetch=original;}
});
