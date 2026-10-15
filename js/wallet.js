// Кешбекер — Кошелёк: отрисовка карт, популярные запросы, перетаскивание, клики, подсказки поиска.
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

/* ---------- render ---------- */
const PHOTO_SHEEN="linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.12) 38%,rgba(0,0,0,.12) 62%,rgba(0,0,0,.6))";
// у карты с фото фон — само фото, поверх лёгкое затемнение, чтобы читались проценты
function cardVars(c){ return c.photo ? `--c-bg:url(${c.photo});--c-ink:#fff;--c-sheen:${PHOTO_SHEEN}`
  : c.custom ? `--c-bg:${c.custom.bg};--c-ink:${c.custom.ink};--c-sheen:radial-gradient(90% 120% at 110% -10%,rgba(255,255,255,.18),transparent 60%)`
  : styleVars(c.style); }
function styleVars(st){ const s=STYLES[st]||STYLES.graphite; return `--c-bg:${s.bg};--c-ink:${s.ink};--c-sheen:${s.sheen||"radial-gradient(90% 120% at 110% -10%,rgba(255,255,255,.18),transparent 60%)"}`; }
function topItems(card){ return [...(card.items||[])].sort((a,b)=>b.p-a.p); }

/* ---------- что ищут чаще всего ---------- */
// счётчики поисков хранятся в записи "_profile" (там же, где аватарка) и синхронизируются между устройствами
const HALF_LIFE_DAYS=30;
function searchStats(){ return (allCards.find(c=>c.id==="_profile")||{}).searchStats||{}; }
function searchScore(name){
  const st=searchStats()[norm(name)]; if(!st) return 0;
  const age=(Date.now()-(st.t||0))/864e5;
  return st.c*Math.pow(.5, age/HALF_LIFE_DAYS);
}
let statsSaveT=null, lastCounted="";
function recordSearch(name){
  const k=norm(name); if(!k || k===lastCounted) return; lastCounted=k;
  const prof={...(allCards.find(c=>c.id==="_profile")||{id:"_profile"}), id:"_profile"};
  const st={...(prof.searchStats||{})}; const cur=st[k]||{c:0};
  st[k]={c:cur.c+1, t:Date.now()};
  // не храним бесконечно: оставляем 60 самых популярных
  const keys=Object.keys(st); if(keys.length>60){ keys.sort((a,b)=>st[a].c-st[b].c).slice(0,keys.length-60).forEach(x=>delete st[x]); }
  prof.searchStats=st; putCard(prof);
  clearTimeout(statsSaveT); statsSaveT=setTimeout(()=>{ const d=allCards.find(c=>c.id==="_profile"); if(d) store?.save(d); },2000);
}
// засчитываем поиск, когда понятно, что нашлось: выбор кнопки/подсказки или пауза в наборе
let typeT=null;
function countCurrentSearch(){
  const rk=ranking(); const top=rk&&rk.list[0];
  if(top && !top.base && top.item) recordSearch(top.item.n);
}

function renderChips(){
  const m = new Map();
  for (const c of [...cards, looseDoc()]) for (const it of [...(c.items||[]),...(c.shops||[])]) { if(isBase(it.n) || it.p==null) continue; const k=norm(it.n); const cur=m.get(k); if(!cur||it.p>cur.p) m.set(k,{n:it.n,p:it.p}); }
  // сначала то, что ищешь чаще всего (свежие поиски весят больше), потом — по проценту
  const list=[...m.values()].map(x=>({...x,pop:searchScore(x.n)})).sort((a,b)=>b.pop-a.pop || b.p-a.p).slice(0,18);
  $("#chips").innerHTML = list.map(x=>`<button type="button" class="chip${norm(x.n)===norm(query)?" on":""}${x.pop>0?" hot":""}" data-q="${esc(x.n)}">${esc(x.n)} <b>${fmtP(x.p)}</b></button>`).join("");
  $("#chips").hidden = !list.length;
}

