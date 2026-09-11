import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../consent.js',import.meta.url),'utf8');
function setup(saved=null,legacy=null){
  const elements=new Map(),store=new Map();
  if(saved)store.set('bilingvo-cookie-notice-v2',saved);
  if(legacy)store.set('bilingvo-consent-v1',legacy);
  class El extends EventTarget{constructor(){super();this.dataset={};this.hidden=true;}querySelector(s){if(!elements.has(s))elements.set(s,new El());return elements.get(s);}querySelectorAll(){return [this.querySelector('[data-cookie-open]')];}}
  const root=new El(),notice=root.querySelector('#bilingvo-cookies');
  // Any attempt to create a tracking element or issue a request fails the test.
  const document={getElementById:()=>root,createElement:()=>{throw Error('Unexpected script');}};
  vm.runInNewContext(source,{document,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},Date,JSON,Number});
  return {root,notice,store,click:()=>notice.querySelector('[data-cookie-ok]').dispatchEvent(new Event('click')),reopen:()=>root.querySelector('[data-cookie-open]').dispatchEvent(new Event('click'))};
}
test('OK only hides the notice and never grants analytics permission',()=>{
  const s=setup();assert.equal(s.notice.hidden,false);s.click();assert.equal(s.notice.hidden,true);assert.equal(s.root.dataset.analyticsConsent,'denied');const saved=JSON.parse(s.store.get('bilingvo-cookie-notice-v2'));assert.equal(saved.acknowledged,true);assert.equal(saved.analytics,undefined);s.reopen();assert.equal(s.notice.hidden,false);
});
test('acknowledgement is remembered and old optional consent is discarded',()=>{
  const s=setup(JSON.stringify({version:2,acknowledged:true,time:Date.now()}),JSON.stringify({version:1,analytics:true,time:Date.now()}));assert.equal(s.notice.hidden,true);assert.equal(s.store.has('bilingvo-consent-v1'),false);assert.equal(s.root.dataset.analyticsConsent,'denied');
});
test('invalid, expired and future acknowledgements do not hide the notice',()=>{
  for(const value of ['invalid',JSON.stringify({version:2,acknowledged:true,time:1}),JSON.stringify({version:2,acknowledged:true,time:Date.now()+86400000})])assert.equal(setup(value).notice.hidden,false);
});
