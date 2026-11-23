const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');require('tsx/cjs');
const {createDemoData}=require('../src/core/demo.ts');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const c=await browser.newContext({viewport:{width:440,height:956},locale:'zh-CN'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-12T04:00:00Z')});
 const day='2026-11-12',d=createDemoData(),task=(id,kind,time,done=false)=>({id,title:id,kind,time,date:day,duration:60,description:'测试事项',location:'',repeat:null,subtasks:[],completedDates:done?[day]:[],color:'#0066B3'});
 d.settings.language='zh-CN';d.settings.homeLayout='grouped';d.settings.collapsedCompleted={todo:true,course:true,homework:true};d.tasks=[task('已做待办','todo','14:00',true),task('未做待办','todo','15:00'),task('逾期待办','todo','09:00'),task('已下课','course','08:00'),task('未来课程','course','16:00')];d.timetables=[];
 d.canvas.connected=false;d.canvas.assignments=[{id:'test:1',title:'已做作业',courseId:'1',courseName:'测试',description:'说明',url:'https://canvas.tongji.edu.cn/courses/1/assignments/1',unlockAt:'2026-11-12T08:00:00+08:00',dueAt:'2026-11-12T23:59:00+08:00',completed:true,submitted:false}];d.haoke.connected=false;d.haoke.assignments=[];d.zhixuemeng.connected=false;d.zhixuemeng.assignments=[];
 await c.addInitScript(data=>{localStorage.setItem('tjmuse.demo.data.v021',JSON.stringify(data));localStorage.setItem('tjmuse.demo.daily-overview.v1','2026-11-12');},d);
 const b=name=>p.getByRole('button',{name,exact:true}),card=p.getByTestId('sheet-card'),close=async()=>{await b('关闭').click();await card.waitFor({state:'hidden'});await p.waitForTimeout(450);assert.equal(await card.count(),0,'X must not reopen an ancestor');};
 await p.goto('http://127.0.0.1:8081/?demo=021');await b('我的').waitFor();if(await p.getByTestId('daily-overview').isVisible())await b('开始今天').click();
 const page=p.getByTestId('day-content-'+day);
 for(const [category,name,title] of [['todo','To-do','已做待办']]){
  await page.getByTestId('completed-'+category).waitFor();assert.equal(await page.getByRole('button',{name:'查看 '+title,exact:true}).count(),0);
  await page.getByRole('button',{name:`展开已完成${name}（1）`,exact:true}).click();await page.getByRole('button',{name:'查看 '+title,exact:true}).waitFor();
 }
 assert.equal(await page.getByTestId('completed-course').count(),0);assert.equal(await page.getByTestId('completed-homework').count(),0);assert.equal(await page.getByRole('button',{name:'查看 已下课',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'查看 已做作业',exact:true}).count(),0);
 await p.screenshot({path:'artifacts/completed33-grouped.png'});
 await page.getByRole('button',{name:'取消完成 已做待办',exact:true}).click();assert.equal(await page.getByTestId('completed-todo').count(),0);await page.getByRole('button',{name:'完成 已做待办',exact:true}).waitFor();
 await page.getByRole('button',{name:'完成 已做待办',exact:true}).click();
 const cycles=[];
 for(let i=0;i<3;i++){
  await b('我的').click();await b('外观').click();await b('首页排版').click();await card.getByText('分类顺序',{exact:true}).waitFor();await close();cycles.push('layout');
  await b('外观').click();await b('主题颜色').click();await p.getByLabel('前景色',{exact:true}).waitFor();await close();cycles.push('theme');
 }
 for(const name of ['好课','智学盟']){
  await b('作业设置').click();await b(name+'设置').click();await b('账号自动登录设置').click();await p.getByLabel('登录密码',{exact:true}).waitFor();await close();cycles.push(name+'-login');
 }
 await b('作业设置').click();await b('作业显示设置').click();await card.getByText('作业显示设置',{exact:true}).waitFor();await close();cycles.push('homework-display');
 for(let i=0;i<12;i++){await b('关于我们').click();await b('关闭').dispatchEvent('click');await card.waitFor({state:'hidden'});}cycles.push('immediate-X-12');
 await b('作业设置').click();await b('Canvas设置').click();await b('自动更换令牌').click();await b('学校自动登录').click();await p.getByLabel('学校学号',{exact:true}).waitFor();await close();cycles.push('canvas-login');
 await b('外观').click();await b('首页排版').click();await b('按时间穿插').click();await close();await b('To-do').click();await page.getByTestId('completed-todo').waitFor();assert.equal(await page.getByTestId('completed-course').count(),0);assert.equal(await page.getByTestId('completed-homework').count(),0);await p.screenshot({path:'artifacts/completed33-timeline.png'});
 await b('编辑 未做待办').click();await p.getByLabel('TO-DO 名称',{exact:true}).fill('保存后的待办');await b('保存更改').click();await card.waitFor({state:'hidden'});await b('编辑 保存后的待办').waitFor();await p.waitForTimeout(500);assert.equal(await card.count(),0);
 await b('编辑 保存后的待办').click();await p.getByLabel('TO-DO 名称',{exact:true}).fill('不应保存的草稿');await close();assert.equal(await b('编辑 不应保存的草稿').count(),0);
 await b('编辑 未来课程').click();await p.getByLabel('课程名称',{exact:true}).waitFor();await close();assert.equal(await b('编辑课程').count(),0,'editor X must not reopen course details');
 assert.deepEqual(errors,[]);const report={passed:true,onlyTodoCompletedHistory:true,endedCoursesAndCompletedHomeworkHidden:true,completedCollapsedByDefault:true,uncheckingRestoresPending:true,timelineAndGrouped:true,menuCloseCycles:cycles,saveAndCancel:true,editorCloseNoDetailReopen:true,pageErrors:errors,nativePhoneVerified:false};fs.writeFileSync('.build-tools/qa-sheet-navigation33.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
