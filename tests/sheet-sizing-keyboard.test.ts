import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sheetContentHeight} from '../src/ui/sheet-layout';
import {sheetExtentLayout} from '../src/ui/sheet-motion';
test('opening waits for intrinsic content dimensions and chooses full or compact height',()=>{
  assert.deepEqual(sheetContentHeight(0,0,0,800),{ready:false,height:800});
  assert.deepEqual(sheetContentHeight(100,1000,80,800),{ready:true,height:800});
  assert.deepEqual(sheetContentHeight(100,140,0,800),{ready:true,height:240});
  assert.deepEqual(sheetContentHeight(100,140,80,800,true),{ready:true,height:800});
});
test('large sheet top stays still across keyboard show, candidate height changes and hide',()=>{
  for(const keyboard of [0,60,160,280,350,380,350,200,80,0]){
    const s=sheetExtentLayout(880,880,880,keyboard);
    assert.equal(956-s.height-s.bottom+s.translateY,76);
    assert.equal(s.height+s.bottom,880);
    assert.equal(s.dimming,1);
  }
});
test('compact menus lift above the keyboard and return to exactly their original size',()=>{
  for(const keyboard of [0,150,350,150,0]){
    const s=sheetExtentLayout(260,260,880,keyboard);
    assert.equal(s.height,260);assert.equal(s.bottom,keyboard);assert.equal(s.translateY,0);
  }
});
test('keyboard movement cannot reverse the closing motion of a large form',()=>{
  let previous=-Infinity;
  for(const [extent,keyboard] of [[880,350],[700,300],[500,200],[250,90],[0,0]]){
    const s=sheetExtentLayout(extent!,880,880,keyboard!);
    const top=956-s.height-s.bottom+s.translateY;
    assert.ok(top>=previous);previous=top;
  }
});