function renderAnswer(rk){
  const box=$("#answerBox");
  if(!rk){ box.innerHTML=""; return; }
  // карта самого магазина (Х5 Клуб и т.п.) — подсказываем показать её на кассе
  const ownShop=(looseDoc().shops||[]).find(sh=>matches(sh,[rk.terms[0]]) || (rk.merchant && norm(sh.n)===norm(rk.merchant.name)));
  let loyaltyNote="";
  if(ownShop){ const prog=ownShop.prog===undefined ? (loyaltyFor(ownShop.n)?.prog||"") : ownShop.prog;
    if(prog) loyaltyNote=`Покажи на кассе карту «${esc(prog)}»${ownShop.p!=null?` — ещё ${fmtP(ownShop.p)} бонусами`:""}.`;
    else if(ownShop.p!=null) loyaltyNote=`В самом магазине «${esc(ownShop.n)}» свой кешбек ${fmtP(ownShop.p)}.`; }
  // любимые категории/товары в магазинах этого месяца
  const favHits=[];
  for(const sh of looseDoc().shops||[]){ const f=sh.fav; if(!f || f.month!==nowMonth()) continue;
    for(const [arr,kind] of [[f.cats||[],"любимая категория"],[f.goods||[],"любимый товар"]]) for(const x of arr) if(matches(x,rk.terms) || norm(x.n).includes(norm(query))) favHits.push({shop:sh,x,kind}); }
  favHits.sort((a,b)=>(b.x.p??0)-(a.x.p??0));
  const favNote = favHits.slice(0,3).map(h=>`«${esc(h.shop.n)}»${h.shop.prog?` по карте «${esc(h.shop.prog)}»`:""}: ${esc(h.x.n)}${h.x.p!=null?` — ${fmtP(h.x.p)}`:""} (${h.kind})`).join("<br>");
  if(favNote) loyaltyNote = (loyaltyNote?loyaltyNote+"<br>":"") + favNote;
  if(!ownShop){ const li=loyaltyFor(query); if(li && li.prog && !favNote) loyaltyNote=`У «${esc(li.canon)}» есть своя карта «${esc(li.prog)}» — добавь её во вкладке «Магазины», чтобы не забывать.`; }
  const mer=rk.merchant;
  const merNote = mer ? `<p class="note" style="margin:8px 0 0">${mer.byCode ? `${esc(mer.name)} — это категория «${esc(mer.label)}».` : `«${esc(cap(mer.name))}» обычно проходит как «${esc(mer.label)}»${mer.mcc?` (код кассы MCC ${esc(mer.mcc)})`:""}. В отдельных точках код может отличаться.`}${rk.viaSimilar?` Такой категории на твоих картах нет — показываю похожую.`:""}</p>` : "";
  const extra = merNote + (loyaltyNote ? `<p class="note" style="margin:8px 0 0">${loyaltyNote}</p>` : "");
  const top=rk.list[0];
  if(!top){ box.innerHTML=""; return; }
  if(top.base){
    box.innerHTML = top.item
      ? `<button type="button" class="answer none" data-id="${top.card.id}"><span class="pct">${fmtP(top.p)}</span><span class="txt"><small>Нет такой категории</small><strong>${esc(top.card.bank)}</strong><span>лучший кешбек на «Всё остальное»</span></span></button>`
      : `<div class="answer none"><span class="pct">0%</span><span class="txt"><small>Ничего не нашлось</small><strong>«${esc(query)}» нет ни на одной карте</strong><span>Добавь категорию в карту, магазин во вкладке «Магазины» или проверь название</span></span></div>`;
    box.innerHTML += extra;
    return;
  }
  const second = rk.list[1] && !rk.list[1].base ? ` · следом ${esc(rk.list[1].card.bank)} ${fmtP(rk.list[1].p)}` : "";
  box.innerHTML = `<button type="button" class="answer" data-id="${top.card.id}"><span class="pct">${fmtP(top.p)}</span><span class="txt"><small>Плати этой картой</small><strong>${esc(top.card.bank)}</strong><span>${esc(top.item.n)}${top.item.shop?" · магазин":""}${second}</span></span></button>` + extra;
}

