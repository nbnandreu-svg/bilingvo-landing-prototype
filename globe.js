/* Geographic globe: every land/city point is a unit vector on a sphere. */
(() => {
  const root=document.getElementById('bilingvo-site');
  if(!root||root.dataset.globeInitialized)return;
  root.dataset.globeInitialized='true';
  const world=root.querySelector('.globe-world'),canvas=root.querySelector('.globe-connections'),ctx=canvas.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const base=new URL((window.BilingvoConfig||{}).assetBase||root.dataset.assetBase||'./assets/',document.baseURI);
  const rad=Math.PI/180;
  const cities=[
    ['Лондон',51.507,-.128,'EN'],['Париж',48.857,2.352,'FR'],['Пекин',39.904,116.407,'ZH'],['Эр-Рияд',24.714,46.675,'AR'],
    ['Шанхай',31.23,121.47,'ZH'],['Гуанчжоу',23.13,113.26,'ZH'],['Сингапур',1.35,103.82,'EN'],['Токио',35.68,139.69,'EN'],
    ['Сеул',37.57,126.98,'EN'],['Дели',28.61,77.21,'EN'],['Дубай',25.2,55.27,'AR'],['Каир',30.04,31.24,'AR'],
    ['Касабланка',33.57,-7.59,'AR'],['Алжир',36.75,3.06,'AR'],['Дакар',14.72,-17.47,'FR'],['Найроби',-1.29,36.82,'EN'],
    ['Кейптаун',-33.92,18.42,'EN'],['Сидней',-33.87,151.21,'EN'],['Мельбурн',-37.81,144.96,'EN'],['Окленд',-36.85,174.76,'EN'],
    ['Нью-Йорк',40.71,-74.01,'EN'],['Торонто',43.65,-79.38,'EN'],['Монреаль',45.5,-73.57,'FR'],['Ванкувер',49.28,-123.12,'EN'],
    ['Сан-Франциско',37.77,-122.42,'EN'],['Мехико',19.43,-99.13,'EN'],['Сан-Паулу',-23.55,-46.63,'EN'],['Буэнос-Айрес',-34.60,-58.38,'EN'],
    ['Сантьяго',-33.45,-70.67,'EN'],['Москва',55.75,37.62,'EN'],['Берлин',52.52,13.40,'EN'],['Рим',41.90,12.50,'EN'],
    ['Мадрид',40.42,-3.70,'EN'],['Стокгольм',59.33,18.07,'EN'],['Стамбул',41.01,28.98,'EN'],['Бангкок',13.76,100.50,'EN']
  ].map(([name,lat,lon,lang])=>({name,lat,lon,lang,v:[Math.cos(lat*rad)*Math.sin(lon*rad),Math.sin(lat*rad),Math.cos(lat*rad)*Math.cos(lon*rad)]}));
  const destination={EN:0,FR:1,ZH:2,AR:3};
  let land=[],longitude=30,latitude=22,selected=0,flight=null,drag=null,inertia=0,visible=true,frame=0,last=0,lastInteraction=performance.now(),hits=[];
  const size=500,cx=250,cy=250;
  let radius=222,hasSelection=false,arrivedAt=-Infinity;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=size*dpr;canvas.height=size*dpr;
  world.style.transform='none';world.style.transition='none';world.setAttribute('role','application');world.setAttribute('aria-label','Объемный глобус. Вращайте перетаскиванием или стрелками. Нажмите город или подпись языка, чтобы перейти к нему.');
  const tooltip=document.createElement('span');tooltip.className='globe-city-tooltip';tooltip.hidden=true;world.appendChild(tooltip);
  const cityStatus=document.createElement('span');cityStatus.className='globe-city-status';cityStatus.setAttribute('aria-live','polite');root.querySelector('.globe-demo').appendChild(cityStatus);
  // Labels share the exact projected city coordinates, not fixed overlay positions.
  const labels=[...root.querySelectorAll('.globe-language')].map(button=>{
    const cityIndex=destination[button.dataset.lang],anchor=document.createElement('div');
    anchor.className='globe-geographic-label';
    Object.assign(anchor.style,{position:'absolute',width:'0',height:'0',pointerEvents:'none'});
    const left=button.dataset.lang==='EN',below=button.dataset.lang==='FR';
    Object.assign(button.style,{left:'0',top:'0',right:'auto',bottom:'auto',marginLeft:left?'-10px':'10px',marginTop:below?'10px':'-10px',transform:`translate(${left?'-100%':'0'},${below?'0':'-100%'})`,translate:'none',animation:'none',transition:'background .2s, border-color .2s',pointerEvents:'auto'});
    button.title=cities[cityIndex].name;
    button.addEventListener('pointerdown',event=>event.stopPropagation());
    button.addEventListener('pointerup',event=>event.stopPropagation());
    button.addEventListener('pointermove',event=>event.stopPropagation());
    button.addEventListener('keydown',event=>event.stopPropagation());
    anchor.appendChild(button);world.appendChild(anchor);
    return {anchor,button,cityIndex,left,below};
  });
  function project(v){
    const a=longitude*rad,b=latitude*rad,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
    const x=v[0]*ca-v[2]*sa,z0=v[0]*sa+v[2]*ca;
    return [x,v[1]*cb-z0*sb,v[1]*sb+z0*cb];
  }
  function center(city){
    selected=cities.indexOf(city);lastInteraction=performance.now();inertia=0;hasSelection=true;arrivedAt=-Infinity;
    const delta=((city.lon-longitude+540)%360)-180;
    flight={fromLon:longitude,fromLat:latitude,fromRadius:radius,toLon:longitude+delta,toLat:city.lat,start:performance.now(),duration:reduce.matches?0:1450};
    cityStatus.textContent=city.name;cityStatus.dataset.city=city.name;cityStatus.style.color='#a0782d';
    root.querySelectorAll('.globe-language').forEach(b=>{b.classList.toggle('globe-destination',b.dataset.lang===city.lang);});
    schedule();
  }
  root.addEventListener('bilingvo:languagechange',e=>{if(destination[e.detail]!==undefined)center(cities[destination[e.detail]]);});
  function choose(city){
    const button=root.querySelector(`.globe-language[data-lang="${city.lang}"]`);
    if(button)button.click();center(city);
  }
  function draw(now){
    frame=0;if(!visible||document.hidden)return;
    const dt=Math.min(50,now-(last||now));last=now;
    if(flight){const t=flight.duration?Math.min(1,(now-flight.start)/flight.duration):1,k=t*t*t*(t*(t*6-15)+10);longitude=flight.fromLon+(flight.toLon-flight.fromLon)*k;latitude=flight.fromLat+(flight.toLat-flight.fromLat)*k;radius=flight.fromRadius+(230-flight.fromRadius)*k;if(t===1){flight=null;arrivedAt=now;}}
    else if(!drag&&!reduce.matches){if(Math.abs(inertia)>.001){longitude+=inertia*dt;inertia*=.94;}else if(now-lastInteraction>12000)longitude+=dt*.0015;}
    world.dataset.beacon=hasSelection?(flight?'approaching':'gold'):'none';
    world.dataset.longitude=longitude.toFixed(2);world.dataset.latitude=latitude.toFixed(2);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
    const surface=ctx.createRadialGradient(180,145,12,250,250,radius);surface.addColorStop(0,'#ffffff');surface.addColorStop(.66,'#f7f8f7');surface.addColorStop(.92,'#e9eeeb');surface.addColorStop(1,'#d7e0db');
    ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fillStyle=surface;ctx.fill();ctx.strokeStyle='#d6dfda';ctx.lineWidth=.7;ctx.stroke();
    // Orthographic projection retains a circular silhouette at every rotation.
    const buckets=Array.from({length:7},()=>[]);
    for(const v of land){const p=project(v);if(p[2]>.012)buckets[Math.min(6,Math.floor(p[2]*7))].push(p);}
    buckets.forEach((points,i)=>{ctx.beginPath();for(const p of points){const s=.60+.34*p[2];ctx.moveTo(cx+p[0]*radius+s,cy-p[1]*radius);ctx.arc(cx+p[0]*radius,cy-p[1]*radius,s,0,Math.PI*2);}ctx.fillStyle=['#c5d0c9','#c2cec7','#bfccc4','#bbc9c1','#b8c7be','#b5c5bb','#b0c2b8'][i];ctx.fill();});
    // Routes are also on the sphere, and disappear behind the horizon.
    const home=cities[29].v;
    [...new Set([0,1,2,3,selected])].forEach(id=>{const target=cities[id].v;let started=false;ctx.beginPath();for(let i=0;i<=80;i++){const t=i/80;let v=home.map((n,k)=>n*(1-t)+target[k]*t);const length=Math.hypot(...v);v=v.map(n=>n/length);const p=project(v);if(p[2]>0){const x=cx+p[0]*radius,y=cy-p[1]*radius;if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}else started=false;}ctx.strokeStyle=id===selected&&hasSelection?'#c1943eaa':'#508d7355';ctx.lineWidth=id===selected&&hasSelection?1.5:1.1;ctx.setLineDash([2,5]);ctx.lineDashOffset=reduce.matches?0:-now/150;ctx.stroke();ctx.setLineDash([]);});
    hits=[];
    cities.map((city,index)=>({city,index,p:project(city.v)})).filter(o=>o.p[2]>.03).sort((a,b)=>a.p[2]-b.p[2]).forEach(({city,index,p})=>{
      const x=cx+p[0]*radius,y=cy-p[1]*radius,s=4+2*p[2];hits.push({city,x,y});
      ctx.shadowColor='#16413226';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      if(index===selected&&hasSelection){
        const pulse=reduce.matches?0:(Math.sin(now/460)+1)/2;
        const flash=reduce.matches?0:Math.max(0,1-(now-arrivedAt)/1200);
        const glowRadius=21+3*pulse+12*flash;
        const glow=ctx.createRadialGradient(x,y,2,x,y,glowRadius);
        glow.addColorStop(0,'rgba(255,207,101,.82)');glow.addColorStop(.35,'rgba(236,175,54,.36)');glow.addColorStop(1,'rgba(222,159,36,0)');
        ctx.beginPath();ctx.arc(x,y,glowRadius,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
        if(flash>0){ctx.beginPath();ctx.arc(x,y,8+(1-flash)*28,0,Math.PI*2);ctx.strokeStyle=`rgba(217,160,46,${flash*.7})`;ctx.lineWidth=1.2;ctx.stroke();}
        ctx.beginPath();ctx.arc(x,y,11+pulse*2,0,Math.PI*2);ctx.strokeStyle='rgba(204,150,39,.35)';ctx.lineWidth=.9;ctx.stroke();
        ctx.shadowColor='#e9b345';ctx.shadowBlur=12+6*pulse;ctx.beginPath();ctx.arc(x,y,5+flash,0,Math.PI*2);ctx.fillStyle='#dca334';ctx.fill();ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(x-.7,y-.7,2.2,0,Math.PI*2);ctx.fillStyle='#fff2c3';ctx.fill();
      }else{ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fillStyle='#25895c';ctx.fill();}
    });
    labels.forEach(({anchor,button,cityIndex,left,below})=>{
      const p=project(cities[cityIndex].v),show=p[2]>.07;
      anchor.hidden=!show;button.tabIndex=show?0:-1;
      if(!show)return;
      const x=cx+p[0]*radius,y=cy-p[1]*radius;
      anchor.style.left=`${x/size*100}%`;anchor.style.top=`${y/size*100}%`;
      anchor.style.opacity=String(Math.min(1,(p[2]-.07)/.15));
      anchor.style.zIndex=String(3+Math.round(p[2]*10));
      anchor.dataset.city=cities[cityIndex].name;
      button.classList.toggle('globe-destination',hasSelection&&cityIndex===selected);
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(left?-8:8),y+(below?10:-10));
      ctx.strokeStyle=hasSelection&&cityIndex===selected?'#c1943eaa':'#739a8588';ctx.lineWidth=.9;ctx.stroke();
    });
    if(!reduce.matches||flight||drag)frame=requestAnimationFrame(draw);
  }
  function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function local(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*size/r.width,y:(e.clientY-r.top)*size/r.height};}
  function findHit(e){const p=local(e);return hits.filter(h=>Math.hypot(h.x-p.x,h.y-p.y)<13).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];}
  world.addEventListener('pointerdown',e=>{if(e.button!==0)return;flight=null;inertia=0;drag={x:e.clientX,y:e.clientY,lon:longitude,lat:latitude,lastX:e.clientX,lastT:performance.now(),moved:false};world.setPointerCapture(e.pointerId);world.classList.add('is-dragging');lastInteraction=performance.now();});
  world.addEventListener('pointermove',e=>{if(drag){const factor=180/world.clientWidth;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(dx,dy)>5;longitude=drag.lon-dx*factor;latitude=Math.max(-80,Math.min(80,drag.lat+dy*factor));const time=performance.now();inertia=-(e.clientX-drag.lastX)*factor/Math.max(1,time-drag.lastT);drag.lastX=e.clientX;drag.lastT=time;tooltip.hidden=true;schedule();}else{const hit=findHit(e);tooltip.hidden=!hit;world.style.cursor=hit?'pointer':'grab';if(hit){tooltip.textContent=hit.city.name;tooltip.style.left=`${hit.x/5}%`;tooltip.style.top=`${hit.y/5}%`;}}});
  world.addEventListener('pointerup',e=>{const clicked=drag&&!drag.moved;drag=null;world.classList.remove('is-dragging');lastInteraction=performance.now();if(clicked){const hit=findHit(e);if(hit)choose(hit.city);}schedule();});
  world.addEventListener('pointercancel',()=>{drag=null;inertia=0;world.classList.remove('is-dragging');});world.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
  world.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter'].includes(e.key))return;e.preventDefault();flight=null;lastInteraction=performance.now();if(e.key==='Home')center(cities[0]);else if(e.key==='Enter')center(cities[selected]);else{longitude+=e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0;latitude=Math.max(-80,Math.min(80,latitude+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));}schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.01}).observe(world);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
  reduce.addEventListener('change',schedule);root.addEventListener('bilingvo:resume-globe',schedule);
  fetch(new URL('globe-land.json',base)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(points=>{land=points;schedule();}).catch(()=>{cityStatus.textContent='Не удалось загрузить карту. Обновите страницу.';});
  cityStatus.textContent='Вращайте глобус · выберите город';schedule();
})();
