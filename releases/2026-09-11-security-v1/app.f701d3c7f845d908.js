/* Bilingvo interactions: vanilla JS, scoped for GitHub Pages and Tilda T123. */
(() => {
  'use strict';
  const root = document.getElementById('bilingvo-site');
  if (!root || root.dataset.initialized) return;
  const security=Object.getOwnPropertyDescriptor(window,'BilingvoSecurity')?.value;
  if(!security||!Object.isFrozen(security)||!Object.isFrozen(security.config))return;
  root.dataset.initialized = 'true';
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const config = security.config;
  const assetBase = new URL(config.assetBase);
  const asset = path => new URL(path, assetBase).href;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const languages = {
    EN: { name: 'English', locale: 'en', dir: 'ltr', lines: ['We are moving to the next part of the presentation.', 'The screen shows the results of the first stage.', 'After the session, you can rate the translation quality.'] },
    FR: { name: 'Français', locale: 'fr', dir: 'ltr', lines: ['Nous passons à la partie suivante de la présentation.', 'L’écran affiche les résultats de la première étape.', 'Après la session, vous pourrez évaluer la qualité de la traduction.'] },
    AR: { name: 'العربية', locale: 'ar', dir: 'rtl', lines: ['ننتقل إلى الجزء التالي من العرض التقديمي.', 'تُعرض على الشاشة نتائج المرحلة الأولى.', 'بعد الجلسة، يمكنكم تقييم جودة الترجمة.'] },
    ZH: { name: '中文', locale: 'zh', dir: 'ltr', lines: ['我们进入报告的下一部分。', '屏幕上显示了第一阶段的结果。', '会后可以评估翻译质量。'] }
  };
  let language = 'EN';
  const audio = $('#bilingvo-audio');
  let playing = false, clip = 0, audioGeneration = 0, typeFrame = 0, previewTimer = 0, clipTimer = 0;
  let phoneVisible = false;
  let globalAnimationPaused = document.hidden;
  function setStatus(text) { $$('.audio-status, .global-audio-status').forEach(el => { el.textContent = text; }); }
  function renderCaptions() {
    const meta = languages[language];
    $$('[data-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lang === language)));
    $$('[data-language-select]').forEach(el => { el.value = language; });
    $$('.caption-card').forEach(card => {
      const target = card.querySelector('.target-caption');
      target.textContent = meta.lines[Number(card.dataset.caption)];
      target.lang = meta.locale; target.dir = meta.dir;
      card.classList.remove('is-current', 'is-typing');
    });
    root.dataset.language = language;
  }
  function renderPlayback() {
    root.classList.toggle('is-audio-playing', playing);
    $$('[data-audio-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', `${playing ? 'Остановить' : 'Послушать'} перевод: ${languages[language].name}`);
    });
    $$('[data-audio-label]').forEach(el => { el.textContent = playing ? 'Остановить перевод' : 'Послушать перевод'; });
  }
  function animateCaption(index, duration = 2400) {
    cancelAnimationFrame(typeFrame);
    const value = languages[language].lines[index];
    const letters = Array.from(value);
    const cards = $$(`.caption-card[data-caption="${index}"]`);
    $$('.caption-card').forEach(card => card.classList.toggle('is-current', Number(card.dataset.caption) === index));
    if (reducedMotion.matches) { cards.forEach(card => { card.querySelector('.target-caption').textContent = value; }); return; }
    const start = performance.now();
    cards.forEach(card => card.classList.add('is-typing'));
    function tick(time) {
      const progress = Math.min(1, (time - start) / duration);
      const str = letters.slice(0, Math.max(1, Math.ceil(letters.length * progress))).join('');
      cards.forEach(card => { card.querySelector('.target-caption').textContent = str; });
      if (progress < 1 && !globalAnimationPaused) typeFrame = requestAnimationFrame(tick);
      else cards.forEach(card => { card.querySelector('.target-caption').textContent = value; card.classList.remove('is-typing'); });
    }
    typeFrame = requestAnimationFrame(tick);
  }
  function stopAudio({ restore = true } = {}) {
    ++audioGeneration; clearTimeout(clipTimer); playing = false; audio.pause(); cancelAnimationFrame(typeFrame);
    renderPlayback(); if (restore) renderCaptions();
  }
  async function playClip(index) {
    const generation = ++audioGeneration; clip = index;
    audio.pause(); audio.src = asset(`audio/${language.toLowerCase()}-${1020 + index}.mp3`); audio.load();
    try {
      await audio.play();
      if (generation !== audioGeneration) return;
      playing = true; renderPlayback(); setStatus('');
      animateCaption(index, Math.max(1900, Number.isFinite(audio.duration) ? audio.duration * 900 : 3300));
    } catch (error) {
      if (generation !== audioGeneration || error.name === 'AbortError') return;
      stopAudio(); setStatus('Не удалось включить звук. Нажмите «Послушать перевод» еще раз.');
    }
  }
  function toggleAudio() {
    if (playing || !audio.paused) { stopAudio(); return; }
    $$('video').forEach(video => video.pause()); playing = true; renderPlayback(); playClip(0);
  }
  audio.addEventListener('ended', () => {
    if (!playing) return;
    if (clip < 2) clipTimer = setTimeout(() => { if (playing) playClip(clip + 1); }, 500);
    else { stopAudio(); setStatus('Пример завершен. Выберите другой язык или послушайте еще раз.'); }
  });
  audio.addEventListener('error', () => { if (playing) { stopAudio(); setStatus('Аудиозапись временно недоступна. Попробуйте еще раз.'); } });
  function selectLanguage(code) {
    if (!languages[code]) return;
    const resume = playing;
    stopAudio(); language = code; renderCaptions(); renderPlayback(); setStatus('');
    root.dispatchEvent(new CustomEvent('bilingvo:languagechange', { detail: code }));
    if (resume) { playing = true; renderPlayback(); playClip(0); } else animateCaption(0);
  }
  $$('[data-lang]').forEach(button => button.addEventListener('click', () => selectLanguage(button.dataset.lang)));
  $$('[data-language-select]').forEach(select => select.addEventListener('change', () => selectLanguage(select.value)));
  root.addEventListener('bilingvo:city-selected',event=>{if(languages[event.detail.language])selectLanguage(event.detail.language);});
  $$('[data-audio-toggle]').forEach(button => button.addEventListener('click', toggleAudio));
  renderCaptions(); renderPlayback();

  // Silent captions preview. Audio always requires a click.
  let previewIndex = 0;
  function scheduleCaptionPreview() {
    clearTimeout(previewTimer);
    if (!phoneVisible || document.hidden || reducedMotion.matches) return;
    previewTimer = setTimeout(() => {
      if (!playing && !document.hidden && phoneVisible) { animateCaption(previewIndex); previewIndex = (previewIndex + 1) % 3; }
      scheduleCaptionPreview();
    }, 6200);
  }
  new IntersectionObserver(entries => { phoneVisible = entries[0].isIntersecting; scheduleCaptionPreview(); }, { threshold: .2 }).observe($('.phone-stage'));

  let globeFrame = 0;
  function startGlobe() { root.dispatchEvent(new Event('bilingvo:resume-globe')); }

  // How-to tabs with automatic progression and keyboard navigation.
  const howTabs = $$('[data-how]');
  let howIndex = 0, howTimer = 0, howManual = false, howVisible = false;
  function setHow(index, manual = false) {
    howIndex = (index + howTabs.length) % howTabs.length; howManual = howManual || manual;
    howTabs.forEach((tab,i) => { tab.setAttribute('aria-selected',String(i===howIndex)); tab.tabIndex=i===howIndex?0:-1; });
    $$('[data-how-screen]').forEach(panel=>{panel.hidden=Number(panel.dataset.howScreen)!==howIndex;});
    $('#bl-how-panel').setAttribute('aria-labelledby',howTabs[howIndex].id); scheduleHow();
  }
  function scheduleHow() {
    clearTimeout(howTimer);
    if (!howVisible || howManual || document.hidden || reducedMotion.matches) return;
    howTimer = setTimeout(()=>setHow(howIndex+1),8000);
  }
  howTabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>setHow(i,true));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key))return; event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?2:(i+(['ArrowDown','ArrowRight'].includes(event.key)?1:2))%3;
      setHow(next,true); howTabs[next].focus();
    });
  });
  $$('[data-how-next]').forEach(button=>button.addEventListener('click',()=>setHow(Number(button.dataset.howNext),true)));
  new IntersectionObserver(entries=>{howVisible=entries[0].isIntersecting; scheduleHow();},{threshold:.25}).observe($('#bl-how'));

  // Gallery: autoplay, previous/next, swipe, and explicit pause.
  const carousel = $('.photo-carousel'), track = $('.photo-track'), slides = $$('.photo-slide'), pauseGallery = $('[data-gallery-pause]');
  let galleryIndex=0, galleryTimer=0, galleryPaused=false, galleryHovered=false, galleryFocused=false, galleryVisible=false, swipe=null;
  function showSlide(index) {
    galleryIndex=(index+slides.length)%slides.length; track.style.transform=`translateX(${-galleryIndex*100}%)`;
    slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==galleryIndex))); scheduleGallery();
  }
  function scheduleGallery() {
    clearTimeout(galleryTimer);
    if(galleryPaused||galleryHovered||galleryFocused||!galleryVisible||document.hidden||reducedMotion.matches)return;
    galleryTimer=setTimeout(()=>showSlide(galleryIndex+1),5200);
  }
  $('[data-gallery-prev]').addEventListener('click',()=>showSlide(galleryIndex-1));
  $('[data-gallery-next]').addEventListener('click',()=>showSlide(galleryIndex+1));
  pauseGallery.addEventListener('click',()=>{
    galleryPaused=!galleryPaused; pauseGallery.setAttribute('aria-pressed',String(galleryPaused));
    pauseGallery.setAttribute('aria-label',galleryPaused?'Продолжить автопрокрутку фотографий':'Приостановить автопрокрутку фотографий');
    pauseGallery.textContent=galleryPaused?'▶':'Ⅱ'; scheduleGallery();
  });
  carousel.addEventListener('mouseenter',()=>{galleryHovered=true; scheduleGallery();});
  carousel.addEventListener('mouseleave',()=>{galleryHovered=false; scheduleGallery();});
  $('.universities').addEventListener('focusin',()=>{galleryFocused=true; scheduleGallery();});
  $('.universities').addEventListener('focusout',event=>{if(!$('.universities').contains(event.relatedTarget)){galleryFocused=false; scheduleGallery();}});
  carousel.addEventListener('pointerdown',event=>{swipe={x:event.clientX,y:event.clientY};});
  carousel.addEventListener('pointerup',event=>{if(!swipe)return;const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))showSlide(galleryIndex+(dx<0?1:-1));swipe=null;});
  carousel.addEventListener('pointercancel',()=>{swipe=null;});
  new IntersectionObserver(entries=>{galleryVisible=entries[0].isIntersecting;scheduleGallery();},{threshold:.2}).observe(carousel);
  showSlide(0);

  // Native dialogs contain focus and close with Escape.
  let dialogOpener=null;
  function openDialog(id, opener) {
    const dialog=$(`#bilingvo-${id}`); if(!dialog)return;
    $$('.bilingvo-dialog[open]').forEach(el=>el.close()); dialogOpener=opener||document.activeElement; dialog.showModal();
  }
  function info(title,message,opener) {
    $('#bilingvo-info h2').textContent=title; $('[data-info-message]').textContent=message; openDialog('info',opener);
  }
  $$('[data-open]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault(); const kind=button.dataset.open;
    const tildaPopup=kind==='project'?config.tildaProjectPopup:kind==='sample'?config.tildaSamplePopup:null;
    if(tildaPopup){const link=document.createElement('a');link.href=tildaPopup;root.appendChild(link);link.click();link.remove();return;}
    if(kind==='language'){info('Язык перевода','Выберите язык на глобусе, в телефоне или в блоке прослушивания. Страница сайта сейчас доступна на русском.',button);return;}
    openDialog(kind,button);
  }));
  $$('.bilingvo-dialog').forEach(dialog=>{
    dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    dialog.addEventListener('close',()=>{dialog.querySelectorAll('video').forEach(video=>video.pause());if(!$('.bilingvo-dialog[open]')&&dialogOpener instanceof HTMLElement&&document.contains(dialogOpener))dialogOpener.focus({preventScroll:true});});
  });
  $$('[data-play-video]').forEach(button=>button.addEventListener('click',()=>{
    const video=$(`#${button.dataset.playVideo}`);stopAudio();video.play().catch(()=>{video.controls=true;button.hidden=true;});
  }));
  $$('[data-open-video]').forEach(button=>button.addEventListener('click',()=>{stopAudio();openDialog('video',button);$('#bl-event-video').play().catch(()=>{});}));
  $$('video').forEach(video=>{
    video.addEventListener('play',()=>{
      stopAudio();$$('video').filter(v=>v!==video).forEach(v=>v.pause());video.classList.add('is-playing');
      const button=$(`[data-play-video="${video.id}"]`);if(button)button.hidden=true;
    });
    video.addEventListener('ended',()=>{video.classList.remove('is-playing');const button=$(`[data-play-video="${video.id}"]`);if(button)button.hidden=false;});
  });

  // Optional endpoint / native Tilda popup integration. No fake successful submissions.
  $$('[data-lead-form]').forEach(form=>form.addEventListener('submit',async event=>{
    event.preventDefault(); if(!form.reportValidity())return;
    let status=form.querySelector('.form-status');
    if(!status){status=document.createElement('p');status.className='form-status';status.setAttribute('role','status');form.appendChild(status);}
    if(!config.formEndpoint){status.textContent='Отправка заявок будет подключена при переносе в Tilda. Сейчас форма ничего не отправляет. Связаться с нами: sales@agropromcifra.ru, +7 (495) 260-14-16.';return;}
    const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Отправляем заявку…';
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const data=new FormData(form),fields={};
      for(const [key,max] of Object.entries({name:100,email:254,contact:120,company:200,message:2000,consent:16})){
        const value=data.get(key);if(typeof value==='string')fields[key]=value.trim().slice(0,max);
      }
      const response=await fetch(config.formEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,form:form.dataset.leadForm}),signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'});
      if(!response.ok)throw new Error('Submission failed');
      status.textContent='';form.reset();openDialog('success',button);
    }catch{status.textContent='Не удалось отправить заявку. Попробуйте еще раз или напишите на sales@agropromcifra.ru.';}
    finally{clearTimeout(timeout);button.disabled=false;}
  }));
  $$('form[data-kind=room]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const code=form.querySelector('input').value.trim();
    if(!/^[A-Za-z0-9_-]{1,32}$/.test(code)){info('Код комнаты','Используйте код из букв и цифр, полученный от организатора.',form.querySelector('button'));return;}
    if(config.roomUrl){const target=new URL(config.roomUrl);target.searchParams.set(config.roomCodeParameter||'room',code);window.location.assign(target.href);return;}
    info('Подключение к комнате','Здесь можно посмотреть демонстрацию интерфейса. Для входа в реальную комнату используйте QR-код или ссылку организатора мероприятия.',form.querySelector('button'));
  }));
  $$('[data-legal]').forEach(button=>button.addEventListener('click',()=>{
    const url=button.dataset.legal==='company'?config.companyUrl:config.privacyUrl;
    if(url){window.open(url,'_blank','noopener,noreferrer');return;}
    info(button.dataset.legal==='company'?'Реквизиты':'Политика конфиденциальности','Документ будет подключен вместе с формами на Tilda. До подключения формы не передают и не сохраняют введенные данные.',button);
  }));
  document.addEventListener('visibilitychange',()=>{
    globalAnimationPaused=document.hidden;
    if(document.hidden){stopAudio();$$('video').forEach(v=>v.pause());cancelAnimationFrame(globeFrame);globeFrame=0;clearTimeout(previewTimer);clearTimeout(galleryTimer);clearTimeout(howTimer);}
    else{startGlobe();scheduleCaptionPreview();scheduleGallery();scheduleHow();}
  });
  reducedMotion.addEventListener('change',()=>{cancelAnimationFrame(globeFrame);globeFrame=0;startGlobe();scheduleCaptionPreview();scheduleGallery();scheduleHow();});
  // Controls become usable only after all submit handlers have been registered.
  $$('fieldset[data-bl-form]').forEach(fieldset=>{fieldset.disabled=false;});
})();