function cardHTML(c, rk, isBest){
  const r = rk && rk.list.find(x=>x.card.id===c.id);
  const items = topItems(c);
  const maxP = items.length ? items[0].p : 0;
  let right;
  if (r) right = r.item ? `<span class="lbl">${esc(r.base?"всё остальное":r.item.n)}</span><span class="big">${fmtP(r.p)}</span>` : `<span class="lbl">нет</span>`;
  else right = items.length ? `<span class="lbl">${items.filter(i=>!isBase(i.n)).length} кат.</span><span class="big">до ${fmtP(maxP)}</span>` : `<span class="tag">пусто</span>`;
  const shown = items.slice(0,6);
  const hitSet = r && r.item && !r.item.shop ? r.item : null;
  const stale = c.month && c.month!==nowMonth();
  return `<div class="strip"><span class="bank">${esc(c.bank||"Карта")}</span><span class="strip-r">${right}</span></div>
  <div class="face"><div class="emv" aria-hidden="true"></div>
    <ul class="grid">${shown.map(it=>`<li class="${it===hitSet?"hit":""}"><b>${fmtP(it.p)}</b><span>${esc(it.n)}</span></li>`).join("") || `<li><span>Нажми «Изменить», чтобы добавить кешбек</span></li>`}${items.length>6?`<li><span>ещё ${items.length-6}…</span></li>`:""}</ul>
    <div class="foot"><span class="foot-l">${c.next&&c.next.month===addMonth(nowMonth())?`<span class="ready">${esc(monthOnly(c.next.month))} готов</span>`:`<span class="ready no">${esc(monthOnly(addMonth(nowMonth())))} не выбран</span>`}${c.label?`<span>${esc(c.label)}</span>`:""}</span>${stale?`<span class="stale">за ${esc(monthName(c.month))}</span>`:`<span>${esc(monthName(c.month))}</span>`}</div>
  </div>`;
}

let lastOrder = [];
function render(){
  if(view==="shops") renderShops();
  const rk = ranking();
  renderChips(); renderAnswer(rk);
  const tn=allCards.filter(c=>c.deletedAt).length; $("#trashBtn").hidden=!tn; $("#trashCount").textContent=tn;
  $("#qClear").hidden = !query;
  const wallet=$("#wallet");
  if(!cards.length){
    wallet.style.height="auto";
    wallet.innerHTML=`<button type="button" class="card empty" id="emptyAdd">Добавь первую карту — банк, цвет и кешбек по категориям на месяц</button>`;
    $("#detail").innerHTML=""; return;
  }
  wallet.querySelector(".empty")?.remove();
  const ordered = rk ? rk.list.map(x=>x.card) : [...cards].sort((a,b)=>(a.order??0)-(b.order??0));
  // stack: best match goes to the front (last = fully visible)
  const stack = rk ? [...ordered].reverse() : ordered;
  const bestId = rk && rk.list[0] && !rk.list[0].base ? rk.list[0].card.id : null;
  const seen = new Set();
  for (const c of stack){
    seen.add(c.id);
    let el = wallet.querySelector(`[data-card="${c.id}"]`);
    if(!el){ el=document.createElement("div"); el.className="card"; el.dataset.card=c.id; el.tabIndex=0; el.setAttribute("role","button"); wallet.appendChild(el); el.style.transform=`translateY(${wallet.offsetHeight||0}px)`; }
    el.classList.toggle("photo", !!c.photo);
    el.setAttribute("style", cardVars(c) + (el.style.transform?`;transform:${el.style.transform}`:""));
    el.setAttribute("aria-label", `${c.bank}. ${selected===c.id?"Убрать обратно":"Достать карту"}`);
    el.innerHTML = cardHTML(c, rk, c.id===bestId);
    el.classList.toggle("best", c.id===bestId && !selected);
    const rr = rk && rk.list.find(x=>x.card.id===c.id);
    el.classList.toggle("dim", !!(rk && rr && rr.base && bestId));
  }
  wallet.querySelectorAll("[data-card]").forEach(el=>{ if(!seen.has(el.dataset.card)) el.remove(); });
  if (selected && !cards.some(c=>c.id===selected)) selected=null;
  layout(stack);
  renderDetail();
}

