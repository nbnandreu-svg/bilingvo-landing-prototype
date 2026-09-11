/* Shared, fail-closed configuration for the static Bilingvo frontend. */
(() => {
  'use strict';
  const page=new URL(window.location.href);
  const publicAssets='https://nbnandreu-svg.github.io/bilingvo-landing-prototype/assets/';
  const descriptor=Object.getOwnPropertyDescriptor(window,'BilingvoConfig');
  const candidate=descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:null;
  const plain=candidate&&typeof candidate==='object'&&(Object.getPrototypeOf(candidate)===Object.prototype||Object.getPrototypeOf(candidate)===null);
  const properties=plain?Object.getOwnPropertyDescriptors(candidate):{};
  const ownValue=key=>properties[key]&&Object.hasOwn(properties[key],'value')?properties[key].value:undefined;
  const string=key=>{const value=ownValue(key);return typeof value==='string'&&value.length<=2048?value.trim():'';};
  const allowed=new Set([page.origin,'https://agropromcifra.ru','https://nbnandreu-svg.github.io']);
  const extras=ownValue('allowedOrigins');
  if(Array.isArray(extras)&&extras.length<=12)for(const value of extras){
    if(typeof value!=='string'||value.length>200)continue;
    try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)allowed.add(u.origin);}catch{}
  }
  function safeURL(value){
    if(typeof value!=='string'||!value||value.length>2048)return '';
    try{const u=new URL(value,page.href);if(u.protocol!=='https:'||u.username||u.password||!allowed.has(u.origin))return '';return u.href;}catch{return '';}
  }
  function popup(value){return typeof value==='string'&&/^#popup:[A-Za-z0-9_-]{1,80}$/.test(value)?value:'';}
  const root=document.getElementById('bilingvo-site');
  function resolveAssets(value){
    try{
      if(typeof value!=='string'||value.length>2048)throw Error();
      const u=new URL(value,page.href);
      const local=['127.0.0.1','localhost','[::1]'].includes(page.hostname)&&u.origin===page.origin;
      const own=u.origin===page.origin&&u.protocol==='https:';
      const publicPath=u.href.startsWith(publicAssets);
      if((local||own||publicPath)&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.endsWith('/'))return u.href;
    }catch{}
    return publicAssets;
  }
  const config=Object.freeze({
    assetBase:resolveAssets(string('assetBase')||root?.dataset.assetBase||'./assets/'),
    formEndpoint:safeURL(string('formEndpoint')),
    roomUrl:safeURL(string('roomUrl')),
    privacyUrl:safeURL(string('privacyUrl')),
    companyUrl:safeURL(string('companyUrl')),
    tildaProjectPopup:popup(string('tildaProjectPopup')),
    tildaSamplePopup:popup(string('tildaSamplePopup')),
    roomCodeParameter:/^[a-z][a-z0-9_-]{0,31}$/i.test(string('roomCodeParameter'))?string('roomCodeParameter'):'room'
  });
  // Avoid named DOM elements masquerading as configuration or runtime objects.
  Object.defineProperty(window,'BilingvoSecurity',{value:Object.freeze({config,safeURL}),writable:false,configurable:false});
})();
