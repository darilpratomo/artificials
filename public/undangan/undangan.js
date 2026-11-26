(function(){
  var html=document.documentElement;
  html.classList.add('js','locked');

  /* ---- performance tier ---- */
  var nav=navigator;
  var rm=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lite=rm||(nav.hardwareConcurrency&&nav.hardwareConcurrency<=4)||(nav.deviceMemory&&nav.deviceMemory<=3)||(nav.connection&&nav.connection.saveData);
  if(lite) html.classList.add('lite');
  if(rm) html.classList.add('rm');

  var $=function(id){return document.getElementById(id)};

  /* ---- guest name: ?to=Nama+Tamu ---- */
  var q=new URLSearchParams(location.search), to=q.get('to')||q.get('kpd');
  if(to){ $('guestName').textContent=to.slice(0,60); $('fNama').value=to.slice(0,60); }

  /* ---- characters (inline SVG) ---- */
  var SH='<ellipse class="cshadow" cx="60" cy="226" rx="34" ry="6" fill="rgba(0,0,0,.4)"/>';
  var CH={
  disco:'<svg class="char c-disco" viewBox="0 0 120 240" aria-hidden="true">'+SH+'<g class="cbody">'+
    '<g class="legL" style="transform-origin:52px 128px"><path d="M46 126h13l-3 66 7 16H38l7-16z" fill="#fff" stroke="#d8d0ff" stroke-width="1.5"/><rect x="36" y="206" width="28" height="9" rx="4.5" fill="#1a1a1a"/></g>'+
    '<g class="legR" style="transform-origin:68px 128px"><path d="M61 126h13l1 66 7 16H57l5-16z" fill="#fff" stroke="#d8d0ff" stroke-width="1.5"/><rect x="56" y="206" width="28" height="9" rx="4.5" fill="#1a1a1a"/></g>'+
    '<rect x="45" y="119" width="30" height="8" rx="2" fill="#ffe600"/><rect x="56" y="120" width="8" height="6" rx="1" fill="#ff7a00"/>'+
    '<g class="armL"><path d="M45 70 L30 98 L46 113" fill="none" stroke="#b026ff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="113" r="5.5" fill="#c68642"/></g>'+
    '<path d="M42 68 Q60 58 78 68 L76 122 H44 Z" fill="#b026ff"/>'+
    '<circle cx="50" cy="100" r="2.5" fill="#ffe600"/><circle cx="70" cy="92" r="2.5" fill="#00e5ff"/><circle cx="66" cy="110" r="2.5" fill="#ff2e88"/>'+
    '<rect x="55" y="50" width="10" height="14" fill="#c68642"/>'+
    '<path d="M54 62 L60 84 L66 62 Z" fill="#c68642"/>'+
    '<path d="M53 60 L60 78 L43 70 Z" fill="#fff"/><path d="M67 60 L60 78 L77 70 Z" fill="#fff"/>'+
    '<path d="M55 65 Q60 76 65 65" stroke="#ffd700" stroke-width="2" fill="none"/>'+
    '<g class="armR" style="transform-origin:75px 70px"><line x1="75" y1="70" x2="98" y2="24" stroke="#b026ff" stroke-width="10" stroke-linecap="round"/><circle cx="99" cy="20" r="6" fill="#c68642"/></g>'+
    '<g class="head" style="transform-origin:60px 56px">'+
      '<g fill="#1e0f06"><circle cx="60" cy="30" r="24"/><circle cx="40" cy="22" r="9"/><circle cx="50" cy="11" r="9"/><circle cx="65" cy="9" r="9"/><circle cx="79" cy="18" r="9"/><circle cx="84" cy="32" r="8"/><circle cx="36" cy="35" r="8"/></g>'+
      '<ellipse cx="60" cy="41" rx="13" ry="15" fill="#c68642"/>'+
      '<rect x="47" y="35" width="12" height="7" rx="3" fill="#00e5ff"/><rect x="61" y="35" width="12" height="7" rx="3" fill="#00e5ff"/><line x1="58" y1="38" x2="62" y2="38" stroke="#111" stroke-width="2"/>'+
      '<path d="M54 48 Q60 54 66 48" stroke="#3a1a05" stroke-width="2" fill="none" stroke-linecap="round"/>'+
    '</g></g></svg>',

  aero:'<svg class="char c-aero" viewBox="0 0 120 240" aria-hidden="true">'+SH+'<g class="cbody">'+
    '<g class="legL" style="transform-origin:54px 126px"><line x1="54" y1="126" x2="48" y2="202" stroke="#00e5ff" stroke-width="12" stroke-linecap="round"/>'+
      '<line x1="49.4" y1="176" x2="47.8" y2="200" stroke="#ffe600" stroke-width="15"/><line x1="49.4" y1="176" x2="47.8" y2="200" stroke="#ff2e88" stroke-width="15" stroke-dasharray="3 4"/>'+
      '<ellipse cx="46" cy="208" rx="12" ry="6" fill="#fff"/></g>'+
    '<g class="legR" style="transform-origin:66px 126px"><line x1="66" y1="126" x2="72" y2="202" stroke="#00e5ff" stroke-width="12" stroke-linecap="round"/>'+
      '<line x1="70.6" y1="176" x2="72.2" y2="200" stroke="#ffe600" stroke-width="15"/><line x1="70.6" y1="176" x2="72.2" y2="200" stroke="#ff2e88" stroke-width="15" stroke-dasharray="3 4"/>'+
      '<ellipse cx="74" cy="208" rx="12" ry="6" fill="#fff"/></g>'+
    '<g class="armL" style="transform-origin:46px 70px"><line x1="46" y1="70" x2="24" y2="30" stroke="#ffdbac" stroke-width="9" stroke-linecap="round"/><line x1="28" y1="38" x2="25.5" y2="33" stroke="#39ff14" stroke-width="11"/><circle cx="23" cy="28" r="5.5" fill="#ffdbac"/></g>'+
    '<g class="armR" style="transform-origin:74px 70px"><line x1="74" y1="70" x2="96" y2="30" stroke="#ffdbac" stroke-width="9" stroke-linecap="round"/><line x1="92" y1="38" x2="94.5" y2="33" stroke="#39ff14" stroke-width="11"/><circle cx="97" cy="28" r="5.5" fill="#ffdbac"/></g>'+
    '<path d="M45 68 Q60 60 75 68 L73 116 L64 132 H56 L47 116 Z" fill="#ff2e88"/>'+
    '<path d="M46 94 L74 84 L74 93 L46 103 Z" fill="#ffe600"/><path d="M46 106 L74 96 L74 100 L46 110 Z" fill="#b026ff"/>'+
    '<rect x="55" y="50" width="10" height="13" fill="#ffdbac"/>'+
    '<g class="head" style="transform-origin:60px 56px">'+
      '<g class="pony" style="transform-origin:74px 26px"><path d="M72 22 Q98 14 95 46 Q88 34 76 34 Z" fill="#ffb703"/><circle cx="74" cy="25" r="4.5" fill="#39ff14"/></g>'+
      '<circle cx="60" cy="36" r="19" fill="#ffb703"/>'+
      '<circle cx="60" cy="42" r="13" fill="#ffdbac"/>'+
      '<path d="M46 38 Q50 20 62 22 Q74 22 75 36 Q68 28 60 31 Q52 29 46 38Z" fill="#ffb703"/>'+
      '<path d="M43 33 Q60 24 77 33" stroke="#39ff14" stroke-width="5" fill="none" stroke-linecap="round"/>'+
      '<circle cx="55" cy="42" r="1.7" fill="#222"/><circle cx="65" cy="42" r="1.7" fill="#222"/>'+
      '<circle cx="51" cy="47" r="2.5" fill="#ff8fb8"/><circle cx="69" cy="47" r="2.5" fill="#ff8fb8"/>'+
      '<path d="M55 48 Q60 53 65 48" stroke="#d61f69" stroke-width="2" fill="none" stroke-linecap="round"/>'+
    '</g></g></svg>',

  box:'<svg class="char c-box" viewBox="0 0 120 240" aria-hidden="true">'+SH+'<g class="cbody">'+
    '<g class="legL" style="transform-origin:53px 126px"><line x1="53" y1="126" x2="49" y2="202" stroke="#2f5fd0" stroke-width="13" stroke-linecap="round"/><rect x="37" y="202" width="24" height="10" rx="5" fill="#fff"/><rect x="38" y="199" width="20" height="7" rx="3.5" fill="#ff2e88"/></g>'+
    '<g class="legR" style="transform-origin:67px 126px"><line x1="67" y1="126" x2="72" y2="202" stroke="#2f5fd0" stroke-width="13" stroke-linecap="round"/><rect x="62" y="202" width="24" height="10" rx="5" fill="#fff"/><rect x="64" y="199" width="20" height="7" rx="3.5" fill="#ff2e88"/></g>'+
    '<g class="armL" style="transform-origin:45px 70px"><line x1="45" y1="70" x2="36" y2="118" stroke="#ffe600" stroke-width="10" stroke-linecap="round"/><circle cx="35" cy="121" r="5.5" fill="#f1c27d"/></g>'+
    '<path d="M43 68 Q60 60 77 68 L76 128 H44 Z" fill="#ffe600"/>'+
    '<path d="M44 96 L76 88 L76 104 L44 112 Z" fill="#00e5ff"/><path d="M44 112 L76 104 L76 128 H44 Z" fill="#ff2e88"/>'+
    '<line x1="60" y1="64" x2="60" y2="128" stroke="#333" stroke-width="1.5"/>'+
    '<rect x="55" y="50" width="10" height="13" fill="#f1c27d"/>'+
    '<g class="head" style="transform-origin:60px 56px">'+
      '<path d="M44 34 Q44 18 60 18 Q76 18 76 34 L79 58 Q70 52 70 44 L50 44 Q50 52 41 58 Z" fill="#6b3e1e"/>'+
      '<circle cx="60" cy="40" r="13" fill="#f1c27d"/>'+
      '<path d="M46 36 Q46 20 60 21 Q74 20 74 36 Q70 28 60 29 Q50 28 46 36Z" fill="#6b3e1e"/>'+
      '<rect x="48" y="36" width="11" height="6" rx="3" fill="#ff2e88"/><rect x="61" y="36" width="11" height="6" rx="3" fill="#ff2e88"/><line x1="58" y1="38" x2="62" y2="38" stroke="#111" stroke-width="2"/>'+
      '<ellipse cx="60" cy="48.5" rx="2.6" ry="3" fill="#5a2d0c"/>'+
    '</g>'+
    '<path d="M75 70 L94 76 L94 58" fill="none" stroke="#ffe600" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="94" cy="56" r="5.5" fill="#f1c27d"/>'+
    '<g class="boombox"><path d="M82 26 Q96 12 110 26" stroke="#ddd" stroke-width="3" fill="none"/>'+
      '<rect x="74" y="25" width="44" height="28" rx="4" fill="#2b2b2b" stroke="#ff2e88" stroke-width="1.5"/>'+
      '<rect x="89" y="28" width="14" height="7" rx="1" fill="#00e5ff"/>'+
      '<g class="spk fb"><circle cx="84" cy="43" r="7.5" fill="#666"/><circle cx="84" cy="43" r="3.5" fill="#111"/></g>'+
      '<g class="spk fb"><circle cx="108" cy="43" r="7.5" fill="#666"/><circle cx="108" cy="43" r="3.5" fill="#111"/></g>'+
      '<text class="note fb" x="96" y="20" font-size="12" fill="#ffe600">♪</text><text class="note n2 fb" x="110" y="18" font-size="11" fill="#00e5ff">♫</text>'+
    '</g></g></svg>',

  roll:'<svg class="char c-roll" viewBox="0 0 120 240" aria-hidden="true">'+SH+'<g class="cbody">'+
    '<g class="legL" style="transform-origin:53px 136px"><line x1="53" y1="136" x2="50" y2="192" stroke="#8d5524" stroke-width="10" stroke-linecap="round"/>'+
      '<line x1="50.6" y1="174" x2="50" y2="194" stroke="#fff" stroke-width="11"/><line x1="45" y1="178" x2="56" y2="178" stroke="#ff2e88" stroke-width="2.2"/><line x1="45" y1="182" x2="56" y2="182" stroke="#00e5ff" stroke-width="2.2"/>'+
      '<rect x="40" y="192" width="19" height="13" rx="4" fill="#fff"/><rect x="38" y="203" width="26" height="4" rx="2" fill="#ff2e88"/><circle cx="44" cy="211" r="4.2" fill="#ffe600"/><circle cx="58" cy="211" r="4.2" fill="#ffe600"/></g>'+
    '<g class="legR" style="transform-origin:67px 136px"><line x1="67" y1="136" x2="72" y2="192" stroke="#8d5524" stroke-width="10" stroke-linecap="round"/>'+
      '<line x1="70.4" y1="174" x2="72" y2="194" stroke="#fff" stroke-width="11"/><line x1="65" y1="178" x2="76" y2="178" stroke="#ff2e88" stroke-width="2.2"/><line x1="65" y1="182" x2="76" y2="182" stroke="#00e5ff" stroke-width="2.2"/>'+
      '<rect x="62" y="192" width="19" height="13" rx="4" fill="#fff"/><rect x="60" y="203" width="26" height="4" rx="2" fill="#ff2e88"/><circle cx="66" cy="211" r="4.2" fill="#ffe600"/><circle cx="80" cy="211" r="4.2" fill="#ffe600"/></g>'+
    '<path d="M45 118 H75 L77 142 H62 L60 134 L58 142 H43 Z" fill="#b026ff"/>'+
    '<g class="arms" style="transform-origin:60px 70px">'+
      '<path d="M45 70 L26 86 L14 80" fill="none" stroke="#8d5524" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="79" r="5" fill="#8d5524"/>'+
      '<path d="M75 70 L94 86 L106 80" fill="none" stroke="#8d5524" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="107" cy="79" r="5" fill="#8d5524"/></g>'+
    '<path d="M44 68 Q60 60 76 68 L75 120 H45 Z" fill="#fff"/>'+
    '<rect x="44.6" y="80" width="30.8" height="6" fill="#00e5ff"/><rect x="44.8" y="94" width="30.4" height="6" fill="#ff2e88"/><rect x="45" y="108" width="30" height="6" fill="#ffe600"/>'+
    '<rect x="55" y="50" width="10" height="13" fill="#8d5524"/>'+
    '<g class="head" style="transform-origin:60px 56px">'+
      '<ellipse cx="62" cy="9" rx="10" ry="10" fill="#222"/><ellipse cx="60" cy="19" rx="6.5" ry="3" fill="#ffe600"/>'+
      '<circle cx="60" cy="37" r="17" fill="#222"/>'+
      '<circle cx="60" cy="42" r="13" fill="#8d5524"/>'+
      '<path d="M47 38 Q49 24 60 25 Q71 24 73 38 Q66 31 60 33 Q54 31 47 38 Z" fill="#222"/>'+
      '<circle cx="46.5" cy="49" r="4" stroke="#ffe600" stroke-width="1.6" fill="none"/><circle cx="73.5" cy="49" r="4" stroke="#ffe600" stroke-width="1.6" fill="none"/>'+
      '<circle cx="55" cy="42" r="1.7" fill="#111"/><circle cx="65" cy="42" r="1.7" fill="#111"/>'+
      '<path d="M55 48 Q60 53 65 48" stroke="#ff2e88" stroke-width="2" fill="none" stroke-linecap="round"/>'+
    '</g></g></svg>'
  };
  document.querySelectorAll('[data-char]').forEach(function(el,i){
    el.innerHTML=CH[el.getAttribute('data-char')];
    // stagger so the crew doesn't move in perfect unison
    el.firstChild.style.setProperty('--beat',(0.68+((i*37)%7)/100)+'s');
  });

  /* ---- marquee ---- */
  var mtxt='★ NIGHT OF 80’S ★ OUTSOURCING AWARDS 2026 ★ DRESS CODE: 80’S COLORFUL ★ NEON ★ RETRO ★ DISCO ★ ';
  $('mq1').innerHTML='<span>'+mtxt+'</span><span>'+mtxt+'</span>';
  var mtxt2='♪ 11 DESEMBER 2026 ♪ 18.30 WIB ♪ GRIPA STUDIO ♪ JAKARTA SELATAN ♪ SEE YOU THERE ';
  $('mq2').innerHTML='<span>'+mtxt2+'</span><span>'+mtxt2+'</span>';

  /* ---- disco floor tiles ---- */
  var cols=['#ff2e88','#00e5ff','#ffe600','#b026ff','#39ff14','#ff7a00'], f='';
  for(var t=0;t<24;t++){ f+='<i style="--c:'+cols[(t*5+Math.floor(t/8))%6]+';--d:-'+((t*0.37)%1.4).toFixed(2)+'s"></i>'; }
  $('floor').innerHTML=f;

  /* ---- floating memphis shapes ---- */
  var SV={
    tri:function(c){return '<path d="M20 5 L36 33 H4Z" fill="none" stroke="'+c+'" stroke-width="4" stroke-linejoin="round"/>'},
    squig:function(c){return '<path d="M2 20 Q8 8 14 20 T26 20 T38 20" fill="none" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>'},
    dot:function(c){return '<circle cx="20" cy="20" r="10" fill="'+c+'"/>'},
    zig:function(c){return '<path d="M2 26 L10 14 L18 26 L26 14 L34 26" fill="none" stroke="'+c+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'},
    plus:function(c){return '<path d="M20 6V34M6 20H34" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>'},
    ring:function(c){return '<circle cx="20" cy="20" r="13" fill="none" stroke="'+c+'" stroke-width="4"/>'}
  };
  var kinds=['tri','squig','ring','zig','plus','dot','squig','tri','ring','zig','plus','dot'];
  var pos=[[6,14],[86,10],[14,40],[82,34],[48,20],[5,66],[90,60],[28,84],[70,78],[50,94],[22,6],[62,50]];
  var sh='';
  for(var k=0;k<kinds.length;k++){
    sh+='<span class="shape" style="left:'+pos[k][0]+'%;top:'+pos[k][1]+'%;--s:'+(26+(k*7)%20)+'px;--t:'+(5+(k%4))+'s;--d:-'+(k*0.7).toFixed(1)+'s"><svg viewBox="0 0 40 40">'+SV[kinds[k]](cols[k%6])+'</svg></span>';
  }
  $('shapes').innerHTML=sh;

  /* ---- countdown ---- */
  var target=new Date('2026-12-11T18:30:00+07:00').getTime(), last={}, iv;
  function setv(id,v){ v=v<10?'0'+v:''+v; if(last[id]!==v){ $(id).textContent=v; last[id]=v; } }
  function tick(){
    var d=target-Date.now();
    if(d<=0){ setv('cdD',0);setv('cdH',0);setv('cdM',0);setv('cdS',0); $('cdMsg').textContent="It's party time! 🎉"; clearInterval(iv); return; }
    var s=Math.floor(d/1000);
    setv('cdD',Math.floor(s/86400)); setv('cdH',Math.floor(s%86400/3600)); setv('cdM',Math.floor(s%3600/60)); setv('cdS',s%60);
  }
  tick(); iv=setInterval(tick,1000);

  /* ---- music ---- */
  var audio=$('bgm'), mBtn=$('musicBtn'), userPaused=false, hiddenPaused=false, fadeT;
  audio.volume=0.85;
  function setUI(p){ mBtn.classList.toggle('playing',p); }
  audio.addEventListener('play',function(){setUI(true)});
  audio.addEventListener('pause',function(){setUI(false)});
  function fadeIn(){
    clearInterval(fadeT); var v=0; try{audio.volume=0}catch(e){}
    fadeT=setInterval(function(){ v+=0.05; if(v>=0.85){v=0.85;clearInterval(fadeT)} try{audio.volume=v}catch(e){} },80);
  }
  function play(fade){
    var p=audio.play();
    if(fade) fadeIn();
    if(p&&p.catch) p.catch(function(){ setUI(false); });
  }
  // try autoplay right away (most mobile browsers block it until the first tap)
  play(false);

  mBtn.addEventListener('click',function(){
    if(audio.paused){ userPaused=false; play(true); } else { userPaused=true; audio.pause(); }
  });
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){ if(!audio.paused){ hiddenPaused=true; audio.pause(); } }
    else if(hiddenPaused && !userPaused){ hiddenPaused=false; play(true); }
  });

  /* ---- open invitation ---- */
  $('openBtn').addEventListener('click',function(){
    play(audio.paused);
    var cover=$('cover');
    cover.classList.add('gone');
    html.classList.remove('locked');
    document.body.classList.add('opened');
    window.scrollTo(0,0);
    confetti();
    mBtn.classList.add('show-lbl'); setTimeout(function(){mBtn.classList.remove('show-lbl')},3500);
    setTimeout(function(){ cover.style.display='none'; },1000);
    setTimeout(fpsProbe,2500);
  });

  /* ---- confetti burst ---- */
  function confetti(){
    if(rm) return;
    var n=html.classList.contains('lite')?18:46, box=document.createElement('div'), s='';
    box.className='confetti';
    for(var i=0;i<n;i++){
      s+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;background:'+cols[i%6]+';animation-delay:'+(Math.random()*.7).toFixed(2)+'s;animation-duration:'+(2.4+Math.random()*1.8).toFixed(2)+'s;--r:'+((Math.random()*900-450)|0)+'deg;--x:'+((Math.random()*100-50)|0)+'px"></i>';
    }
    box.innerHTML=s; document.body.appendChild(box);
    setTimeout(function(){box.remove()},5500);
  }

  /* ---- adaptive: drop to lite mode if the device can't keep up ---- */
  function fpsProbe(){
    if(html.classList.contains('lite')||!window.requestAnimationFrame) return;
    var n=0,t0=0;
    function fr(t){ if(!t0)t0=t; n++; if(t-t0<2000) requestAnimationFrame(fr); else if(n*1000/(t-t0)<42) html.classList.add('lite'); }
    requestAnimationFrame(fr);
  }

  /* ---- scroll reveal + pause off-screen animation ---- */
  if('IntersectionObserver' in window){
    var ro=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); } });
    },{rootMargin:'0px 0px -8% 0px',threshold:.12});
    document.querySelectorAll('.rv').forEach(function(el){ro.observe(el)});
    var po=new IntersectionObserver(function(es){
      es.forEach(function(e){ e.target.classList.toggle('off',!e.isIntersecting); });
    },{rootMargin:'80px 0px'});
    document.querySelectorAll('main > section, .foot').forEach(function(el){po.observe(el)});
  } else {
    document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
  }

  /* ---- RSVP via WhatsApp (nomor dummy) ---- */
  var WA='6281234567890';
  $('rsvpForm').addEventListener('submit',function(e){
    e.preventDefault();
    var nama=$('fNama').value.trim(); if(!nama){ $('fNama').focus(); return; }
    var msg='Halo Panitia Outsourcing Awards 2026! 🕺\n\nNama: '+nama+'\nKehadiran: '+$('fHadir').value+'\nJumlah: '+$('fJml').value+' orang'+
      ($('fPesan').value.trim()?'\nUcapan: '+$('fPesan').value.trim():'')+'\n\nSee you at Night of 80’s! ✨';
    window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(msg),'_blank');
    toast('Terima kasih, '+nama+'! Sampai jumpa di lantai dansa 🪩');
  });
  var tt;
  function toast(m){ var el=$('toast'); el.textContent=m; el.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){el.classList.remove('on')},3500); }
})();