let currentStack=[];
function layout(stack=currentStack, animateId=null){
  currentStack=stack;
  const wallet=$("#wallet"); const W=wallet.clientWidth; if(!W) return;
  const H=W/1.586, peek=Math.round(Math.min(64,Math.max(48,W*.135))); lastPeek=peek;
  wallet.style.setProperty("--peek",peek+"px");
  const pos={};
  if(!selected){
    stack.forEach((c,i)=>pos[c.id]={y:i*peek,s:1,z:i+1});
    wallet.style.height=((stack.length-1)*peek+H)+"px";
  } else {
    const rest=stack.filter(c=>c.id!==selected);
    pos[selected]={y:0,s:1,z:200};
    const gap=22, step=Math.max(14,Math.min(26,W*.05));
    rest.forEach((c,j)=>pos[c.id]={y:H+gap+j*step, s:.94, z:j+1});
    wallet.style.height=(rest.length? H+gap+(rest.length-1)*step+peek*.9 : H)+"px";
  }
  wallet.style.clipPath = selected ? "inset(-400px -80px 0 -80px)" : "none";
  wallet.querySelectorAll("[data-card]").forEach(el=>{
    const p=pos[el.dataset.card]; if(!p) return;
    const to=`translateY(${p.y}px) scale(${p.s})`;
    if(animateId===el.dataset.card && !reduce){
      const from=getComputedStyle(el).transform;
      const lift=`translateY(${Math.max(-40, (parseFloat(from.split(",")[5])||0)-70)}px) translateX(8%) rotate(-3deg) scale(1.04)`;
      el.style.transition="none"; el.style.zIndex=p.z; el.style.transform=to;
      el.animate([{transform:from==="none"?"none":from},{transform:lift,offset:.42},{transform:to}],{duration:720,easing:"cubic-bezier(.2,.75,.2,1)"}).onfinish=()=>{el.style.transition="";};
    } else {
      el.style.zIndex=p.z; el.style.transform=to;
    }
  });
}

function renderDetail(){
  const box=$("#detail");
  const c=cards.find(x=>x.id===selected);
  if(!c){
    box.innerHTML=`<p class="hint">Нажми на карту, чтобы достать её. Зажми карту и перетащи, чтобы поменять порядок. Ищи категорию сверху — лучшая карта встанет вперёд.</p>`;
    return;
  }
  const items=topItems(c); const max=Math.max(10,...items.map(i=>i.p));
  const stale=c.month && c.month!==nowMonth();
  const upd=c.updatedAt? relTime(c.updatedAt):"";
  box.innerHTML=`<div class="panel">
    <div class="panel-h"><div><h2>${esc(c.bank)}</h2><p>${esc(monthName(c.month))}${upd?" · обновлено "+upd:""}</p></div>
      <div style="display:flex;gap:8px"><button class="btn" type="button" data-edit="${c.id}">Изменить</button><button class="btn ghost" type="button" data-close>Убрать</button></div></div>
    ${stale?`<p class="note" style="color:var(--warn)">Категории за ${esc(monthName(c.month))}. Начался новый месяц — обнови кешбек.</p>`:""}
    <ul class="rows">${rowsHTML(items,max)}</ul>
    ${c.next ? `<div class="nextbox"><h4><span>С 1 ${esc(genMonth(c.next.month))}</span><button class="btn" type="button" data-editnext="${c.id}">Изменить</button></h4><ul class="rows">${rowsHTML(topItems({items:c.next.items}),max)}</ul></div>`
      : `<div class="nextbox"><h4><span>${esc(cap(monthOnly(addMonth(nowMonth()))))} ещё не выбран</span><button class="btn" type="button" data-editnext="${c.id}">Выбрать</button></h4>${new Date().getDate()>=20?`<p class="note" style="margin:0">Конец месяца — самое время выбрать категории на ${esc(monthOnly(addMonth(nowMonth())))}. Они включатся сами 1-го числа.</p>`:""}</div>`}
  </div>`;
}
const cap = t => t ? t[0].toUpperCase()+t.slice(1) : t;
const GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const genMonth = m => { const [,mm]=String(m||"").split("-"); return mm ? GEN[+mm-1] : ""; };
function rowsHTML(items,max){ return items.map(it=>`<li class="row"><span class="n"><span>${esc(it.n)}</span></span><span class="p">${fmtP(it.p)}</span><span class="bar"><i style="width:${Math.min(100,it.p/max*100)}%"></i></span></li>`).join("") || `<li class="hint">Кешбек пока не добавлен</li>`; }
function relTime(ts){
  const d=new Date(ts), n=new Date(); const days=Math.floor((new Date(n.toDateString())-new Date(d.toDateString()))/864e5);
  if(days<=0) return "сегодня"; if(days===1) return "вчера"; return d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
}

