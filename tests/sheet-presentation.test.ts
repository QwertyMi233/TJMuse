import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {containsSheetInput,sheetPresentation} from '../src/ui/sheet-presentation';
test('read-only menus stay attached while iOS input sheets retain the native keyboard presenter',()=>{
 assert.equal(sheetPresentation('ios','content',false),'content');
 assert.equal(sheetPresentation('ios','content',true),'form');
 assert.equal(sheetPresentation('ios','large',false),'form');
 assert.equal(sheetPresentation('ios','content',false,true),'form');
 for(const platform of ['android','web'])assert.equal(sheetPresentation(platform,'large',true,true),'content');
});
test('nested inputs are detected without executing opaque components or hooks',()=>{
 const Field=()=>null,types=new Set([Field]);
 assert.equal(containsSheetInput(React.createElement(React.Fragment,null,React.createElement('view',null,React.createElement(Field))),types),true);
 assert.equal(containsSheetInput(React.createElement('view',null,'Details'),types),false);
 let executed=false;const Opaque=()=>{executed=true;return React.createElement(Field);};
 assert.equal(containsSheetInput(React.createElement(Opaque),types),false);assert.equal(executed,false);
});
