const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
 try{
 const context=await browser.newContext({viewport:{width:393,height:852},locale:'zh-CN',timezoneId:'Asia/Singapore'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:new Date('2026-10-29T08:00:00+08:00')});
 await context.route('https://cdn.jsdelivr.net/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8081');const button=name=>page.getByRole('button',{name,exact:true});
 await page.getByLabel('学期第一周内的任意一天',{exact:true}).fill('2026-09-14');await button('以这一周作为第 1 周').click();
 await page.getByText('第 7 周',{exact:true}).waitFor();await page.waitForTimeout(250);
 const scrollWeek=async direction=>{const box=await page.getByTestId('week-strip').boundingBox();const start=direction<0?.25:.75,end=direction<0?.75:.25;await page.mouse.move(box.x+box.width*start,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*end,box.y+box.height/2,{steps:12});await page.mouse.up();};
 await scrollWeek(-1);await page.getByText('第 6 周',{exact:true}).waitFor();await button('下一周').click();await page.getByText('第 7 周',{exact:true}).waitFor();await page.waitForTimeout(250);
 await scrollWeek(1);await page.getByText('第 8 周',{exact:true}).waitFor();await button('上一周').click();await button('跳转到今天').click();
 await button('添加 To-do').click();await page.getByRole('textbox',{name:'TO-DO 名称',exact:true}).fill('普通任务');await button('确认添加').click();
 await button('我的').click();await button('AI 设置').click();await button('自定义').click();
 await page.getByRole('textbox',{name:'API Key',exact:true}).fill('fake-key');await page.getByRole('textbox',{name:'API BASE URL',exact:true}).fill('https://ai.example.test/v1');await page.getByRole('textbox',{name:'模型名称',exact:true}).fill('tool-model');await button('保存 AI 设置').click();
 await context.route('https://ai.example.test/v1/chat/completions',route=>{
  const body=route.request().postDataJSON();let message={content:'今天按计划完成任务。'};
  if(body.tools){message=body.messages.at(-1).role==='tool'?{content:'已记录阅读事项。'}:{content:null,tool_calls:[{id:'add_reading',type:'function',function:{name:'add_flexible_tasks',arguments:JSON.stringify({tasks:[{title:'阅读 10 页',description:'每天积累一点'}]})}}]};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}]})});
 });
 await button('AI').click();await page.getByText('Muse 的时间提案',{exact:true}).waitFor();
 for(let i=0;i<2;i++){
 await page.getByRole('textbox',{name:'和 AI 聊聊安排',exact:true}).fill('帮我添加一件小事：阅读 10 页');await button('发送消息').click();await page.getByText('Muse 的时间提案',{exact:true}).nth(i+1).waitFor();}
 assert.equal(await button('编辑自由事项 阅读 10 页').count(),1);
 const assignment=(id,title,hour)=>({id:`1:${id}`,courseId:'1',courseName:'数学',title,description:'完成课后练习',unlockAt:hour===null?null:`2026-10-29T${hour}:00:00+08:00`,dueAt:hour===null?null:`2026-10-29T${hour}:00:00+08:00`,url:`https://canvas.tongji.edu.cn/courses/1/assignments/${id}`,submitted:false,completed:false});
 let assignments=[assignment(1,'早作业','08'),assignment(2,'晚作业','22'),assignment(3,'无截止作业',null),{...assignment(4,'跨日作业','18'),unlockAt:'2026-10-28T10:00:00+08:00',dueAt:'2026-10-30T18:00:00+08:00'},{...assignment(5,'已交作业','14'),unlockAt:'2026-10-28T10:00:00+08:00',dueAt:'2026-10-31T14:00:00+08:00',submitted:true}],fail=false,userId=10;
 await context.route('https://canvas.tongji.edu.cn/api/v1/**',route=>{
  const url=new URL(route.request().url()),auth=route.request().headers().authorization;
  assert.equal(route.request().method(),'GET');assert.ok(!url.href.includes('test-personal-token'));
  if(auth==='Bearer invalid-token')return route.fulfill({status:401,body:'invalid'});
  assert.equal(auth,'Bearer test-personal-token');
  if(fail)return route.fulfill({status:502,body:'sync failed'});
  const body=url.pathname.endsWith('/profile')?{id:userId}:url.pathname.endsWith('/courses')?[{id:1,name:'数学'}]:assignments.map(a=>({id:a.id.split(':')[1],name:a.title,description:a.description,unlock_at:a.unlockAt,created_at:'2026-10-27T08:00:00+08:00',due_at:a.dueAt,html_url:a.url,submission:{workflow_state:a.submitted?'submitted':'unsubmitted'}}));
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 await button('作业').click();await button('连接 Canvas').click();
 assert.equal(await page.getByRole('textbox',{name:'Canvas 网站地址',exact:true}).inputValue(),'https://canvas.tongji.edu.cn');
 await page.getByLabel('个人访问令牌',{exact:true}).fill('test-personal-token');await button('验证令牌并同步').click();
 await button('查看作业 早作业').waitFor({timeout:20000});
 await button('Canvas 连接设置').click();assert.equal(await page.getByLabel('个人访问令牌',{exact:true}).inputValue(),'');
 await page.getByLabel('个人访问令牌',{exact:true}).fill('invalid-token');await button('验证令牌并同步').click();await page.getByText(/Canvas 令牌无效/).first().waitFor();await button('关闭').click();
 await button('同步 Canvas 作业').click();await button('查看作业 早作业').waitFor();
 await button('查看作业 已交作业').waitFor();await button('折叠已提交作业（1）').click();assert.equal(await button('查看作业 已交作业').count(),0);
 await button('To-do').click();await button('查看 跨日作业').waitFor();await page.getByText('截止 2026-10-30 18:00 · Canvas 作业',{exact:true}).waitFor();
 assert.equal(await button('查看 已交作业').count(),0);await button('展开已提交作业（1）').click();await button('查看 已交作业').waitFor();await button('折叠已提交作业（1）').click();
 const day=async key=>{await page.getByRole('button',{name:new RegExp('^'+key+'(?: 今天)?$')}).click();await page.waitForTimeout(100);};
 for(const [key,visible] of [['2026-10-27',false],['2026-10-28',true],['2026-10-29',true],['2026-10-30',true],['2026-10-31',false]]){await day(key);assert.equal(await button('查看 跨日作业').count(),visible?1:0);}
 await day('2026-10-29');await button('完成 跨日作业').click();await day('2026-10-30');await button('取消完成 跨日作业').waitFor();await button('取消完成 跨日作业').click();await day('2026-10-28');await button('完成 跨日作业').waitFor();await day('2026-10-29');await button('作业').click();
 const order=async()=>page.getByRole('button',{name:/^查看 (普通任务|早作业|晚作业)$/}).evaluateAll(elements=>elements.map(el=>el.getAttribute('aria-label')));
 await button('To-do').click();await button('查看 普通任务').waitFor();assert.deepEqual(await order(),['查看 早作业','查看 普通任务','查看 晚作业']);assert.equal(await button('查看 无截止作业').count(),0);
 for(const [choice,expected] of [['置于顶部',['查看 早作业','查看 晚作业','查看 普通任务']],['置于底部',['查看 普通任务','查看 早作业','查看 晚作业']]]){
 await button('作业').click();await button(choice).click();await button('To-do').click();await button('查看 普通任务').waitFor();assert.deepEqual(await order(),expected);}
 await button('完成 早作业').click();await button('作业').click();await button('查看作业 早作业').waitFor();await button('同步 Canvas 作业').click();await button('To-do').click();await button('查看 普通任务').waitFor();await button('取消完成 早作业').waitFor();
 await button('作业').click();await button('Canvas 连接设置').click();await page.getByLabel('个人访问令牌',{exact:true}).fill('test-personal-token');await button('验证令牌并同步').click();await button('取消完成作业 早作业').waitFor();await button('To-do').click();await button('查看 普通任务').waitFor();
 fail=true;await button('作业').click();await button('同步 Canvas 作业').click();await page.getByText(/已有作业已保留/).first().waitFor();await button('查看作业 晚作业').waitFor();
 await page.screenshot({path:'artifacts/canvas-homework.png'});await button('To-do').click();await button('查看 普通任务').waitFor();
 const saved=await page.evaluate(()=>localStorage.getItem('tjmuse.data.v1'));assert.ok(!saved.includes('test-personal-token'));assert.ok(!saved.includes('invalid-token'));assert.equal(JSON.parse(saved).settings.homeworkPlacement,'bottom');assert.equal(JSON.parse(saved).settings.collapseSubmittedHomework,true);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tjmuse.data.v1')).canvas.assignments.some(a=>a.title==='早作业'&&a.completed));await page.reload();await button('查看 普通任务').waitFor();await button('取消完成 早作业').waitFor();assert.deepEqual(await order(),['查看 普通任务','查看 早作业','查看 晚作业']);
 await button('展开已提交作业（1）').waitFor();assert.equal(await button('查看 已交作业').count(),0);
 for(const width of [320,393,768]){await page.setViewportSize({width,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 fail=false;userId=20;await button('作业').click();await button('Canvas 连接设置').click();await page.getByLabel('个人访问令牌',{exact:true}).fill('test-personal-token');await button('验证令牌并同步').click();await button('完成作业 早作业').waitFor();
 await button('Canvas 连接设置').click();await button('断开 Canvas 连接').click();await button('确认').click();await button('连接 Canvas').waitFor();assert.equal(await button('查看作业 早作业').count(),0);
 await button('To-do').click();await button('查看 普通任务').waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',submittedHomeworkFolding:true,foldChoiceSurvivesReload:true,assignmentWindowInclusive:true,assignmentCompletionShared:true,deadlineDateVisible:true,dateSwiping:true,arrowsRetained:true,aiAddsAndDeduplicates:true,canvasPersonalTokenMock:true,failedTokenKeepsConnection:true,tokenRenewalKeepsCompletion:true,accountSwitchResetsCompletion:true,disconnectClearsCache:true,assignmentPositions:true,cacheSurvivesFailure:true,tokenNotPersistedOnWeb:true,pageErrors:errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
