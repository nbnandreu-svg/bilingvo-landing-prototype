import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../security.js',import.meta.url),'utf8');
function run(setup=''){
  const context=vm.createContext({URL,window:{location:{href:'https://welcomebilingvo.tilda.ws/bilingvo'}},document:{getElementById:()=>({dataset:{assetBase:'https://nbnandreu-svg.github.io/bilingvo-landing-prototype/assets/'}})}});
  vm.runInContext(setup,context);vm.runInContext(source,context);
  return context.window.BilingvoSecurity;
}
test('rejects executable and insecure configuration URLs',()=>{
  const {config}=run(`window.BilingvoConfig={roomUrl:'javascript:alert(1)',privacyUrl:'data:text/html,test',formEndpoint:'http://example.com/collect',tildaProjectPopup:'javascript:alert(2)'}`);
  assert.equal(config.roomUrl,'');assert.equal(config.privacyUrl,'');assert.equal(config.formEndpoint,'');assert.equal(config.tildaProjectPopup,'');
});
test('rejects lookalike destinations and embedded credentials',()=>{
  const {config}=run(`window.BilingvoConfig={formEndpoint:'https://agropromcifra.ru.evil.example/collect',roomUrl:'https://user:pass@agropromcifra.ru/join',companyUrl:'https://other.example'}`);
  assert.equal(config.formEndpoint,'');assert.equal(config.roomUrl,'');assert.equal(config.companyUrl,'');
});
test('DOM-clobbered or inherited config objects cannot supply destinations',()=>{
  const {config}=run(`window.BilingvoConfig=Object.create({formEndpoint:'https://agropromcifra.ru/collect'})`);
  assert.equal(config.formEndpoint,'');
});
test('configuration getters are not invoked',()=>{
  const {config}=run(`window.BilingvoConfig={};Object.defineProperty(window.BilingvoConfig,'formEndpoint',{get(){throw new Error('must not run')}})`);
  assert.equal(config.formEndpoint,'');
});
test('preserves intended explicit integrations and popup anchors',()=>{
  const {config}=run(`window.BilingvoConfig={allowedOrigins:['https://forms.example'],formEndpoint:'https://forms.example/lead',tildaProjectPopup:'#popup:bilingvo-form',roomUrl:'/join',roomCodeParameter:'code'}`);
  assert.equal(config.formEndpoint,'https://forms.example/lead');assert.equal(config.roomUrl,'https://welcomebilingvo.tilda.ws/join');assert.equal(config.tildaProjectPopup,'#popup:bilingvo-form');assert.equal(config.roomCodeParameter,'code');
});
test('assets cannot be redirected to a lookalike or active URL',()=>{
  const {config}=run(`window.BilingvoConfig={assetBase:'https://evil.example/bilingvo-landing-prototype/assets/'}`);
  assert.equal(config.assetBase,'https://nbnandreu-svg.github.io/bilingvo-landing-prototype/assets/');
  assert.equal(Object.isFrozen(config),true);
});
