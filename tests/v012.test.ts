import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyTasks } from '../src/core/homework';
import { initialData } from '../src/core/defaults';
import { mergeFlexible, parseFlexibleArguments } from '../src/core/ai-actions';
import { requestAIWithActions } from '../src/services/ai';
import { restoreData } from '../src/core/storage';
import type { Task, CanvasAssignment } from '../src/core/types';
const normal: Task = { id:'n',title:'普通任务',date:'2026-10-29',time:'09:00',duration:30,description:'',location:'',color:'#123B64',kind:'todo',repeat:null,subtasks:[],completedDates:[] };
const homework: CanvasAssignment = { id:'1:2',courseId:'1',courseName:'数学',title:'作业',description:'说明',dueAt:new Date(2026,9,29,8).toISOString(),url:'https://canvas.tongji.edu.cn/courses/1/assignments/2',submitted:false,completed:false };
test('homework placement changes ordering, preserving dates, no-deadline items and completion',()=>{
 assert.deepEqual(dailyTasks([normal],[homework],normal.date,'timeline').map(t=>t.title),['作业','普通任务']);
 assert.deepEqual(dailyTasks([normal],[{...homework,dueAt:new Date(2026,9,29,22).toISOString()}],normal.date,'top').map(t=>t.title),['作业','普通任务']);
 assert.deepEqual(dailyTasks([normal],[homework],normal.date,'bottom').map(t=>t.title),['普通任务','作业']);
 assert.equal(dailyTasks([], [{...homework,dueAt:null}],normal.date,'top').length,0);
 assert.equal(dailyTasks([], [homework],'2026-10-30','top').length,0);
 assert.deepEqual(dailyTasks([], [{...homework,completed:true}],normal.date,'top')[0]!.completedDates,[normal.date]);
});
test('old data gains Canvas defaults and placement survives reload',()=>{
 const data=structuredClone(initialData);data.settings.homeworkPlacement='bottom';data.settings.collapseSubmittedHomework=true;
 assert.equal(restoreData(data).settings.homeworkPlacement,'bottom');
 assert.equal(restoreData(data).settings.collapseSubmittedHomework,true);
 const old=JSON.parse(JSON.stringify(data));delete old.canvas;delete old.settings.homeworkPlacement;delete old.settings.collapseSubmittedHomework;
 assert.equal(restoreData(old).canvas.assignments.length,0);assert.equal(restoreData(old).settings.homeworkPlacement,'timeline');
 assert.equal(restoreData(old).settings.collapseSubmittedHomework,false);
});
test('AI action validation and deduplication do not modify existing items',()=>{
 assert.throws(()=>parseFlexibleArguments('{"tasks":[{"title":"","description":""}]}'));
 assert.throws(()=>parseFlexibleArguments('{"tasks":[],"delete":true}'));
 const existing=[{id:'a',title:'读书',description:'原说明',completed:true}];
 const result=mergeFlexible(existing,[{title:' 读书 ',description:'覆盖？'},{title:'散步',description:'校园'}],()=> 'b');
 assert.equal(result.added.length,1);assert.deepEqual(result.tasks[0],existing[0]);assert.equal(existing.length,1);
});
test('AI tools add drafts only on an authorized successful round; cancellations and failures save nothing',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls++;
  assert.equal(body.tools[0].function.name,'add_flexible_tasks');
  if(calls===1)return new Response(JSON.stringify({choices:[{message:{content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'add_flexible_tasks',arguments:JSON.stringify({tasks:[{title:'散步',description:'校园走走'}]})}}]}}]}));
  assert.equal(body.messages.at(-1).role,'tool');
  return new Response(JSON.stringify({choices:[{message:{content:'已记录。'},finish_reason:'stop'}]}));
 };
 const result=await requestAIWithActions(initialData,'test',[{role:'user',content:'帮我添加散步'}],undefined,undefined,true);
 assert.equal(result.drafts[0]!.title,'散步');assert.equal(initialData.flexibleTasks.length,0);
 calls=0;await assert.rejects(requestAIWithActions(initialData,'test',[],undefined,undefined,false));
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{tool_calls:[{id:'x',type:'function',function:{name:'delete_task',arguments:'{}'}}]}}]}));
 await assert.rejects(requestAIWithActions(initialData,'test',[],undefined,undefined,true),/未授权/);
 } finally{globalThis.fetch=original;}
});
