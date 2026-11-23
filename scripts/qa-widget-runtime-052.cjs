// Run the installed native widget JavaScript runtimes with real agenda props.
// This validates serialized layout/data, not WidgetKit/launcher permissions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
require('tsx/cjs');
const {initialData}=require('../src/core/defaults.ts'),{widgetTimeline}=require('../src/core/widget-agenda.ts'),{dateTime}=require('../src/core/calendar.ts');
const data=structuredClone(initialData),day='2026-11-19',now=dateTime(day,'09:00');
data.settings.semesterStartDate='2026-11-16';
data.tasks=[{id:'widget-task',title:'Widget task',description:'',location:'Room A',date:day,time:'12:00',duration:30,color:'#0066B3',kind:'todo',repeat:null,subtasks:[],completedDates:[]}];
const entries=widgetTimeline(data,now),results=[];
for(const [platform,runtime,registry] of [
 ['ios','.build-tools/widget-runtime36.js','.build-tools/widget-layout36.json'],
 ['android','node_modules/expo-widgets/android/build/generated/expo-widgets/res/raw/expo_widgets_bundle.bundle','node_modules/expo-widgets/android/build/generated/expo-widgets/res/raw/expo_widgets_layout_registry.json']
]){
 let timestamp=now.getTime();
 class Clock extends Date{constructor(...args){super(...(args.length?args:[timestamp]));}static now(){return timestamp;}}
 const context=vm.createContext({Date:Clock});vm.runInContext(fs.readFileSync(runtime,'utf8'),context);
 context.layout=JSON.parse(fs.readFileSync(registry,'utf8')).widgets.DailyAgenda.layout;
 vm.runInContext('__expoWidgetLayout=eval("("+layout+")")',context);
 function render(at){timestamp=at;const view=[...entries].reverse().find(e=>e.date.getTime()<=at).props,props=platform==='ios'?view:{entries:entries.map(e=>({timestamp:e.date.getTime(),view:e.props}))};return JSON.stringify(context.__expoWidgetRender(props,{colorScheme:'light',timestamp:at}));}
 const first=render(now.getTime());assert.ok(first.includes('Widget task'));assert.ok(!first.includes('Open TJMuse to sync your day'));
 const expired=render(dateTime(day,'12:30').getTime());assert.ok(!expired.includes('Widget task'));assert.ok(!expired.includes('Open TJMuse to sync your day'));
 const tomorrow=render(dateTime('2026-11-20','09:00').getTime());assert.ok(!tomorrow.includes('Widget task'));assert.ok(!tomorrow.includes('Open TJMuse to sync your day'));
 results.push({platform,realSerializedRuntime:true,todayRendersTask:true,elapsedTaskHidden:true,nextDayChanges:true,initialPlaceholderReplaced:true});
}
const report={passed:true,results,nativeDesktopRenderVerified:false};fs.writeFileSync('.build-tools/qa-widget-runtime37.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
