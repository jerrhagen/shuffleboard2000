(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`shuffleboard2000`,t=`players`,n=null;function r(){return n??=new Promise((n,r)=>{let i=indexedDB.open(e,1);i.onupgradeneeded=()=>i.result.createObjectStore(t,{keyPath:`id`}),i.onsuccess=()=>n(i.result),i.onerror=()=>r(i.error)}),n}async function i(e,n){let i=await r();return new Promise((r,a)=>{let o=n(i.transaction(t,e).objectStore(t));o.onsuccess=()=>r(o.result),o.onerror=()=>a(o.error)})}async function a(){return(await i(`readonly`,e=>e.getAll())).sort((e,t)=>e.createdAt-t.createdAt)}function o(e){return i(`readwrite`,t=>t.put(e))}function s(e){return i(`readwrite`,t=>t.delete(e))}function c(e,t){try{return localStorage.getItem(`sb2000.${e}`)??t}catch{return t}}function l(e,t){try{localStorage.setItem(`sb2000.${e}`,t)}catch{}}var u=null,d=c(`muted`,`0`)===`1`;function f(){return d}function p(e){d=e,l(`muted`,e?`1`:`0`)}function m(){u??=new AudioContext,u.state===`suspended`&&u.resume()}function h(){return!d&&u&&u.state===`running`?u:null}function g(e,t,n,r,i,a=0){let o=h();if(!o)return;let s=o.currentTime+a,c=o.createOscillator(),l=o.createGain();c.type=e,c.frequency.setValueAtTime(t,s),c.frequency.exponentialRampToValueAtTime(Math.max(1,n),s+r),l.gain.setValueAtTime(i,s),l.gain.exponentialRampToValueAtTime(1e-4,s+r),c.connect(l).connect(o.destination),c.start(s),c.stop(s+r+.02)}function _(e,t,n,r){let i=h();if(!i)return;let a=i.currentTime,o=i.createBuffer(1,Math.ceil(i.sampleRate*e),i.sampleRate),s=o.getChannelData(0);for(let e=0;e<s.length;e++)s[e]=Math.random()*2-1;let c=i.createBufferSource();c.buffer=o;let l=i.createBiquadFilter();l.type=`bandpass`,l.Q.value=1.1,l.frequency.setValueAtTime(n,a),l.frequency.exponentialRampToValueAtTime(r,a+e);let u=i.createGain();u.gain.setValueAtTime(1e-4,a),u.gain.exponentialRampToValueAtTime(t,a+e*.25),u.gain.exponentialRampToValueAtTime(1e-4,a+e),c.connect(l).connect(u).connect(i.destination),c.start(a)}var v={tap:()=>g(`square`,660,880,.06,.04),clack:e=>{let t=Math.min(1,e/20);g(`triangle`,1900+Math.random()*500,700,.05,.05+.12*t),_(.03,.05*t,3200,1800)},whoosh:()=>_(.45,.14,500,3400),riser:e=>{g(`sawtooth`,60,880,e,.07),g(`sawtooth`,62,900,e,.05),_(e,.1,300,6e3)},slam:e=>{g(`sine`,150,38,.3,.42),g(`square`,e===`red`?330:494,e===`red`?165:247,.16,.07),_(.12,.14,2400,500)},fanfare:()=>{[392,523,659,784,1047].forEach((e,t)=>{g(`sawtooth`,e,e*1.001,.34,.06,t*.09),g(`square`,e*2,e*2.001,.2,.025,t*.09)})},shutter:()=>{_(.05,.2,5e3,2200),g(`square`,1500,900,.04,.04,.07)}};function y(e){d||navigator.vibrate?.(e)}var b=512;function x(){return!!navigator.mediaDevices?.getUserMedia}var S=class{video;stream=null;facing=`user`;constructor(e){this.video=e}async start(e=this.facing){this.stop(),this.facing=e,this.stream=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:{ideal:e},width:{ideal:1280},height:{ideal:1280}}}),this.video.srcObject=this.stream,this.video.classList.toggle(`mirrored`,e===`user`),await this.video.play()}flip(){return this.start(this.facing===`user`?`environment`:`user`)}capture(){let{videoWidth:e,videoHeight:t}=this.video;return C(this.video,e,t,this.facing===`user`)}stop(){this.stream?.getTracks().forEach(e=>e.stop()),this.stream=null,this.video.srcObject=null}};function C(e,t,n,r){let i=document.createElement(`canvas`);i.width=i.height=b;let a=i.getContext(`2d`),o=Math.min(t,n);return r&&(a.translate(b,0),a.scale(-1,1)),a.drawImage(e,(t-o)/2,(n-o)/2,o,o,0,0,b,b),i.toDataURL(`image/jpeg`,.86)}async function w(e){let t=await createImageBitmap(e),n=C(t,t.width,t.height,!1);return t.close(),n}var T=[`Röda Raketerna`,`Röda Rävarna`,`Röda Faran`,`Glödgänget`,`Lavaligan`,`Röda Rebellerna`,`Hetluften`,`Eldsjälarna`],E=[`Blå Blixtarna`,`Blå Bävrarna`,`Blåsbaggarna`,`Iskalla Gänget`,`Djuphavsligan`,`Blå Banditerna`,`Kylskåpet`,`Frostfolket`];function D(e){return Math.max(1,Math.floor(e/2))}function O(e,t=Math.random){let n=[...e];for(let e=n.length-1;e>0;e--){let r=Math.floor(t()*(e+1));[n[e],n[r]]=[n[r],n[e]]}return n}function k(e,t){let n=Math.floor(e/t),r=e%t;return Array.from({length:t},(e,t)=>n+ +(t<r))}function A(e,t){return k(e,t).map(e=>`${Math.ceil(e/2)} mot ${Math.floor(e/2)}`)}function j(e,t,n=Math.random){if(e.length<2)throw Error(`Det behövs minst två spelare`);let r=Math.min(Math.max(1,t),D(e.length)),i=O(e,n),a=O(T,n),o=O(E,n),s=0;return k(i.length,r).map((e,t)=>{let r=i.slice(s,s+e);s+=e;let c=e%2==0||n()<.5?Math.ceil(e/2):Math.floor(e/2);return{index:t,red:r.slice(0,c),blue:r.slice(c),redName:a[t%a.length],blueName:o[t%o.length]}})}var M=`modulepreload`,N=function(e){return`/shuffleboard2000/`+e},P={},F=function(e){return e.pathname.endsWith(`.css`)},I=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},L=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=N(t,n);let r=s(t),i=F(r);return I(P,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:M,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{let i=a=>{t.removeEventListener(`load`,i),t.removeEventListener(`error`,i),a.type===`error`?n(Error(`Unable to preload CSS for ${r}`)):e(a)};t.addEventListener(`load`,i),t.addEventListener(`error`,i)})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},R=document.querySelector(`#app`),z=document.querySelector(`#stage`),B=[],V=Math.max(1,Number(c(`tables`,`1`))||1),H=!1,U=null,ee=matchMedia(`(prefers-reduced-motion: reduce)`).matches,W=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]),G=()=>B.filter(e=>e.active),K=()=>Math.min(V,D(G().length));function q(e,t=``){return`<span class="puck ${t}">${e.photo?`<img src="${e.photo}" alt="" draggable="false" />`:`<span class="initial">${W(e.name.trim().charAt(0).toUpperCase()||`?`)}</span>`}</span>`}function te(){return`<h1 class="logo" aria-label="Shuffleboard 2000">
    <span class="logo-word" aria-hidden="true">SHUFFLEBOARD</span>
    <span class="logo-year" aria-hidden="true">2000</span>
  </h1>`}function J(){return f()?`<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`:`<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}function Y(){R.innerHTML=`
    <main class="home">
      <header class="top">
        ${te()}
        <button class="icon-button" data-action="sound" aria-label="${f()?`Slå på ljudet`:`Stäng av ljudet`}">${J()}</button>
      </header>
      <section class="panel roster">
        <div class="panel-head">
          <h2>Spelare <span id="count"></span></h2>
          <button class="text-button" data-action="edit" ${B.length?``:`hidden`}>${H?`Klar`:`Ändra`}</button>
        </div>
        <p class="hint" id="hint"></p>
        <ul class="grid" id="grid">
          <li><button class="add" data-action="add"><span class="puck add-puck">+</span><span class="name">Ny spelare</span></button></li>
          ${B.map((e,t)=>ne(e,t)).join(``)}
        </ul>
      </section>
      <footer class="panel controls">
        <div class="stepper" role="group" aria-label="Antal bord">
          <button data-action="less" aria-label="Färre bord">−</button>
          <div class="stepper-value"><strong id="tables"></strong><span id="tables-label"></span></div>
          <button data-action="more" aria-label="Fler bord">+</button>
        </div>
        <p class="summary" id="summary"></p>
        <button class="primary" data-action="draw" id="draw"><span>Slumpa lag</span></button>
      </footer>
    </main>`,X()}function ne(e,t){return`<li style="--i:${t}">
    <button class="player ${e.active?``:`out`}" data-action="player" data-id="${e.id}" aria-pressed="${e.active}">
      ${q(e,H?`wiggle`:``)}
      <span class="name">${W(e.name)}</span>
    </button>
  </li>`}function X(){let e=G().length,t=K(),n=(e,t)=>{let n=document.getElementById(e);n&&(n.textContent=t)};n(`count`,B.length?`${e} av ${B.length} med`:``),n(`hint`,H?`Tryck på en spelare för att ändra namn eller foto.`:B.length?`Tryck på en spelare för att sätta hen på bänken.`:`Börja med att fota minst två spelare.`),n(`tables`,String(t)),n(`tables-label`,`bord`);let r=e>=2?A(e,t):[],i=[...new Set(r)];n(`summary`,e<2?`Det behövs minst två spelare`:i.join(` och `)+(t>1&&i.length===1?` på varje bord`:``));let a=document.getElementById(`draw`);a&&(a.disabled=e<2);let o=R.querySelector(`[data-action="less"]`),s=R.querySelector(`[data-action="more"]`);o&&(o.disabled=t<=1),s&&(s.disabled=t>=D(e))}function Z(e){let t=document.createElement(`div`);t.className=`sheet`,t.setAttribute(`role`,`dialog`),t.setAttribute(`aria-modal`,`true`),t.setAttribute(`aria-label`,e?`Ändra spelare`:`Ny spelare`),t.innerHTML=`
    <div class="sheet-body">
      <div class="sheet-head">
        <h2>${e?`Ändra spelare`:`Ny spelare`}</h2>
        <button class="icon-button" data-sheet="close" aria-label="Stäng">✕</button>
      </div>
      <div class="lens">
        <span class="lens-ring"></span>
        <span class="lens-ring two"></span>
        <div class="lens-view">
          <video playsinline muted></video>
          <img class="still" alt="" hidden />
          <div class="lens-empty" hidden>Ingen bild än</div>
          <span class="scan"></span>
        </div>
        <span class="flash"></span>
      </div>
      <p class="sheet-status" role="status"></p>
      <div class="cam-buttons">
        <button class="ghost" data-sheet="flip" hidden>Vänd kameran</button>
        <button class="shutter" data-sheet="shoot" aria-label="Ta foto" hidden></button>
        <button class="ghost" data-sheet="retake" hidden>Ta nytt foto</button>
        <label class="ghost file-pick" hidden>Öppna kameran<input type="file" accept="image/*" capture="user" hidden /></label>
      </div>
      <label class="field">
        <span>Namn</span>
        <input type="text" maxlength="20" autocomplete="off" enterkeyhint="done" value="${e?W(e.name):``}" />
      </label>
      <div class="sheet-actions">
        <button class="primary small" data-sheet="save"><span>Spara</span></button>
        ${e?`<button class="ghost danger" data-sheet="delete">Ta bort</button>`:`<button class="ghost" data-sheet="save-next">Spara och nästa</button>`}
      </div>
    </div>`,document.body.append(t);let n=e=>t.querySelector(e),r=n(`video`),i=n(`.still`),a=n(`.lens-empty`),c=n(`.sheet-status`),l=n(`[data-sheet="flip"]`),u=n(`[data-sheet="shoot"]`),d=n(`[data-sheet="retake"]`),f=n(`.file-pick`),p=n(`input[type="file"]`),h=n(`input[type="text"]`),g=new S(r),_=e?.photo??null,b=!1;U?.setPaused(!0);let C=e=>{i.hidden=!e,r.hidden=!!e,a.hidden=!!e,e&&(i.src=e),l.hidden=u.hidden=!0,d.hidden=!e||!x(),f.hidden=x()&&!T},T=!1,E=async()=>{if(!x())return D(`Telefonens kamera öppnas i ett eget fönster.`);i.hidden=!0,a.hidden=!0,r.hidden=!1,d.hidden=!0,c.textContent=`Startar kameran …`;try{await g.start(),c.textContent=``,l.hidden=u.hidden=!1}catch{D(`Kameran gick inte att starta här. Tillåt kameran i webbläsaren, eller öppna den nedan.`)}},D=e=>{T=!0,c.textContent=e,C(_),f.hidden=!1},O=()=>{g.stop(),t.remove(),U?.setPaused(!1)},k=async t=>{let n=h.value.trim();if(!n){c.textContent=`Spelaren behöver ett namn.`,h.focus();return}let r=e?{...e,name:n,photo:_}:{id:crypto.randomUUID(),name:n,photo:_,active:!0,createdAt:Date.now()};try{await o(r)}catch{c.textContent=`Det gick inte att spara på den här telefonen.`;return}let i=B.findIndex(e=>e.id===r.id);i>=0?B[i]=r:B.push(r),v.tap(),O(),Y(),t&&Z(null)};t.addEventListener(`click`,async t=>{let r=t.target.closest(`[data-sheet]`);if(r)switch(m(),r.dataset.sheet){case`close`:O();break;case`flip`:c.textContent=``;try{await g.flip()}catch{c.textContent=`Den andra kameran gick inte att starta.`}break;case`shoot`:_=g.capture(),v.shutter(),y(25),n(`.lens`).classList.remove(`snap`),n(`.lens`).offsetWidth,n(`.lens`).classList.add(`snap`),g.stop(),C(_),h.value||h.focus();break;case`retake`:_=null,await E();break;case`save`:await k(!1);break;case`save-next`:await k(!0);break;case`delete`:if(!b){b=!0,r.textContent=`Tryck igen för att ta bort`;break}await s(e.id),B=B.filter(t=>t.id!==e.id),B.length||(H=!1),O(),Y()}}),p.addEventListener(`change`,async()=>{let e=p.files?.[0];if(e)try{_=await w(e),c.textContent=``,C(_)}catch{c.textContent=`Bilden gick inte att läsa.`}}),_?C(_):E()}var re=1400;function ie(){let e=document.createElement(`div`);return e.className=`show`,e.innerHTML=`
    <div class="show-flash"></div>
    <div class="show-top"></div>
    <div class="show-name"></div>
    <button class="ghost show-skip">Hoppa över</button>`,document.body.append(e),e}async function ae(){let e=j(G(),K());if(y(20),!U||ee){$(e);return}R.innerHTML=``;let t=ie(),n=t.querySelector(`.show-top`),r=t.querySelector(`.show-name`),i=t.querySelector(`.show-flash`);t.querySelector(`.show-skip`).addEventListener(`click`,()=>U?.skip());let a=0;await U.play(e,e=>{switch(e.type){case`launch`:n.innerHTML=`<p class="show-title">Puckarna släpps</p>`;break;case`vortex`:n.innerHTML=`<p class="show-title hot">Lagen blandas</p>`;break;case`flash`:i.classList.remove(`go`),i.offsetWidth,i.classList.add(`go`);break;case`table`:n.innerHTML=`
          <p class="show-table">Bord ${e.index+1}</p>
          <p class="show-vs"><span class="red">${W(e.redName)}</span><em>mot</em><span class="blue">${W(e.blueName)}</span></p>`;break;case`player`:r.className=`show-name ${e.team}`,r.textContent=e.name,r.offsetWidth,r.classList.add(`in`),clearTimeout(a),a=window.setTimeout(()=>r.classList.remove(`in`),re);break;case`tableDone`:r.classList.remove(`in`)}}),clearTimeout(a),t.remove(),$(e)}function Q(e,t,n,r){return`<div class="team ${e}">
    <h3>${W(t)}</h3>
    <ul>
      ${n.map((e,t)=>`<li style="--d:${r+t*90}ms">
            ${q(e)}
            <span>${W(e.name)}</span>
          </li>`).join(``)}
    </ul>
  </div>`}function $(e){R.innerHTML=`
    <main class="result">
      <header class="result-head">
        <h2>Lagen är klara</h2>
        <button class="icon-button" data-action="sound" aria-label="${f()?`Slå på ljudet`:`Stäng av ljudet`}">${J()}</button>
      </header>
      <div class="tables">
        ${e.map(e=>`<article class="card" style="--c:${e.index*180}ms">
              <h3 class="card-title">Bord ${e.index+1}</h3>
              <div class="match">
                ${Q(`red`,e.redName,e.red,200+e.index*180)}
                <span class="vs">VS</span>
                ${Q(`blue`,e.blueName,e.blue,320+e.index*180)}
              </div>
            </article>`).join(``)}
      </div>
      <footer class="result-actions">
        <button class="primary" data-action="draw"><span>Slumpa igen</span></button>
        <button class="ghost" data-action="home">Ändra spelare</button>
      </footer>
    </main>`}R.addEventListener(`click`,async e=>{let t=e.target.closest(`[data-action]`);if(t)switch(m(),t.dataset.action){case`sound`:p(!f()),t.innerHTML=J(),t.setAttribute(`aria-label`,f()?`Slå på ljudet`:`Stäng av ljudet`);break;case`edit`:H=!H,Y();break;case`add`:v.tap(),Z(null);break;case`player`:{let e=B.find(e=>e.id===t.dataset.id);if(!e)break;if(v.tap(),H){Z(e);break}e.active=!e.active,t.classList.toggle(`out`,!e.active),t.setAttribute(`aria-pressed`,String(e.active)),X(),o(e);break}case`less`:case`more`:V=K()+(t.dataset.action===`more`?1:-1),l(`tables`,String(V)),v.tap(),X();break;case`draw`:await ae();break;case`home`:Y()}});async function oe(){try{B=await a()}catch{B=[]}Y(),navigator.storage?.persist?.();try{let{Stage:e}=await L(async()=>{let{Stage:e}=await import(`./stage-DkitcvrG.js`);return{Stage:e}},[]);U=await e.create(z),z.classList.add(`on`)}catch(e){console.warn(`3D-scenen gick inte att starta`,e)}`serviceWorker`in navigator&&navigator.serviceWorker.register(`/shuffleboard2000/sw.js`)}oe();export{v as n,y as t};