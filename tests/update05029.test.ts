import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initialData} from '../src/core/defaults';
import {DEFAULT_PERIODS,timetableTasksOn} from '../src/core/timetable';
import {courseRecordId,readCourseRecords,proposeCourseRecordActions} from '../src/core/course-record-actions';
import {commitAIReply,undoAIReply} from '../src/core/ai-schedule';
import {restoreData} from '../src/core/storage';
import {requestAIWithActions} from '../src/services/ai';
import {createTongjiLoginVault,completeReservedLogin} from '../src/core/tongji-login';
import {canUseSavedPlatformLogin} from '../src/core/session-login-policy';
import {canvasManualTokenScript} from '../src/services/canvas-manual-token';
import {haokeStudentLoginScript,HAOKE_STUDENT_LOGIN_URL} from '../src/services/haoke-login-script';
import {zhixuemengLoginScript} from '../src/services/zhixuemeng-page';
const message={id:'course-ai-reply',role:'assistant' as const,content:'已按要求调整。',date:'2026-11-13',createdAt:'2026-11-13T01:00:00Z'};
function fixture(){const d=structuredClone(initialData);d.timetables=[{id:'table:1',name:'测试课表',enabled:true,semesterStartDate:'2026-11-09',weekStartsOn:1,importedAt:'2026-11-09T00:00:00Z',periods:DEFAULT_PERIODS.map(p=>({...p})),sessions:[{id:'monday:1',title:'数学',teacher:'教师',location:'北101',weekday:1,startPeriod:1,endPeriod:2,weeks:[1,2,3]},{id:'wednesday',title:'数学',teacher:'教师',location:'南102',weekday:3,startPeriod:3,endPeriod:4,weeks:[1,2,3]}]}];d.tasks=[];return d;}
const id=courseRecordId('table:1','monday:1'),other=courseRecordId('table:1','wednesday');
const update=(changes:unknown)=>JSON.stringify({items:[{course_id:id,changes}]});
const remove=(scope='session',date:string|null=null,course_id=id)=>JSON.stringify({items:[{course_id,scope,date}]});

