import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ZHIXUEMENG_READER} from '../src/core/zhixuemeng-reader';
import {zhixuemengCaptureScript,zhixuemengMonitorScript,trustedZhixuemengLogin} from '../src/services/zhixuemeng-page';
import {initialData} from '../src/core/defaults';
import {restoreData} from '../src/core/storage';
import {mergeCanvasHomework,changeHomeworkPreference,cleanHomeworkTrash} from '../src/core/homework-trash';
import {homeworkOn} from '../src/core/homework';
import {allHomework,allHomeworkPreferences,homeworkPlatform,platformName} from '../src/core/platforms';
import {profileCountry} from '../src/core/countries';
import {createTongjiLoginVault} from '../src/core/tongji-login';
const identity={id:'student-fixture',username:'test-account'};
async function readFixture(mode='normal'){
 const calls:{path:string;query:any}[]=[],reader=vm.runInNewContext('('+ZHIXUEMENG_READER+')');
 const request=async(path:string,query:any)=>{
  calls.push({path,query});
  if(path==='/sys/user/queryById')return {...identity,username:mode==='account'?'other':identity.username};
  let records:any[]=[];
  if(path.endsWith('/appList'))records=[{id:'class-user',courseCode:'math',courseName:'示例数学'}];
  if(path.endsWith('/todoList'))records=['10','20','30','99'].map((status,i)=>({id:'work'+i,title:'作业'+i,courseCode:'math',workCls:'10',content:'<p>说明</p>',startTime:'2026-11-10 08:00:00',endTime:i?'': '2026-11-16 13:30:34',createTime:'2026-11-10'}));
  if(path.endsWith('/eduCourseWorkUser/list'))records=['10','20','30','99'].map((workStatus,i)=>({id:'status'+i,courseCode:'math',userId:'student-fixture',workId:'work'+i,workStatus}));
  if(path.endsWith('/eduCourseWorkTi/list')){
   if(mode==='question-fails')throw Error('offline');
   records=[57,58,59,60].map((n,i)=>({id:'question'+i,workId:query.workId,question:'<p>请上传练习册第'+n+'页图片</p>',answer:'HIDDEN_ANSWER',explanation:'HIDDEN_EXPLANATION',userAnswer:'HIDDEN_STUDENT_DATA'}));
  }
  return {records,total:mode==='repeat'&&path.endsWith('/appList')?200:records.length};
 };
 const result=await reader(request,identity,identity.id);return {result:JSON.parse(JSON.stringify(result)),calls};
}
test('Zhixuemeng reads all question pages without answer/submission endpoints and maps 10/20/30 states',async()=>{
 const {result,calls}=await readFixture();assert.equal(result.assignments.length,4);const [pending,submitted,graded,unknown]=result.assignments;
 assert.equal(pending.submitted,false);assert.equal(submitted.submitted,true);assert.equal(graded.submitted,true);assert.equal(unknown.submitted,null);
 assert.equal(pending.dueAt,'2026-11-16T05:30:34.000Z');assert.equal(pending.createdAt,'2026-11-09T16:00:00.000Z');
 assert.equal(pending.id,'zhixuemeng:math:work0');assert.ok(pending.description.includes('第57页')&&pending.description.includes('第60页'));
 assert.equal(JSON.stringify(result).includes('HIDDEN_'),false);assert.ok(calls.every(c=>!/(add|update|submit)/i.test(c.path)));assert.ok(calls.every(c=>!c.query.userId||c.query.userId===identity.id));
});
test('Zhixuemeng stops incomplete or repetitive reads and account changes rather than replacing cache',async()=>{
 await assert.rejects(readFixture('repeat'),/repeated_page/);await assert.rejects(readFixture('question-fails'),/offline/);await assert.rejects(readFixture('account'),/account_changed/);
});
test('new platform persists completion/display/trash preferences separately and appears in Todo',async()=>{
 const {result}=await readFixture(),data=structuredClone(initialData),now=new Date('2026-11-12T00:00:00Z'),id=result.assignments[0].id;
 data.zhixuemeng={...mergeCanvasHomework(data.zhixuemeng,result.assignments,now),connected:true,userId:identity.id};
 assert.equal(platformName(homeworkPlatform(id)),'智学盟');assert.ok(homeworkOn(allHomework(data),'2026-11-12',data.settings,allHomeworkPreferences(data)).some(x=>x.id===id));
 data.zhixuemeng=changeHomeworkPreference(data.zhixuemeng,id,{visibility:'hide'},now);data.zhixuemeng.preferences[id]!.completedOverride=true;
 let restored=restoreData(JSON.parse(JSON.stringify(data)),now);assert.equal(restored.zhixuemeng.preferences[id]!.visibility,'hide');assert.equal(restored.zhixuemeng.assignments[0]!.completedOverride,true);
 restored.zhixuemeng=changeHomeworkPreference(restored.zhixuemeng,id,{deleted:true},now);restored=restoreData(restored,new Date('2026-11-13T00:00:00Z'));assert.equal(restored.zhixuemeng.preferences[id]!.deleted,true);
 restored.zhixuemeng=cleanHomeworkTrash(restored.zhixuemeng,new Date('2026-11-16T00:00:00Z'));assert.equal(restored.zhixuemeng.assignments.some(x=>x.id===id),false);
 assert.equal(restoreData({...data,zhixuemeng:undefined}).zhixuemeng.connected,false);assert.equal(restored.canvas.connected,false);
});
test('profile country resolves ISO codes in the selected language and upgrades legacy Chinese labels for display',()=>{
 assert.equal(profileCountry({region:'日本',regionCode:'JP'},'en-US'),'Japan');assert.equal(profileCountry({region:'日本',regionCode:'JP'},'es'),'Japón');assert.equal(profileCountry({region:'日本',regionCode:'JP'},'fr'),'Japon');
 assert.equal(profileCountry({region:'中国大陆'},'en-US'),'China');assert.equal(profileCountry({region:'personal region'},'ja'),'personal region');
});
test('official mobile bridge scripts parse and never include the start-attempt or submission endpoint',()=>{
 for(const s of [zhixuemengCaptureScript('fixture'),zhixuemengMonitorScript('fixture')]){new vm.Script(s);assert.equal(s.includes('/addList'),false);assert.equal(s.includes('updateCourseWorkUser'),false);}
 assert.equal(trustedZhixuemengLogin('https://h5.zhixuemeng.com/#/pages/login/login'),true);
 for(const s of ['http://h5.zhixuemeng.com/#/','https://h5.zhixuemeng.com.evil.test/#/','https://user:pass@h5.zhixuemeng.com/#/','https://h5.zhixuemeng.com/#/pages/class/banji_bjzy'])assert.equal(trustedZhixuemengLogin(s),false);
});
test('platform-specific account validation supports nonnumeric Zhixuemeng IDs without weakening student login defaults',async()=>{
 let raw:string|null=null;const adapter={get:async()=>raw,set:async(v:string)=>{raw=v;},remove:async()=>{raw=null;}};
 const original=createTongjiLoginVault(adapter);await assert.rejects(original.save('name@example.test','fixture-password',true));
 const custom=createTongjiLoginVault(adapter,(a,p)=>{if(!a||!p)throw Error('invalid');});await custom.save('name@example.test','fixture-password',true);assert.equal((await custom.status()).enabled,true);assert.equal(await custom.matches('name@example.test'),true);assert.equal(await custom.matches('other@example.test'),false);assert.equal(JSON.stringify(await custom.status()).includes('fixture-password'),false);
});
