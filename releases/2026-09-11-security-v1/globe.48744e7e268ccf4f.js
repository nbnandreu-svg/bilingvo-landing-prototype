/* Spherical geography, city-anchored labels and an arrival-triggered country glow. */
(() => {
  const root=document.getElementById('bilingvo-site');
  if(!root||root.dataset.globeInitialized)return;
  const security=Object.getOwnPropertyDescriptor(window,'BilingvoSecurity')?.value;
  if(!security||!Object.isFrozen(security)||!Object.isFrozen(security.config))return;
  root.dataset.globeInitialized='true';
  const world=root.querySelector('.globe-world'),canvas=root.querySelector('.globe-connections'),ctx=canvas.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const base=new URL(security.config.assetBase);
  const rad=Math.PI/180,size=500,cx=250,cy=250,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=size*dpr;canvas.height=size*dpr;
  let cities=[],countries={},land=[],labels=[],selected=null,longitude=30,latitude=22,radius=222;
  let flight=null,signal=null,drag=null,inertia=0,frame=0,last=0,visible=true,lastInteraction=performance.now(),hits=[];
  let ca=1,sa=0,cb=1,sb=0,syncingDemo=false,hovered=false,lastPaint=0,hoveredCity=null;
  const visibleCityNames=new Set(['Москва','Лондон','Париж','Мадрид','Пекин','Токио','Дели','Бангкок','Эр-Рияд','Каир','Найроби','Лагос','Кейптаун','Нью-Йорк','Сан-Франциско','Торонто','Мехико','Богота','Сан-Паулу','Буэнос-Айрес','Сидней','Окленд']);
  let autoPaused=false,nextHopAt=Infinity,pointerQuietUntil=0,recentCountries=[];
  Object.assign(world.style,{transform:'none',transition:'none'});
  world.setAttribute('role','application');
  world.setAttribute('aria-label','Объемный глобус. Вращайте перетаскиванием или стрелками. Выберите город: импульс подсветит его страну.');
  root.querySelectorAll('.globe-language,.globe-geographic-label').forEach(el=>el.remove());
  const tooltip=document.createElement('span');tooltip.className='globe-city-tooltip';tooltip.hidden=true;world.appendChild(tooltip);
  const status=document.createElement('span');status.className='globe-city-status';status.setAttribute('aria-live','polite');root.querySelector('.globe-demo').appendChild(status);
  status.textContent='Вращайте глобус · выберите город';
  const motionToggle=document.createElement('button');motionToggle.type='button';motionToggle.className='globe-motion-toggle';
  Object.assign(motionToggle.style,{position:'absolute',right:'0',bottom:'-11px',width:'28px',height:'28px',padding:'0',border:'1px solid #d8e2db',borderRadius:'50%',background:'#fff',color:'#47735b',fontSize:'12px',cursor:'pointer',zIndex:'20'});
  root.querySelector('.globe-demo').appendChild(motionToggle);
  function updateMotionToggle(){const stopped=autoPaused||reduce.matches;motionToggle.textContent=stopped?'▶':'Ⅱ';motionToggle.setAttribute('aria-pressed',String(stopped));motionToggle.setAttribute('aria-label',stopped?'Продолжить путешествие по странам':'Приостановить путешествие по странам');}
  motionToggle.addEventListener('click',()=>{autoPaused=!autoPaused;nextHopAt=performance.now()+500;updateMotionToggle();schedule();});updateMotionToggle();
  function vector(lat,lon){lat*=rad;lon*=rad;return [Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)];}
  function project(v){const x=v[0]*ca-v[2]*sa,z=v[0]*sa+v[2]*ca;return [x,v[1]*cb-z*sb,v[1]*sb+z*cb];}
  function camera(){const a=longitude*rad,b=latitude*rad;ca=Math.cos(a);sa=Math.sin(a);cb=Math.cos(b);sb=Math.sin(b);}
  function smooth(t){return t*t*t*(t*(t*6-15)+10);}
  function mixSphere(a,b,t){
    const dot=Math.max(-.999999,Math.min(.999999,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])),angle=Math.acos(dot),sin=Math.sin(angle);
    if(angle<.001)return a;
    const u=Math.sin((1-t)*angle)/sin,v=Math.sin(t*angle)/sin;return a.map((n,i)=>n*u+b[i]*v);
  }
  function center(index,automatic=false){
    if(!cities[index])return;
    const now=performance.now(),city=cities[index];
    const from=selected!==null&&selected!==index?cities[selected]:cities.find(c=>c.name==='Москва'&&c!==city)||cities[1];
    selected=index;lastInteraction=now;inertia=0;
    recentCountries=[city.country,...recentCountries.filter(c=>c!==city.country)].slice(0,5);
    nextHopAt=now+(automatic?5700:7000);
    world.dataset.motion=automatic?'automatic':'manual';
    const delta=((city.lon-longitude+540)%360)-180;
    const flightDuration=automatic?2000:1450,signalDuration=automatic?2350:1850;
    flight={fromLon:longitude,fromLat:latitude,fromRadius:radius,toLon:longitude+delta,toLat:city.lat,start:now,duration:reduce.matches?0:flightDuration};
    signal={from:from.v,to:city.v,start:now,duration:reduce.matches?0:signalDuration,arrivedAt:reduce.matches?now:now+signalDuration};
    status.setAttribute('aria-live',automatic?'off':'polite');status.textContent=`${city.name} · ${city.countryName}`;status.style.color='#8c702d';
    world.dataset.selectedCity=city.name;world.dataset.selectedCountry=city.country;
    root.querySelectorAll('.globe-city-choice').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.cityIndex)===index)));
    schedule();
  }
  function automaticHop(){
    const origin=selected===null?cities[0]:cities[selected];
    const angle=city=>Math.acos(Math.max(-1,Math.min(1,origin.v.reduce((sum,n,i)=>sum+n*city.v[i],0))));
    // Pick a distant country and a different language; avoid consecutive neighbours.
    let candidates=cities.map((city,index)=>({city,index,distance:angle(city)})).filter(x=>!recentCountries.includes(x.city.country)&&x.city.country!==origin.country&&x.city.lang!==origin.lang&&x.distance>65*rad&&x.distance<155*rad);
    if(!candidates.length)candidates=cities.map((city,index)=>({city,index,distance:angle(city)})).filter(x=>x.city.country!==origin.country&&x.distance>45*rad);
    if(!candidates.length)return;
    const byCountry=[...new Map(candidates.map(x=>[x.city.country,x])).values()];
    const choice=byCountry[Math.floor(Math.random()*byCountry.length)];
    world.dataset.hopDistanceKm=String(Math.round(choice.distance*6371));
    center(choice.index,true);
  }
  function selectCity(index){
    center(index);
    // Globe languages are independent from the four supplied audio recordings.
    // Only existing demo languages may change the demonstration audio.
    const city=cities[index];
    syncingDemo=true;
    root.dispatchEvent(new CustomEvent('bilingvo:city-selected',{detail:{city:city.name,country:city.country,language:city.lang}}));
    syncingDemo=false;
  }
  root.addEventListener('bilingvo:languagechange',event=>{
    if(syncingDemo)return;
    const main={EN:'Лондон',FR:'Париж',AR:'Эр-Рияд',ZH:'Пекин'};
    const i=cities.findIndex(c=>c.name===main[event.detail]);if(i>=0)center(i);
  });
  function buildLabels(){
    labels=cities.map((city,index)=>{
      const anchor=document.createElement('div');anchor.className='globe-geographic-label';
      Object.assign(anchor.style,{position:'absolute',width:'0',height:'0',pointerEvents:'none'});
      const button=document.createElement('button');button.type='button';button.className='globe-language globe-city-choice';
      button.dataset.cityIndex=String(index);button.setAttribute('aria-label',`${city.name}, ${city.countryName}: ${city.native}`);button.setAttribute('aria-pressed','false');button.title=`${city.name} · ${city.countryName}`;
      const code=document.createElement('small');code.textContent=city.lang;
      const name=document.createElement('span');name.textContent=city.native;
      button.append(code,name);
      Object.assign(button.style,{left:'0',top:'0',right:'auto',bottom:'auto',margin:'0',translate:'none',animation:'none',transition:'background .2s,border-color .2s',pointerEvents:'auto',fontSize:'11px',padding:'9px 12px',gap:'7px'});
      ['pointerdown','pointerup','pointermove','keydown'].forEach(type=>button.addEventListener(type,event=>event.stopPropagation()));
      button.addEventListener('click',()=>selectCity(index));
      anchor.appendChild(button);world.appendChild(anchor);
      return {anchor,button,index,width:0,height:0,slot:null};
    });
    function measure(){labels.forEach(l=>{l.anchor.hidden=false;l.width=l.button.offsetWidth;l.height=l.button.offsetHeight;l.anchor.hidden=true;});schedule();}
    measure();document.fonts.ready.then(measure);
    new ResizeObserver(measure).observe(world);
  }
  function clippedTriangle(vertices){
    const output=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length],insideA=a[2]>=0,insideB=b[2]>=0;
      if(insideA)output.push(a);
      if(insideA!==insideB){const t=a[2]/(a[2]-b[2]);output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0]);}
    }
    return output;
  }
  function drawCountry(now){
    if(selected===null||!signal||now<signal.arrivedAt)return;
    const country=countries[cities[selected].country];if(!country)return;
    const age=now-signal.arrivedAt;
    const fade=reduce.matches||autoPaused?1:1-smooth(Math.min(1,Math.max(0,(age-2000)/1100)));
    const intensity=(reduce.matches?1:smooth(Math.min(1,age/600)))*fade;
    if(intensity<=0){world.dataset.countryVisible='false';return;}
    const breathing=reduce.matches?1:.94+.06*Math.sin(age/750);
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.clip();
    ctx.beginPath();let visibleTriangles=0;
    for(const triangle of country.triangles){const polygon=clippedTriangle(triangle.map(project));if(polygon.length<3)continue;visibleTriangles++;ctx.moveTo(cx+polygon[0][0]*radius,cy-polygon[0][1]*radius);for(let i=1;i<polygon.length;i++)ctx.lineTo(cx+polygon[i][0]*radius,cy-polygon[i][1]*radius);ctx.closePath();}
    ctx.fillStyle=`rgba(235,183,67,${intensity*.57*breathing})`;ctx.fill();
    ctx.beginPath();
    for(const ring of country.rings){let drawing=false;for(const v of ring){const p=project(v);if(p[2]>=.001){const x=cx+p[0]*radius,y=cy-p[1]*radius;if(drawing)ctx.lineTo(x,y);else ctx.moveTo(x,y);drawing=true;}else drawing=false;}}
    ctx.strokeStyle=`rgba(174,125,28,${intensity*.85})`;ctx.lineWidth=1.05;
    ctx.shadowColor=`rgba(232,184,63,${intensity*.65})`;ctx.shadowBlur=reduce.matches?4:6+4*Math.max(0,1-age/1300);ctx.stroke();ctx.restore();
    world.dataset.countryVisible=String(visibleTriangles>0);
  }
  function route(a,b,color,phase,width=1){
    ctx.beginPath();let active=false;
    for(let i=0;i<=70;i++){const p=project(mixSphere(a,b,i/70));if(p[2]>.008){const x=cx+p[0]*radius,y=cy-p[1]*radius;if(active)ctx.lineTo(x,y);else ctx.moveTo(x,y);active=true;}else active=false;}
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash([2,5]);ctx.lineDashOffset=phase;ctx.stroke();ctx.setLineDash([]);
  }
  function drawLabels(projected){
    const scale=world.clientWidth/size,occupied=[],maxCount=world.clientWidth<360?7:11;
    const sorted=[...labels].sort((a,b)=>(a.index===selected?-1000:a.index)-(b.index===selected?-1000:b.index));
    let shown=0;
    sorted.forEach(label=>{
      const p=projected[label.index],show=p[2]>.1&&label.index===hoveredCity;
      if(!show||shown>=maxCount){label.anchor.hidden=true;label.button.tabIndex=-1;return;}
      const x=(cx+p[0]*radius)*scale,y=(cy-p[1]*radius)*scale,w=label.width,h=label.height;
      const defaultSlots=[{dx:9,dy:-h-9},{dx:-w-9,dy:-h-9},{dx:9,dy:9},{dx:-w-9,dy:9}];
      const slots=label.slot?[label.slot,...defaultSlots.filter(s=>s.dx!==label.slot.dx||s.dy!==label.slot.dy)]:defaultSlots;
      let chosen=null;
      for(const slot of slots){const rect={x:x+slot.dx,y:y+slot.dy,w,h};if(rect.x< -5||rect.x+w>world.clientWidth+5||rect.y< -5||rect.y+h>world.clientWidth+5)continue;if(occupied.some(r=>rect.x<r.x+r.w+4&&rect.x+w+4>r.x&&rect.y<r.y+r.h+4&&rect.y+h+4>r.y))continue;chosen={slot,rect};break;}
      if(!chosen&&label.index===selected){chosen={slot:{dx:10,dy:-h-10},rect:{x:x+10,y:y-h-10,w,h}};}
      if(!chosen){label.anchor.hidden=true;label.button.tabIndex=-1;return;}
      shown++;occupied.push(chosen.rect);label.slot=chosen.slot;
      label.anchor.hidden=false;label.button.tabIndex=0;
      label.anchor.style.left=`${(cx+p[0]*radius)/size*100}%`;label.anchor.style.top=`${(cy-p[1]*radius)/size*100}%`;
      label.anchor.style.opacity=String(Math.min(1,(p[2]-.1)/.13));label.anchor.style.zIndex=String(3+Math.round(p[2]*10));
      label.button.style.transform=`translate(${chosen.slot.dx}px,${chosen.slot.dy}px)`;
      label.button.classList.toggle('globe-destination',label.index===selected);label.anchor.dataset.city=cities[label.index].name;
      const endX=chosen.slot.dx>0?chosen.slot.dx:chosen.slot.dx+w,endY=chosen.slot.dy>0?chosen.slot.dy:chosen.slot.dy+h;
      ctx.beginPath();ctx.moveTo(cx+p[0]*radius,cy-p[1]*radius);ctx.lineTo(cx+p[0]*radius+endX/scale,cy-p[1]*radius+endY/scale);ctx.strokeStyle='#739a8580';ctx.lineWidth=.8;ctx.stroke();
    });
    world.dataset.visibleLabels=String(shown);
  }
  function draw(now){
    frame=0;if(!visible||document.hidden)return;
    if(!reduce.matches&&now-lastPaint<30){frame=requestAnimationFrame(draw);return;}lastPaint=now;
    const dt=Math.min(45,now-(last||now));last=now;
    if(cities.length&&!reduce.matches&&!autoPaused&&!drag&&now>=nextHopAt&&now>=pointerQuietUntil)automaticHop();
    if(flight){const t=flight.duration?Math.min(1,(now-flight.start)/flight.duration):1,k=smooth(t);longitude=flight.fromLon+(flight.toLon-flight.fromLon)*k;latitude=flight.fromLat+(flight.toLat-flight.fromLat)*k;radius=flight.fromRadius+(230-flight.fromRadius)*k;if(t===1)flight=null;}
    else if(!drag&&!reduce.matches){if(Math.abs(inertia)>.001){longitude+=inertia*dt;inertia*=.9;}else if(!autoPaused&&now>=pointerQuietUntil)longitude+=dt*.007;}
    camera();world.dataset.longitude=longitude.toFixed(2);world.dataset.latitude=latitude.toFixed(2);
    world.dataset.highlight=signal?(now<signal.arrivedAt?'in-transit':'country'):'none';
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
    const surface=ctx.createRadialGradient(180,145,12,250,250,radius);surface.addColorStop(0,'#ffffff');surface.addColorStop(.66,'#f7f8f7');surface.addColorStop(.92,'#e9eeeb');surface.addColorStop(1,'#d7e0db');
    ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fillStyle=surface;ctx.fill();ctx.strokeStyle='#d6dfda';ctx.lineWidth=.7;ctx.stroke();
    const buckets=Array.from({length:7},()=>[]);
    for(const v of land){const p=project(v);if(p[2]>.012)buckets[Math.min(6,Math.floor(p[2]*7))].push(p);}
    buckets.forEach((points,i)=>{ctx.beginPath();for(const p of points){const s=.60+.34*p[2];ctx.moveTo(cx+p[0]*radius+s,cy-p[1]*radius);ctx.arc(cx+p[0]*radius,cy-p[1]*radius,s,0,Math.PI*2);}ctx.fillStyle=['#c5d0c9','#c2cec7','#bfccc4','#bbc9c1','#b8c7be','#b5c5bb','#b0c2b8'][i];ctx.fill();});
    drawCountry(now);
    if(signal){
      route(signal.from,signal.to,'#bf933d80',reduce.matches?0:-now/140,1);
      if(!reduce.matches&&now<signal.arrivedAt){const t=Math.min(1,(now-signal.start)/signal.duration),p=project(mixSphere(signal.from,signal.to,t));if(p[2]>.01){const x=cx+p[0]*radius,y=cy-p[1]*radius;ctx.shadowColor='#e2b448';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle='#e5b047';ctx.fill();ctx.shadowBlur=0;}}
    }
    const projected=cities.map(c=>project(c.v));hits=[];
    cities.map((city,index)=>({city,index,p:projected[index]})).filter(o=>o.p[2]>.035&&(visibleCityNames.has(o.city.name)||o.index===selected)).sort((a,b)=>a.p[2]-b.p[2]).forEach(({city,index,p})=>{
      const x=cx+p[0]*radius,y=cy-p[1]*radius,s=3.8+1.7*p[2];hits.push({index,x,y});ctx.shadowColor='#16413222';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
      ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      ctx.beginPath();ctx.arc(x,y,index===selected?2.6:2,0,Math.PI*2);ctx.fillStyle=index===selected?'#075c40':'#278758';ctx.fill();
    });
    drawLabels(projected);
    if(!reduce.matches||flight||drag)frame=requestAnimationFrame(draw);
  }
  function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function hit(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*size/r.width,y=(e.clientY-r.top)*size/r.height;return hits.filter(h=>Math.hypot(h.x-x,h.y-y)<12).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];}
  world.addEventListener('pointerdown',e=>{if(e.button!==0)return;flight=null;inertia=0;drag={x:e.clientX,y:e.clientY,lon:longitude,lat:latitude,lastX:e.clientX,lastT:performance.now(),moved:false};world.setPointerCapture(e.pointerId);world.classList.add('is-dragging');lastInteraction=performance.now();});
  world.addEventListener('pointermove',e=>{if(drag){hoveredCity=null;const factor=180/world.clientWidth,dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(dx,dy)>5;longitude=drag.lon-dx*factor;latitude=Math.max(-80,Math.min(80,drag.lat+dy*factor));const time=performance.now();inertia=-(e.clientX-drag.lastX)*factor/Math.max(1,time-drag.lastT);drag.lastX=e.clientX;drag.lastT=time;tooltip.hidden=true;schedule();}else{const h=hit(e);hoveredCity=h?h.index:null;tooltip.hidden=true;world.style.cursor=h?'pointer':'grab';schedule();}});
  world.addEventListener('pointerup',e=>{const clicked=drag&&!drag.moved;drag=null;world.classList.remove('is-dragging');lastInteraction=performance.now();if(clicked){const h=hit(e);if(h)selectCity(h.index);}schedule();});
  world.addEventListener('pointercancel',()=>{drag=null;inertia=0;world.classList.remove('is-dragging');});world.addEventListener('pointerleave',()=>{hoveredCity=null;tooltip.hidden=true;schedule();});
  world.addEventListener('pointerenter',()=>{hovered=true;pointerQuietUntil=performance.now()+1600;});world.addEventListener('pointerleave',()=>{hovered=false;pointerQuietUntil=performance.now()+400;});
  world.addEventListener('pointermove',()=>{pointerQuietUntil=performance.now()+1200;},{capture:true,passive:true});
  world.addEventListener('pointerdown',()=>{nextHopAt=performance.now()+7000;},{capture:true,passive:true});
  world.addEventListener('pointerup',()=>{nextHopAt=performance.now()+7000;},{capture:true,passive:true});
  world.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter'].includes(e.key))return;e.preventDefault();flight=null;lastInteraction=performance.now();if(e.key==='Home')center(0);else if(e.key==='Enter')center(selected??0);else{longitude+=e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0;latitude=Math.max(-80,Math.min(80,latitude+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));}schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.01}).observe(world);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{nextHopAt=Math.max(nextHopAt,performance.now()+800);schedule();}});reduce.addEventListener('change',()=>{updateMotionToggle();nextHopAt=performance.now()+800;schedule();});root.addEventListener('bilingvo:resume-globe',schedule);
  async function read(file){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(new URL(file,base),{signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
      if(!response.ok||Number(response.headers.get('Content-Length')||0)>2500000)throw Error(file);
      const reader=response.body.getReader(),chunks=[];let length=0;
      while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2500000){await reader.cancel();throw Error(file);}chunks.push(value);}
      const bytes=new Uint8Array(length);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
      return JSON.parse(new TextDecoder().decode(bytes));
    }finally{clearTimeout(timer);}
  }
  function validateGeography(points,places,areas){
    const vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1.01);
    if(!Array.isArray(points)||points.length>100000||!points.every(vec))throw Error('land');
    if(!Array.isArray(places)||places.length>250||!places.length)throw Error('cities');
    for(const c of places){if(!c||typeof c!=='object'||!['name','countryName','native','lang','country'].every(k=>typeof c[k]==='string'&&c[k].length>0&&c[k].length<=80)||!/^[A-Z]{3}$/.test(c.country)||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||Math.abs(c.lat)>90||Math.abs(c.lon)>180)throw Error('city');}
    if(!areas||typeof areas!=='object'||Array.isArray(areas)||Object.keys(areas).length>200)throw Error('countries');
    let vertices=0;
    for(const [code,area] of Object.entries(areas)){
      if(!/^[A-Z]{3}$/.test(code)||!area||!Array.isArray(area.triangles)||area.triangles.length>20000||!Array.isArray(area.rings)||area.rings.length>500)throw Error('country');
      for(const tri of area.triangles){if(!Array.isArray(tri)||tri.length!==3||!tri.every(vec))throw Error('triangle');vertices+=3;}
      for(const ring of area.rings){if(!Array.isArray(ring)||ring.length>20000||!ring.every(vec))throw Error('ring');vertices+=ring.length;}
      if(vertices>300000)throw Error('geometry-size');
    }
    if(!places.every(c=>Object.hasOwn(areas,c.country)))throw Error('country-reference');
  }
  Promise.all([read('globe-land.json'),read('globe-cities.json'),read('globe-countries.json')]).then(([points,places,areas])=>{
    validateGeography(points,places,areas);
    land=points;countries=areas;cities=places.map(c=>({...c,v:vector(c.lat,c.lon)}));
    world.dataset.cityCount=String(cities.length);world.dataset.languageCount=String(new Set(cities.map(c=>c.lang)).size);world.dataset.countryCount=String(Object.keys(countries).length);
    buildLabels();nextHopAt=performance.now()+900;schedule();
  }).catch(()=>{status.textContent='Не удалось загрузить карту. Обновите страницу.';});
  schedule();
})();
