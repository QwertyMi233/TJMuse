import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CATEGORY_ORDER,moveCategory,normalizeCategoryOrder} from '../src/core/category-order';
import {initialData} from '../src/core/defaults';
import {restoreData} from '../src/core/storage';
import {homeGroups,homeTasksOn} from '../src/core/home-layout';

test('fresh and upgraded installs default to To-do, courses, homework without changing layout or collapse state',()=>{
  assert.deepEqual(initialData.settings.homeCategoryOrder,['todo','course','homework']);
  const old=JSON.parse(JSON.stringify(initialData));delete old.settings.homeCategoryOrder;
  old.settings.homeLayout='grouped';old.settings.collapsedCategories.course=true;old.settings.collapsedCompleted.todo=false;
  const data=restoreData(old);assert.deepEqual(data.settings.homeCategoryOrder,DEFAULT_CATEGORY_ORDER);
  assert.equal(data.settings.homeLayout,'grouped');assert.equal(data.settings.collapsedCategories.course,true);assert.equal(data.settings.collapsedCompleted.todo,false);
});
test('saved category order survives restart and invalid preferences cannot duplicate or hide a section',()=>{
  const data=structuredClone(initialData);data.settings.homeCategoryOrder=['homework','todo','course'];
  assert.deepEqual(restoreData(JSON.parse(JSON.stringify(data))).settings.homeCategoryOrder,['homework','todo','course']);
  for(const value of [undefined,null,{},'course',[]])assert.deepEqual(normalizeCategoryOrder(value),DEFAULT_CATEGORY_ORDER);
  assert.deepEqual(normalizeCategoryOrder(['homework','homework','invalid',4,null,'todo']),['homework','todo','course']);
});
test('drag moves a category between every position and never changes the original array',()=>{
  for(let from=0;from<3;from++)for(let to=0;to<3;to++){
    const original=[...DEFAULT_CATEGORY_ORDER],moved=moveCategory(original,from,to);
    assert.equal(moved[to],original[from]);assert.equal(new Set(moved).size,3);assert.deepEqual(original,DEFAULT_CATEGORY_ORDER);
    assert.deepEqual(moveCategory(moved,to,from),original);
  }
  for(const [from,to] of [[-1,1],[0,3],[0,.5],[NaN,0]])assert.deepEqual(moveCategory(DEFAULT_CATEGORY_ORDER,from!,to!),DEFAULT_CATEGORY_ORDER);
});
test('category reorder preserves chronological projection and the pending/completed partition',()=>{
  const day='2026-11-06',data=structuredClone(initialData);
  data.tasks=[{id:'todo',title:'复习',description:'',location:'',date:day,time:'09:00',duration:30,color:'#0066B3',kind:'todo',repeat:null,subtasks:[],completedDates:[day]},
    {id:'course',title:'课程',description:'',location:'',date:day,time:'08:00',duration:45,color:'#0066B3',kind:'course',repeat:null,subtasks:[],completedDates:[]}];
  const before=homeTasksOn(data,day);data.settings.homeCategoryOrder=['homework','todo','course'];
  assert.deepEqual(homeTasksOn(data,day),before);
  const groups=homeGroups(before,day,data.settings.homeCategoryOrder);
  assert.deepEqual(groups.map(g=>g.category),data.settings.homeCategoryOrder);assert.equal(groups[0]!.items.length,0);
  assert.equal(groups[1]!.completed[0]!.id,'todo');assert.equal(groups[2]!.pending[0]!.id,'course');
});
