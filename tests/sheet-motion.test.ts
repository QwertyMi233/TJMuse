import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sheetExtentLayout,sheetSnapTarget} from '../src/ui/sheet-motion';
test('dragging expands the sheet continuously and keeps its bottom attached',()=>{
  for(const extent of [280,320,400,600,800]){
    const s=sheetExtentLayout(extent,280,800);
    assert.equal(s.height,extent);assert.equal(s.translateY,0);assert.equal(s.dimming,1);
  }
});
test('dismissal slides existing content instead of squeezing it and dims progressively',()=>{
  for(const extent of [280,200,100,0]){
    const s=sheetExtentLayout(extent,280,800);
    assert.equal(s.height,280);assert.equal(s.translateY,280-extent);assert.equal(s.dimming,extent/280);
  }
});
test('expanded panel settles at compact height before a further downward dismissal',()=>{
  assert.equal(sheetSnapTarget(650,600,280,800,true),280);
  assert.equal(sheetSnapTarget(160,200,280,800,false),0);
  assert.equal(sheetSnapTarget(340,-200,280,800,false),800);
  assert.equal(sheetSnapTarget(290,-100,280,800,false),280);
});
test('fast flick, cancelled position and a single tall detent choose predictable targets',()=>{
  assert.equal(sheetSnapTarget(270,1200,280,800,false),0);
  assert.equal(sheetSnapTarget(290,-600,280,800,false),800);
  assert.equal(sheetSnapTarget(775,-100,280,800,true),800);
  assert.equal(sheetSnapTarget(650,100,800,800,false),0);
  assert.equal(sheetSnapTarget(790,-600,800,800,false),800);
});