/* ---------- перестановка карт: зажать и перетащить ---------- */
let lastPeek=56, suppressClick=false, drag=null;
const HOLD_MS=420, MOVE_TOL=8;
function canReorder(){ return !query && !selected && cards.length>1 && !editing; }
function dragLayout(){
  const {order,id,y}=drag;
  const n=order.length, target=Math.max(0,Math.min(n-1,Math.round(y/lastPeek)));
  const rest=order.filter(x=>x!==id); rest.splice(target,0,id); drag.target=rest;
  rest.forEach((cid,i)=>{
    const el=document.querySelector(`#wallet [data-card="${cid}"]`); if(!el) return;
    if(cid===id){ el.style.zIndex=999; el.style.transform=`translateY(${y}px) scale(1.03)`; }
    else { el.style.zIndex=i+1; el.style.transform=`translateY(${i*lastPeek}px)`; }
  });
}
$("#wallet").addEventListener("pointerdown",e=>{
  const el=e.target.closest("#wallet [data-card]"); if(!el || !canReorder() || (e.pointerType==="mouse" && e.button!==0)) return;
  const start={x:e.clientX,y:e.clientY};
  const order=currentStack.map(c=>c.id);
  const idx=order.indexOf(el.dataset.card); if(idx<0) return;
  const pending={el,start,pid:e.pointerId,timer:null};
  const cancel=()=>{ clearTimeout(pending.timer); window.removeEventListener("pointermove",pre); window.removeEventListener("pointerup",cancel); window.removeEventListener("pointercancel",cancel); };
  const isMouse=e.pointerType==="mouse";
  if(isMouse) e.preventDefault();   // мышью: не начинаем выделение текста
  const pre=ev=>{ if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>MOVE_TOL){ cancel(); if(isMouse) beginDrag(); } };
  window.addEventListener("pointermove",pre); window.addEventListener("pointerup",cancel); window.addEventListener("pointercancel",cancel);
  const beginDrag=()=>{
    try{ navigator.vibrate?.(12); }catch{}
    drag={id:el.dataset.card, order, y:idx*lastPeek, offset:start.y-idx*lastPeek, el};
    el.classList.add("dragging"); document.body.classList.add("reordering");
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    try{ el.setPointerCapture(e.pointerId); }catch{}
    dragLayout();
    const move=ev=>{ if(!drag) return; ev.preventDefault();
      const max=(order.length-1)*lastPeek;
      drag.y=Math.max(-lastPeek*.5, Math.min(max+lastPeek*.5, ev.clientY-drag.offset)); dragLayout(); };
    const end=()=>{ window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",end); window.removeEventListener("pointercancel",end);
      finishDrag(); };
    window.addEventListener("pointermove",move,{passive:false}); window.addEventListener("pointerup",end); window.addEventListener("pointercancel",end);
  };
  pending.timer=setTimeout(()=>{ cancel(); beginDrag(); },HOLD_MS);
});
// пока карта «в руке», страница не прокручивается
$("#wallet").addEventListener("touchmove",e=>{ if(drag) e.preventDefault(); },{passive:false});
$("#wallet").addEventListener("selectstart",e=>e.preventDefault());
$("#wallet").addEventListener("contextmenu",e=>{ if(e.target.closest("[data-card]")) e.preventDefault(); });
// пока новый порядок сохраняется по одной карте, база может прислать промежуточное состояние —
// держим новый порядок, пока база не подтвердит его целиком
let orderOverride=null, overrideTimer=null;
function applyOrderOverride(list){
  if(!orderOverride) return list;
  let allMatch=true;
  const out=list.map(c=>{ if(c.id in orderOverride){ if(c.order!==orderOverride[c.id]) allMatch=false; return {...c,order:orderOverride[c.id]}; } return c; });
  if(allMatch){ orderOverride=null; clearTimeout(overrideTimer); }
  return out;
}
async function finishDrag(){
  if(!drag) return;
  const {el,target,order}=drag; drag=null; suppressClick=true; setTimeout(()=>suppressClick=false,400);
  el.classList.remove("dragging"); document.body.classList.remove("reordering");
  const newOrder=target||order;
  const changed=[];
  newOrder.forEach((id,i)=>{ const c=cards.find(x=>x.id===id); if(c && c.order!==i){ const u={...c,order:i,updatedAt:c.updatedAt}; changed.push(u); } });
  if(changed.length){
    orderOverride={...(orderOverride||{})}; changed.forEach(u=>orderOverride[u.id]=u.order);
    clearTimeout(overrideTimer); overrideTimer=setTimeout(()=>{ orderOverride=null; },20000);
  }
  changed.forEach(putCard);
  render();
  for(const u of changed) await store?.save(u);
}

