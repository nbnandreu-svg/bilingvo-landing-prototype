/* No optional tracking is loaded before explicit, versioned consent. */
(() => {
  'use strict';
  const root=document.getElementById('bilingvo-site'),dialog=root?.querySelector('#bilingvo-cookies');
  if(!dialog)return;
  const key='bilingvo-consent-v1',maxAge=180*24*60*60*1000;
  const options=dialog.querySelector('.cookie-options'),analytics=dialog.querySelector('[data-cookie-analytics]');
  let state=null,opener=null,loaded=false;
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1&&typeof saved.analytics==='boolean'&&Number.isFinite(saved.time)&&Date.now()-saved.time<maxAge&&saved.time<=Date.now())state=saved;}catch{}
  // A reviewed counter ID may be added here after the platform's automatic
  // insertion is disabled. An unset ID deliberately starts no tracker.
  const metricaId=0;
  function startAnalytics(){
    if(loaded||!state?.analytics||!Number.isSafeInteger(metricaId)||metricaId<=0)return;
    loaded=true;
    window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments);};
    window.ym.l=Date.now();
    const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';script.referrerPolicy='no-referrer';document.head.append(script);
    window.ym(metricaId,'init',{clickmap:false,trackLinks:false,accurateTrackBounce:true,webvisor:false});
  }
  function customize(){options.hidden=false;dialog.querySelector('[data-cookie-save]').hidden=false;dialog.querySelector('[data-cookie-customize]').hidden=true;}
  function show(custom=false){
    opener=document.activeElement;analytics.checked=state?.analytics===true;options.hidden=!custom;
    dialog.querySelector('[data-cookie-save]').hidden=!custom;dialog.querySelector('[data-cookie-customize]').hidden=custom;
    dialog.querySelector('[data-cookie-policy-text]').hidden=true;
    if(!dialog.open)dialog.showModal();
  }
  function save(accepted){
    const revoke=state?.analytics===true&&!accepted;
    state={version:1,analytics:accepted,marketing:false,time:Date.now()};
    try{localStorage.setItem(key,JSON.stringify(state));}catch{}
    root.dataset.analyticsConsent=accepted?'granted':'denied';
    dialog.close();
    if(opener instanceof HTMLElement&&opener!==document.body)opener.focus({preventScroll:true});
    // Reload after revocation to stop already-running optional scripts.
    if(revoke&&loaded){try{window.ym?.(metricaId,'destruct');}catch{}location.reload();return;}
    startAnalytics();
  }
  dialog.querySelector('[data-cookie-accept]').addEventListener('click',()=>save(true));
  dialog.querySelector('[data-cookie-reject]').addEventListener('click',()=>save(false));
  dialog.querySelector('[data-cookie-customize]').addEventListener('click',customize);
  dialog.querySelector('[data-cookie-save]').addEventListener('click',()=>save(analytics.checked));
  dialog.querySelector('[data-cookie-policy]').addEventListener('click',()=>{const text=dialog.querySelector('[data-cookie-policy-text]');text.hidden=!text.hidden;});
  root.querySelectorAll('[data-cookie-open]').forEach(button=>button.addEventListener('click',()=>show(true)));
  dialog.addEventListener('cancel',event=>{event.preventDefault();save(false);});
  root.dataset.analyticsConsent=state?.analytics?'granted':state?'denied':'pending';
  if(!state)show();else startAnalytics();
})();
