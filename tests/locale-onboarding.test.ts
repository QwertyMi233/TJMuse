import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGES,resolveLanguage} from '../src/core/locales';
import {countryName,countryRows,COUNTRIES} from '../src/core/countries';
import {tr} from '../src/core/i18n';
import translations from '../src/assets/translations.json';
import {initialData} from '../src/core/defaults';
import {restoreData} from '../src/core/storage';
test('system language detects traditional Chinese and falls back predictably',()=>{
 for(const tag of ['zh-TW','zh-Hant-HK','zh-MO'])assert.equal(resolveLanguage('system',tag),'zh-TW');
 assert.equal(resolveLanguage('system','zh-Hans-CN'),'zh-CN');assert.equal(resolveLanguage('system','ja-JP'),'ja');assert.equal(resolveLanguage('system','es-MX'),'es');assert.equal(resolveLanguage('system','fr-CA'),'fr');assert.equal(resolveLanguage('system','de-DE'),'en-US');assert.equal(resolveLanguage('ja','en-US'),'ja');
});
test('all shipped UI translations preserve numbered placeholders for all supported languages',()=>{
 for(const [key,values] of Object.entries(translations))for(const language of LANGUAGES.filter(l=>l!=='zh-CN')){
  const value=(values as Record<string,string>)[language];assert.ok(value,`${language}: ${key}`);
  assert.deepEqual([...value.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...key.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort());
 }
 assert.equal(tr('第 8 周','en-US'),'Week 8');assert.equal(tr('Course title entered by user','ja'),'Course title entered by user');assert.equal(tr('  语言  ','fr'),'  Langue  ');
});
test('country picker has 249 unique regions with names, stable offsets and localized search',()=>{
 assert.equal(COUNTRIES.length,249);assert.equal(new Set(COUNTRIES.map(c=>c.code)).size,249);
 for(const language of LANGUAGES){assert.ok(countryName('CN',language));const rows=countryRows(language);assert.equal(rows.filter(r=>r.code).length,249);assert.equal(new Set(rows.map(r=>r.key)).size,rows.length);for(const row of rows)assert.match(row.letter,/^[A-Z]$/);rows.slice(1).forEach((r,i)=>assert.equal(r.offset,rows[i]!.offset+rows[i]!.height));}
 assert.ok(countryRows('ja','Japan').some(r=>r.code==='JP'));assert.ok(countryRows('fr','FR').some(r=>r.code==='FR'));assert.equal(countryName('ZZ'),'');
});
test('existing semester setup upgrades without forced onboarding while new installs can resume all steps',()=>{
 const old=JSON.parse(JSON.stringify(initialData));delete old.settings.onboardingCompleted;delete old.settings.onboardingStep;delete old.settings.language;old.settings.semesterStartDate='2026-09-14';
 const restored=restoreData(old);assert.equal(restored.settings.onboardingCompleted,true);assert.equal(restored.settings.language,'system');
 assert.equal(initialData.settings.onboardingCompleted,false);
 for(let step=0;step<=6;step++){const data=structuredClone(initialData);data.settings.onboardingStep=step;assert.equal(restoreData(data).settings.onboardingStep,step);}
 const data=structuredClone(initialData);data.settings.onboardingStep=999;assert.equal(restoreData(data).settings.onboardingStep,0);
});