// Safari на айфоне игнорирует запрет масштабирования в meta — гасим жест щипка вручную
["gesturestart","gesturechange","gestureend"].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
document.addEventListener("touchmove",e=>{ if(e.touches&&e.touches.length>1) e.preventDefault(); },{passive:false});

/* ---------- interactions ---------- */
function toggleCard(id){
  const prev=selected;
  selected = selected===id ? null : id;
  document.querySelectorAll("[data-card]").forEach(el=>el.classList.toggle("best", false));
  layout(currentStack, selected?id:null);
  if(!selected && prev) render(); else renderDetail();
  if(selected) $("#wallet").scrollIntoView({behavior:reduce?"auto":"smooth",block:"nearest"});
}
$("#wallet").addEventListener("click",e=>{
  if(suppressClick){ suppressClick=false; return; }
  if(e.target.closest("#emptyAdd")) return openEditor(null);
  const el=e.target.closest("[data-card]"); if(el) toggleCard(el.dataset.card);
});
$("#wallet").addEventListener("keydown",e=>{ const el=e.target.closest("[data-card]"); if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();toggleCard(el.dataset.card);} });
$("#detail").addEventListener("click",e=>{
  const ed=e.target.closest("[data-edit]"); if(ed) return openEditor(cards.find(c=>c.id===ed.dataset.edit));
  const en=e.target.closest("[data-editnext]"); if(en) return openEditor(cards.find(c=>c.id===en.dataset.editnext),"next");
  if(e.target.closest("[data-close]")) toggleCard(selected);
});
$("#answerBox").addEventListener("click",e=>{ const a=e.target.closest("[data-id]"); if(a && selected!==a.dataset.id) toggleCard(a.dataset.id); });
$("#chips").addEventListener("click",e=>{ const b=e.target.closest("[data-q]"); if(!b) return; query = norm(query)===norm(b.dataset.q) ? "" : b.dataset.q; $("#q").value=query; selected=null;
  if(query){ lastCounted=""; recordSearch(b.dataset.q); } render(); });
$("#q").addEventListener("input",e=>{ query=e.target.value; selected=null; if(!query.trim()) lastCounted=""; render(); drawSuggest();
  clearTimeout(typeT); if(query.trim().length>=3) typeT=setTimeout(countCurrentSearch,1800); });
