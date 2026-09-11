/* Informational notice only. Acknowledgement never enables analytics. */
(() => {
  'use strict';
  const root=document.getElementById('bilingvo-site');
  const notice=root?.querySelector('#bilingvo-cookies');
  if(!notice)return;
  const key='bilingvo-cookie-notice-v2',maxAge=180*24*60*60*1000;
  let acknowledged=false;
  root.dataset.analyticsConsent='denied';
  try{
    localStorage.removeItem('bilingvo-consent-v1');
    const saved=JSON.parse(localStorage.getItem(key));
    acknowledged=saved?.version===2&&saved.acknowledged===true&&Number.isFinite(saved.time)&&saved.time<=Date.now()&&Date.now()-saved.time<maxAge;
  }catch{}
  notice.hidden=acknowledged;
  notice.querySelector('[data-cookie-ok]').addEventListener('click',()=>{
    try{localStorage.setItem(key,JSON.stringify({version:2,acknowledged:true,time:Date.now()}));}catch{}
    notice.hidden=true;
  });
  notice.querySelector('[data-cookie-policy-placeholder]')?.addEventListener('click',event=>event.preventDefault());
  root.querySelectorAll('[data-cookie-open]').forEach(button=>button.addEventListener('click',()=>{notice.hidden=false;}));
})();
