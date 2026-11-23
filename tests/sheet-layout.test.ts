import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachedSheetGeometry} from '../src/ui/sheet-layout';

test('iPhone short and expanded panels attach to both edges with square bottoms',()=>{
  for(const [width,height,top] of [[375,667,20],[393,852,59],[440,956,62]] as const){
    for(const requested of [280,height]){
      const g=attachedSheetGeometry(width,height,requested,height*.92,true,top);
      assert.equal(g.width,width);
      assert.equal(g.borderBottomLeftRadius,0);
      assert.equal(g.borderBottomRightRadius,0);
      assert.equal(g.borderTopLeftRadius,width*.125);
      assert.equal(g.borderTopRightRadius,width*.125);
      assert.ok(height-g.height>=top);
    }
  }
});
test('keyboard viewport constrains height while tablet panels retain readable width',()=>{
  const keyboard=attachedSheetGeometry(393,340,700,780,true,59);
  assert.equal(keyboard.height,281);
  assert.equal(keyboard.width,393);
  const tablet=attachedSheetGeometry(1024,1366,400,1200,true,24);
  assert.equal(tablet.width,560);
  assert.equal(tablet.height,400);
  assert.equal(tablet.borderTopLeftRadius,56);
});
