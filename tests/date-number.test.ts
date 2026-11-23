import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateDigitPaths} from '../src/core/date-number';
test('all calendar digits use bounded closed vector outlines at both weights',()=>{
 for(const bold of [false,true])for(let day=1;day<=31;day++){
  const paths=dateDigitPaths(day,bold);assert.equal(paths.length,String(day).length);
  for(const path of paths){assert.ok(path.x>=0&&path.x<38);assert.match(path.path,/^M/);assert.match(path.path,/[zZ]$/);assert.doesNotMatch(path.path,/NaN|Infinity/);}
 }
 assert.deepEqual(dateDigitPaths(0),[]);assert.deepEqual(dateDigitPaths(32),[]);
});
