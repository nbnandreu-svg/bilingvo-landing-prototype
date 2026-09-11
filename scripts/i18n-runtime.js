(() => {
  'use strict';
  const root=document.getElementById('bilingvo-site');
  if(!root)return;
  const catalog=/* CATALOG */{};
  const codes=['ru','en','fr','es','zh','ar'];
  const names=['Русский','English','Français','Español','中文','العربية'];
  const reverse=new Map();
  for(const [key,values] of Object.entries(catalog))for(const value of values)if(!reverse.has(value))reverse.set(value,key);
  let locale='ru';
  function t(input){const key=reverse.get(input.trim());return key?catalog[key][codes.indexOf(locale)]:input;}
  const excluded='.source-caption,.target-caption,button[data-site-language],script,style';
  function translateText(node){
    if(node.parentElement?.closest(excluded))return;
    const old=node.nodeValue,key=reverse.get(old.trim());if(!key)return;
    const value=old.replace(old.trim(),catalog[key][codes.indexOf(locale)]);
    if(value!==old)node.nodeValue=value;
  }
  const attrs=['placeholder','aria-label','aria-roledescription','title','alt'];
  function translateElement(el){
    if(!(el instanceof Element)||el.closest(excluded))return;
    for(const attr of attrs){const old=el.getAttribute(attr);if(old){const value=t(old);if(value!==old)el.setAttribute(attr,value);}}
  }
  function walk(node){
    if(node.nodeType===Node.TEXT_NODE){translateText(node);return;}
    if(!(node instanceof Element)||node.closest(excluded))return;
    translateElement(node);
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
    while((text=walker.nextNode()))translateText(text);
    node.querySelectorAll('*').forEach(translateElement);
  }
  const switcher=root.querySelector('.site-language'),trigger=switcher.querySelector('.language-button'),menu=switcher.querySelector('.site-language-menu');
  const options=[...menu.querySelectorAll('[data-site-language]')];
  function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
  function choose(code,persist=true){
    if(!codes.includes(code))return;
    locale=code;root.lang=code;root.dir=code==='ar'?'rtl':'ltr';root.dataset.siteLanguage=code;
    document.documentElement.lang=code;
    walk(root);
    trigger.querySelector('[data-site-language-name]').textContent=names[codes.indexOf(code)];
    const flag=trigger.querySelector('[data-site-language-flag]');
    const selectedFlag=options.find(button=>button.dataset.siteLanguage===code)?.querySelector('img');
    if(flag&&selectedFlag)flag.src=selectedFlag.src;
    options.forEach(button=>button.setAttribute('aria-checked',String(button.dataset.siteLanguage===code)));
    document.title=t('Билингво: синхронный перевод для любой аудитории — в реальном времени');
    if(persist){const url=new URL(location.href);url.searchParams.set('lang',code);history.replaceState(null,'',url);}
    root.dispatchEvent(new CustomEvent('bilingvo:sitelanguagechange',{detail:code}));
  }
  trigger.addEventListener('click',()=>{const opening=menu.hidden;menu.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening)options[codes.indexOf(locale)].focus();});
  options.forEach(button=>button.addEventListener('click',()=>{choose(button.dataset.siteLanguage);close(true);}));
  switcher.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();menu.hidden=false;trigger.setAttribute('aria-expanded','true');
    const current=options.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?5:(current+(event.key==='ArrowDown'?1:5)+6)%6;options[next].focus();
  });
  document.addEventListener('click',event=>{if(!switcher.contains(event.target))close();});
  switcher.addEventListener('focusout',event=>{if(!switcher.contains(event.relatedTarget))close();});
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')translateText(record.target);
      else if(record.type==='attributes')translateElement(record.target);
      else record.addedNodes.forEach(walk);
    }
  }).observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
  Object.defineProperty(window,'BilingvoI18n',{value:Object.freeze({t,get locale(){return locale;}}),writable:false,configurable:false});
  choose(new URL(location.href).searchParams.get('lang')||'ru',false);
})();
