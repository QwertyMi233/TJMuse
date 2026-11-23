import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';

test('committed WebView helper literals match their source functions',()=>{
 const run=spawnSync(process.execPath,['scripts/build-webview-helpers.mjs','--check'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});

test('bytecode-style function serialization cannot break authenticated WebView reads or metadata cleaning',async()=>{
 const native=vm.createContext({});
 vm.runInContext('Function.prototype.toString=function(){return "function () { [bytecode] }";}',native);
 const cache=new Map<string,any>();
 function load(file:string):any{
  if(cache.has(file))return cache.get(file);
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const module={exports:{}};cache.set(file,module.exports);
  const factory=vm.runInContext('(function(require,module,exports){'+compiled+'\n})',native);
  factory((id:string)=>load(path.resolve(path.dirname(file),id+'.ts')),module,module.exports);
  return module.exports;
 }
 const adapter=load(path.resolve('src/services/zhixuemeng-page.ts'));
 const script=adapter.zhixuemengCaptureScript('bytecode-fixture','student');
 assert.doesNotThrow(()=>new vm.Script(script));
 const user={id:'student',username:'fixture'},messages:any[]=[],calls:string[]=[];
 const win:any={ReactNativeWebView:{postMessage:(s:string)=>messages.push(JSON.parse(s))}};win.top=win.self=win;
 await vm.runInNewContext(script,{
  window:win,location:{origin:'https://h5.zhixuemeng.com'},URL,AbortController,setTimeout,clearTimeout,
  localStorage:{getItem:(key:string)=>key==='login_user_info'?JSON.stringify(user):key==='Access-Token'?'fixture-token':null},
  fetch:async(raw:string)=>{
   const url=new URL(raw),endpoint=url.pathname.replace('/jeecg-boot','');calls.push(endpoint);
   const rows=endpoint.endsWith('/appList')?[{courseCode:'math',courseName:'数学'}]:endpoint.endsWith('/todoList')?[{id:'work',courseCode:'math',title:'作业',content:'生成 JSON 数据的章节范围 chapter_123456789\n1. 请完成练习册',workCls:'10'}]:endpoint.endsWith('/eduCourseWorkUser/list')?[]:endpoint.endsWith('/eduCourseWorkTi/list')?[57,58,59,60].map(n=>({id:'page'+n,question:'请上传第'+n+'页图片'})):null;
   return {status:200,ok:true,text:async()=>JSON.stringify({code:200,success:true,result:rows?{records:rows,total:rows.length}:user})};
  }
 });
 // The bridge ends with `true`; wait for its asynchronous read to finish.
 for(let i=0;i<30&&!messages.length;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages[0]?.error,undefined,JSON.stringify(messages));assert.equal(messages[0]?.snapshot?.assignments.length,1);
 const description=messages[0].snapshot.assignments[0].description;
 assert.ok(!/chapter_|生成 JSON/.test(description));for(const n of [57,58,59,60])assert.ok(description.includes('第'+n+'页'));
 assert.ok(calls.length===5&&calls.every(p=>!/(add|submit|update)/i.test(p)));
});
