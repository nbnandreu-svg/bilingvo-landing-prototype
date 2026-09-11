import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../consent.js',import.meta.url),'utf8').replace('const metricaId=0;','const metricaId=12345;');
function setup(saved=null){
  const elements=new Map(),scripts=[],store=new Map(saved?[['bilingvo-consent-v1',saved]]:[]);
  class El extends EventTarget{constructor(){super();this.dataset={};this.hidden=false;this.checked=false;this.open=false;}querySelector(s){if(!elements.has(s))elements.set(s,new El());return elements.get(s);}querySelectorAll(){return [this.querySelector('[data-cookie-open]')];}showModal(){this.open=true;}close(){this.open=false;}focus(){}}
  const root=new El(),dialog=root.querySelector('#bilingvo-cookies');let reloads=0;
  const document={getElementById:()=>root,activeElement:null,body:{},createElement:()=>({}),head:{append:s=>scripts.push(s)}};
  const window={};
  vm.runInNewContext(source,{document,window,HTMLElement:El,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},location:{reload:()=>reloads++},Date,JSON,Number});
  return {root,dialog,scripts,store,window,click:selector=>dialog.querySelector(selector).dispatchEvent(new Event('click')),reopen:()=>root.querySelector('[data-cookie-open]').dispatchEvent(new Event('click')),reloads:()=>reloads};
}
test('first visit loads no optional script before a decision; reject loads none',()=>{
  const s=setup();assert.equal(s.dialog.open,true);assert.equal(s.scripts.length,0);s.click('[data-cookie-reject]');assert.equal(s.scripts.length,0);assert.equal(s.dialog.open,false);assert.equal(s.root.dataset.analyticsConsent,'denied');
});
test('accept loads configured analytics exactly once and saves the choice',()=>{
  const s=setup();s.click('[data-cookie-accept]');assert.equal(s.scripts.length,1);assert.equal(s.scripts[0].src,'https://mc.yandex.ru/metrika/tag.js');s.reopen();s.click('[data-cookie-accept]');assert.equal(s.scripts.length,1);assert.equal(JSON.parse(s.store.get('bilingvo-consent-v1')).analytics,true);
});
test('custom settings are off by default, and revocation stops the running page',()=>{
  const s=setup();s.click('[data-cookie-customize]');assert.equal(s.dialog.querySelector('[data-cookie-analytics]').checked,false);s.click('[data-cookie-save]');assert.equal(s.scripts.length,0);s.reopen();s.click('[data-cookie-accept]');s.reopen();s.click('[data-cookie-reject]');assert.equal(s.reloads(),1);
});
test('remembered rejection stays rejected; invalid, expired and future consent cannot start analytics',()=>{
  const saved=JSON.stringify({version:1,analytics:false,time:Date.now()});const remembered=setup(saved);assert.equal(remembered.dialog.open,false);assert.equal(remembered.scripts.length,0);
  for(const value of ['invalid',JSON.stringify({version:1,analytics:'true',time:Date.now()}),JSON.stringify({version:1,analytics:true,time:1}),JSON.stringify({version:1,analytics:true,time:Date.now()+86400000})]){const s=setup(value);assert.equal(s.scripts.length,0);assert.equal(s.dialog.open,true);}
});