test('saved Haoke and Zhixuemeng logins work in manual and background session presentation; Canvas browser stays manual',()=>{
 const ready={enabled:true,studentId:'202••01',state:'ready' as const,lastSuccess:null};
 assert.equal(canUseSavedPlatformLogin('haoke-login',ready),true);assert.equal(canUseSavedPlatformLogin('zhixuemeng-sync',ready),true);assert.equal(canUseSavedPlatformLogin('canvas-browser',ready),false);
 assert.equal(canUseSavedPlatformLogin('haoke-login',{...ready,enabled:false}),false);assert.equal(canUseSavedPlatformLogin('haoke-login',{...ready,state:'needs-user'}),false);
});
test('old ambiguous blocked credentials get one recovery while new confirmed rejections survive restarts',async()=>{
 let raw=JSON.stringify({id:'legacy',attemptId:'old',studentId:'20260001',password:'fixture-only',state:'needs-user',blocked:true,lastAttempt:'2026-11-01T00:00:00Z',lastSuccess:null});
 const store={get:async()=>raw,set:async(v:string)=>{raw=v;},remove:async()=>{raw='';}};
 const vault=createTongjiLoginVault(store);assert.equal((await vault.status()).state,'ready');const attempt=(await vault.reserve())!;await vault.failed(attempt.id,attempt.attemptId!,'credentials-rejected');
 assert.equal((await createTongjiLoginVault(store).status()).state,'needs-user');assert.equal(await createTongjiLoginVault(store).reserve(),null);
});
test('native account verification failure releases the login lease without requiring an app restart',async()=>{
 let raw:string|null=null;const vault=createTongjiLoginVault({get:async()=>raw,set:async v=>{raw=v;},remove:async()=>{raw=null;}});await vault.save('20260001','fixture-only',true);
 const first=(await vault.reserve())!;await assert.rejects(completeReservedLogin({id:first.id,attemptId:first.attemptId!},vault,async()=>{throw Error('network_down_after_web_login');}));assert.equal((await vault.status()).state,'ready');
 const next=(await vault.reserve())!;assert.ok(next);assert.equal(await completeReservedLogin({id:next.id,attemptId:next.attemptId!},vault,async()=>'verified'),'verified');assert.equal((await vault.status()).state,'ready');assert.ok((await vault.status()).lastSuccess);
});
test('Haoke form detection polls again when native layout becomes visible without a DOM mutation',()=>{
 const timers:Function[]=[],messages:any[]=[];let visible=false;
 const label:any={textContent:'一周内自动登录',getBoundingClientRect:()=>({width:visible?100:0,height:visible?20:0}),querySelector:()=>({checked:true})};
 const form:any={getBoundingClientRect:()=>({width:visible?100:0,height:visible?100:0}),hasAttribute:()=>false,querySelector:(s:string)=>s==='.el-select__placeholder'?{textContent:'同济大学'}:s.startsWith('button')?{getBoundingClientRect:()=>({width:100,height:20})}:null,querySelectorAll:(s:string)=>s.includes('label')?[label]:[{}]};
 form.querySelectorAll=(s:string)=>s.includes('label')?[label]:[{getBoundingClientRect:()=>({width:visible?100:0,height:visible?20:0})}];
 const win:any={ReactNativeWebView:{postMessage:(s:string)=>messages.push(JSON.parse(s))}};win.top=win.self=win;
 const context={window:win,location:{origin:'https://passport.aihaoke.net',pathname:'/auth/login',href:HAOKE_STUDENT_LOGIN_URL},URL,getComputedStyle:()=>({visibility:'visible'}),document:{documentElement:{},querySelectorAll:(s:string)=>s==='form.tab-pane.active'?[form]:[]},MutationObserver:class{observe(){}disconnect(){}},setInterval:(fn:Function)=>{timers.push(fn);return 1;},clearInterval:()=>{},setTimeout:()=>{}};
 vm.runInNewContext(haokeStudentLoginScript('layout'),context);assert.equal(messages.some(m=>m.status==='form-ready'),false);visible=true;timers[0]!();assert.equal(messages.filter(m=>m.status==='form-ready').length,1);
});
test('Canvas manual read returns a revealed token only on request and never mutates or regenerates tokens',async()=>{
 const messages:any[]=[],secret='fixture-token-'.repeat(5);let requests=0;
 const win:any={fetch:async()=>{requests++;return {clone:()=>({json:async()=>({visible_token:secret})})};},ReactNativeWebView:{postMessage:(s:string)=>messages.push(JSON.parse(s))}};win.top=win.self=win;
 const XHR:any=function(){};XHR.prototype={open(){},send(){}};
 const context=vm.createContext({window:win,location:{origin:'https://canvas.tongji.edu.cn',pathname:'/profile/settings',href:'https://canvas.tongji.edu.cn/profile/settings'},URL,XMLHttpRequest:XHR,document:{querySelectorAll:()=>[]}});
 const setup=canvasManualTokenScript('token','https://canvas.tongji.edu.cn');assert.doesNotThrow(()=>new vm.Script(setup));vm.runInContext(setup,context);assert.equal(requests,0);assert.equal(messages.length,0);
 await win.fetch('/profile/tokens',{method:'POST'});await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.length,0);
 vm.runInContext(canvasManualTokenScript('token','https://canvas.tongji.edu.cn',true),context);assert.equal(messages[0].token,secret);assert.equal(requests,1);
 const foreign={...context,location:{origin:'https://example.test',pathname:'/profile/settings'}};assert.doesNotThrow(()=>vm.runInNewContext(setup,foreign));
});
test('Zhixuemeng blocks confirmed credential errors, while transient server errors remain retryable',async()=>{
 const messages:any[]=[];let response={code:500,success:false,message:'服务器暂时不可用'};
 const win:any={fetch:async()=>({clone:()=>({json:async()=>response})}),ReactNativeWebView:{postMessage:(s:string)=>messages.push(JSON.parse(s))}};win.top=win.self=win;
 vm.runInNewContext(zhixuemengLoginScript('classify'),{window:win,URL,location:{origin:'https://h5.zhixuemeng.com',hash:'#/pages/login/login',href:'https://h5.zhixuemeng.com/#/pages/login/login'},setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>{},document:{querySelectorAll:()=>[]}});
 win.__tjmuseZxmSubmitting=true;await win.fetch('https://admin.zhixuemeng.com/jeecg-boot/sys/mLogin');await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.at(-1).status,'page-not-ready');
 response={code:500,success:false,message:'用户名或密码错误'};await win.fetch('https://admin.zhixuemeng.com/jeecg-boot/sys/mLogin');await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.at(-1).status,'credentials-rejected');
});
test('course edits change time, weekday, weeks and details for the exact record and support atomic undo',()=>{
 const d=fixture(),before=structuredClone(d),proposed=proposeCourseRecordActions(d,update({title:'线性代数',teacher:'新教师',location:'北301',weekday:2,weeks:[1,3],start_period:5,end_period:6,start_time:'14:00',end_time:'15:30',color:'#0066B3'}),'update');
 assert.deepEqual(d,before);assert.equal(readCourseRecords(proposed.data,'线性代数').length,1);assert.equal(timetableTasksOn(proposed.data.timetables,'2026-11-10')[0]!.time,'14:00');assert.deepEqual(proposed.data.timetables[0]!.sessions[1],d.timetables[0]!.sessions[1]);
 const committed=commitAIReply(d,message,[],[],proposed.changes);assert.equal(committed.timetables[0]!.sessions[0]!.title,'线性代数');assert.deepEqual(undoAIReply(committed,message.id).timetables,d.timetables);
});
test('deleting one occurrence removes just its teaching week; deleting the last record preserves an empty timetable across restart',()=>{
 const d=fixture(),once=proposeCourseRecordActions(d,remove('occurrence','2026-11-16'),'delete');assert.deepEqual(once.data.timetables[0]!.sessions[0]!.weeks,[1,3]);assert.equal(timetableTasksOn(once.data.timetables,'2026-11-16').length,0);assert.equal(timetableTasksOn(once.data.timetables,'2026-11-09').length,1);
 const all=proposeCourseRecordActions(d,JSON.stringify({items:[{course_id:id,scope:'session',date:null},{course_id:other,scope:'session',date:null}]}),'delete');const committed=commitAIReply(d,message,[],[],all.changes);assert.equal(committed.timetables[0]!.sessions.length,0);assert.equal(restoreData(JSON.parse(JSON.stringify(committed))).timetables.length,1);assert.deepEqual(undoAIReply(committed,message.id).timetables,d.timetables);
});
test('course operations reject invalid batches and refuse to overwrite a concurrently edited course',()=>{
 const d=fixture(),before=structuredClone(d);assert.throws(()=>proposeCourseRecordActions(d,JSON.stringify({items:[{course_id:id,changes:{title:'暂存'}},{course_id:other,changes:{start_period:99}}]}),'update'));assert.deepEqual(d,before);
 const changes=proposeCourseRecordActions(d,update({title:'AI更改'}),'update').changes;d.timetables[0]!.sessions[0]!.title='人工更改';const saved=commitAIReply(d,message,[],[],changes);assert.equal(saved.timetables[0]!.sessions[0]!.title,'人工更改');assert.equal(saved.messages.at(-1)!.aiUndo,undefined);
});
test('legacy local course tasks can be edited and deleted without touching normal Todos',()=>{
 const d=fixture();d.tasks=[{id:'old-course',title:'旧课程',kind:'course',date:'2026-11-13',time:'08:00',duration:45,location:'',description:'',color:'#0066B3',repeat:null,subtasks:[],completedDates:[]}];d.tasks.push({...d.tasks[0]!,id:'keep-todo',kind:'todo'});
 const course_id=courseRecordId(undefined,undefined,'old-course');const edited=proposeCourseRecordActions(d,JSON.stringify({items:[{course_id,changes:{title:'新课程',start_time:'09:00',end_time:'10:00'}}]}),'update');assert.equal(edited.data.tasks[0]!.duration,60);assert.equal(edited.data.tasks[0]!.time,'09:00');assert.deepEqual(proposeCourseRecordActions(d,remove('session',null,course_id),'delete').data.tasks,[d.tasks[1]]);
});
test('AI queries course IDs, stages edits and deletion, and commits only after the complete reply',async()=>{
 const d=fixture(),original=global.fetch;let round=0;const calls:any[]=[{name:'get_courses',arguments:JSON.stringify({query:'数学'})},{name:'update_courses',arguments:update({location:'北301'})},{name:'delete_courses',arguments:remove('occurrence','2026-11-18',other)}];
 global.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.ok(body.tools.some((t:any)=>t.function.name==='delete_courses'));const call=calls[round++];return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:call?{role:'assistant',content:null,tool_calls:[{id:'course-call-'+round,type:'function',function:call}]}:{role:'assistant',content:'已按要求调整课程。'}}]}));};
 try{const out=await requestAIWithActions(d,'fixture-key',[{role:'user',content:'修改数学课程地点，并删除下周三的那次课程'}],undefined,undefined,true);assert.equal(out.stateChanges.length,2);assert.equal(d.timetables[0]!.sessions[0]!.location,'北101');const saved=commitAIReply(d,message,out.drafts,out.todoChanges,out.stateChanges);assert.equal(saved.timetables[0]!.sessions[0]!.location,'北301');assert.deepEqual(saved.timetables[0]!.sessions[1]!.weeks,[1,3]);assert.equal(round,4);}finally{global.fetch=original;}
});