/* ---------- подсказки в поиске ---------- */
let sugItems=[], sugIdx=-1;
function suggestions(q){
  const nq=norm(q); if(!nq) return [];
  const m=new Map();
  const add=(n,p,bank,kind)=>{ const k=norm(n); const cur=m.get(k);
    if(!cur) m.set(k,{n,p,bank,kind}); else if(p!=null && (cur.p==null || p>cur.p)) m.set(k,{n,p,bank,kind:cur.kind==="shop"?"shop":kind}); };
  for(const c of cards){ for(const it of c.items||[]) if(!isBase(it.n)) add(it.n,it.p,c.bank,"cat"); for(const sh of c.shops||[]) add(sh.n,sh.p,c.bank,"shop"); }
  for(const sh of looseDoc().shops||[]) add(sh.n,sh.p,sh.prog||"карта магазина","shop");
  // только то, что сам пользователь вписал в карты и магазины
  const terms=expand(q);
  const out=[];
  const own=new Set([...m.keys()]);
  for(const x of m.values()){ const n=norm(x.n);
    let score = n.startsWith(nq)?3 : n.split(/[\s-]+/).some(w=>w.startsWith(nq))?2.5 : (nq.length>=2 && n.includes(nq))?2 : (nq.length>=3 && x.p!=null && matches(x,terms))?1 : 0;
    if(!score) continue; out.push({...x,score}); }
  out.sort((a,b)=> b.score-a.score || ((b.p??-1)-(a.p??-1)) || a.n.localeCompare(b.n,"ru"));
  // сети магазинов: «Ростикс → Фастфуд», если такая категория есть на твоих картах
  const mer=merchantSuggestions(q).filter(x=>!own.has(norm(x.n)));
  return [...out.slice(0,7-Math.min(3,mer.length)), ...mer.slice(0,3)];
}
function hl(name,q){ const i=norm(name).indexOf(norm(q)); if(i<0||!q) return esc(name); return esc(name.slice(0,i))+"<mark>"+esc(name.slice(i,i+q.length))+"</mark>"+esc(name.slice(i+q.length)); }
function drawSuggest(){
  const q=$("#q").value.trim(), box=$("#suggest");
  sugItems = document.activeElement===$("#q") ? suggestions(q) : [];
  // если уже введено точно название — подсказка не нужна
  if(sugItems.length===1 && norm(sugItems[0].n)===norm(q)) sugItems=[];
  sugIdx=-1;
  box.hidden=!sugItems.length; $("#q").setAttribute("aria-expanded",String(!!sugItems.length));
  box.innerHTML=sugItems.map((x,i)=>`<li role="option"><button type="button" data-s="${i}"><span class="s-n">${hl(x.n,q)}${x.kind==="shop"?"<small>магазин</small>":x.kind==="merchant"?`<small>→ ${esc(x.cat)}</small>`:""}</span><span class="s-r">${x.p!=null?`${esc(x.bank)} <b>${fmtP(x.p)}</b>`:x.bank?esc(x.bank):"нет на картах"}</span></button></li>`).join("");
}
function pickSuggest(i){ const x=sugItems[i]; if(!x) return; query=x.n; clearTimeout(typeT); lastCounted=""; recordSearch(x.n); $("#q").value=x.n; selected=null; $("#suggest").hidden=true; $("#q").setAttribute("aria-expanded","false"); render(); $("#q").blur(); }
$("#suggest").addEventListener("pointerdown",e=>e.preventDefault());   // не теряем фокус до выбора
$("#suggest").addEventListener("click",e=>{ const b=e.target.closest("[data-s]"); if(b) pickSuggest(+b.dataset.s); });
$("#q").addEventListener("focus",drawSuggest);
$("#q").addEventListener("blur",()=>setTimeout(()=>{ $("#suggest").hidden=true; $("#q").setAttribute("aria-expanded","false"); },120));
$("#q").addEventListener("keydown",e=>{
  if($("#suggest").hidden) return;
  const btns=[...$("#suggest").querySelectorAll("button")];
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); sugIdx=(sugIdx+(e.key==="ArrowDown"?1:-1)+btns.length)%btns.length; btns.forEach((b,i)=>b.classList.toggle("on",i===sugIdx)); btns[sugIdx]?.scrollIntoView({block:"nearest"}); }
  else if(e.key==="Enter"){ e.preventDefault(); pickSuggest(sugIdx>=0?sugIdx:0); }
  else if(e.key==="Escape"){ $("#suggest").hidden=true; }
});
$("#qClear").addEventListener("click",()=>{ query=""; $("#q").value=""; selected=null; render(); $("#q").focus(); drawSuggest(); });
$("#addBtn").addEventListener("click",()=>{ if(view==="shops") openShop("",true); else openEditor(null); });
new ResizeObserver(()=>layout()).observe($("#wallet"));
