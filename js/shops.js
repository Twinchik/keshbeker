// Кешбекер — Вкладка «Магазины» и карты лояльности.
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

/* ---------- магазины ---------- */
let view="cards";
function setView(v){
  view=v;
  $("#viewTabs").querySelectorAll("button").forEach(b=>b.setAttribute("aria-selected",b.dataset.view===v));
  $("#cardsView").style.display = v==="cards" ? "contents" : "none";
  $("#shopsView").hidden = v!=="shops";
  $("#addBtn").innerHTML = v==="cards" ? '<span aria-hidden="true">+</span> Карта' : '<span aria-hidden="true">+</span> Магазин';
  if(v==="shops") renderShops(); else render();
}
$("#viewTabs").addEventListener("click",e=>{ const b=e.target.closest("[data-view]"); if(!b) return;
  // перезапускаем анимацию иконки даже при повторном нажатии
  b.classList.remove("anim"); void b.offsetWidth; b.classList.add("anim");
  b.addEventListener("animationend",()=>b.classList.remove("anim"),{once:true});
  if(b.dataset.view===(wantView||view)) return;
  switchView(b.dataset.view);
});
// Плавная смена раздела («fade through»): поверх экрана (под нижним меню) плавно проявляется «шторка» цвета фона —
// экран затемняется (~0.17 с), под ней меняется раздел, ~0.08 с держится пустой фон, затем шторка растворяется (~0.26 с).
// Анимируется один простой слой, а не сами разделы: так одинаково плавно в обе стороны и в Safari на айфоне
// (раньше при переходе «Магазины → Карты» айфон пропускал затемнение и сразу показывал тёмный экран).
let viewSwitch = 0, wantView = null, curtainAnim = null;
const scrollMem = {};
// на телефоне прокручивается не окно, а body (см. style.css, pointer:coarse)
const scroller = () => matchMedia("(pointer:coarse)").matches ? document.body : document.scrollingElement;
const curtain = Object.assign(document.createElement("div"), { className: "curtain" });
curtain.setAttribute("aria-hidden", "true"); document.body.appendChild(curtain);
function switchView(v){
  const my = ++viewSwitch; wantView = v;
  $("#viewTabs").querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x.dataset.view===v));
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ wantView = null; const sc = scroller(); scrollMem[view] = sc.scrollTop; setView(v); sc.scrollTop = scrollMem[v] || 0; return; }
  const from = curtainAnim ? +getComputedStyle(curtain).opacity : 0;
  if(curtainAnim) curtainAnim.cancel();
  const a = curtainAnim = curtain.animate([{ opacity: from }, { opacity: 1 }], { duration: 170 * (1 - from), easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
  a.finished.then(() => {
    if(my !== viewSwitch) return;
    wantView = null;
    // у каждого раздела своя прокрутка (как вкладки в iOS): запоминаем, где был старый, новый открываем там,
    // где его оставили (в первый раз — сверху). Инерцию прокрутки гасим, иначе айфон докручивает новый раздел
    const sc = scroller(); scrollMem[view] = sc.scrollTop;
    setView(v);
    sc.style.overflowY = "hidden"; sc.scrollTop = scrollMem[v] || 0;
    requestAnimationFrame(() => { sc.style.overflowY = ""; sc.scrollTop = scrollMem[v] || 0; });
    const b = curtainAnim = curtain.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 80, easing: "cubic-bezier(0,0,.2,1)", fill: "both" });
    a.cancel();
    b.finished.then(() => { if(curtainAnim === b){ b.cancel(); curtainAnim = null; } }).catch(() => {});
  }).catch(() => {});
}
// Карты лояльности магазинов: у сети своя карта, банковские тут не участвуют.
// "" — у сети нет своей карты. Название можно поправить вручную при добавлении.
const LOYALTY={
  "пятёрочка":"Х5 Клуб","перекрёсток":"Х5 Клуб","магнит":"Магнит Плюс","лента":"Карта Лента","о'кей":"Карта О'КЕЙ","вкусвилл":"Карта ВкусВилл",
  "ашан":"Карта Ашан","дикси":"Карта Дикси","spar":"Карта SPAR","монетка":"Карта Монетки","азбука вкуса":"Карта Азбуки вкуса","глобус":"Карта Глобус",
  "metro cash & carry":"Карта METRO","верный":"Карта Верный","мария-ра":"Карта Мария-Ра","ярче":"Карта Ярче","бахетле":"Карта Бахетле",
  "красное&белое":"Карта Красное&Белое","бристоль":"Карта Бристоль","винлаб":"Карта ВинЛаб",
  "чижик":"","светофор":"","самокат":"","яндекс лавка":"","купер":"",
  "золотое яблоко":"Лаймовый клуб","л'этуаль":"Карта Л'Этуаль","рив гош":"Карта Рив Гош","подружка":"Карта Подружка","улыбка радуги":"Карта Улыбка радуги","ив роше":"Карта Ив Роше",
  "м.видео":"M.Club","эльдорадо":"M.Club","dns":"Бонусы DNS","ситилинк":"Ситилинк Бонусы","технопарк":"Карта Технопарк",
  "спортмастер":"Бонусы Спортмастер","декатлон":"Карта Desport","детский мир":"Бонусы Детского мира","гулливер":"Карта Гулливер",
  "лукойл":"Заправляемся","роснефть":"Семейная команда","газпромнефть":"Нам по пути","татнефть":"Карта Татнефть","shell":"Карта Shell",
  "додо пицца":"Додокоины","шоколадница":"Карта Шоколадницы","теремок":"Карта Теремок",
  "fix price":"Карта Fix Price","галамарт":"Карта Галамарт","леруа мерлен":"Карта Лемана ПРО","петрович":"Клубная карта Петрович","hoff":"Hoff бонусы","максидом":"Карта Максидом",
  "gloria jeans":"Карта Gloria Jeans","o'stin":"Карта O'stin","befree":"Карта Befree","твоё":"Карта Твоё","familia":"Карта Familia","снежная королева":"Карта Снежная Королева",
  "kari":"Kari Club","zenden":"Карта Zenden","ральф рингер":"Карта Ralf Ringer","sokolov":"Карта Sokolov","sunlight":"Карта Sunlight","585 gold":"Карта 585",
  "читай-город":"Книголюб","буквоед":"Карта Буквоед","четыре лапы":"Карта Четыре лапы","бетховен":"Карта Бетховен",
  "ригла":"Карта Ригла","горздрав":"Карта Горздрав","36,6":"Карта 36,6","озерки":"Карта Озерки","планета здоровья":"Карта Планета здоровья",
  "аэрофлот":"Аэрофлот Бонус","s7":"S7 Priority","ржд":"РЖД Бонус","ozon":"","wildberries":"","яндекс маркет":"","мегамаркет":""
};
const LOYALTY_N=Object.fromEntries(Object.entries(LOYALTY).map(([k,v])=>[norm(k).replace(/[«»"']/g,""),v]));
const MONTHS_PREP=["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
const monthPrep=m=>{ const [,mm]=String(m||"").split("-"); return mm?MONTHS_PREP[+mm-1]:""; };
// найти карту магазина по названию (через справочник сетей, чтобы «пятерочка», «5ка» тоже работали)
function loyaltyFor(name){
  const nq=norm(name).replace(/[«»"']/g,"").trim(); if(!nq) return null;
  let canon=null;
  for(const [names] of MERCHANTS) if(names.some(n=>{ const nn=norm(n).replace(/[«»"']/g,""); return nn===nq || (nq.length>=4 && nn.startsWith(nq)); })){ canon=names[0]; break; }
  const k=norm(canon||name).replace(/[«»"']/g,"");
  if(k in LOYALTY_N) return {canon:canon||name, prog:LOYALTY_N[k]};
  // сеть есть в справочнике, но про карту мы не знаем
  return canon ? {canon, prog:null} : null;
}
// цвет карты магазина — из названия, чтобы у каждой сети был свой
function shopGradient(name){
  let h=0; for(const ch of norm(name)) h=(h*31+ch.charCodeAt(0))%360;
  return `linear-gradient(135deg,hsl(${h} 70% 52%),hsl(${(h+35)%360} 72% 40%))`;
}
// как выглядит карта магазина: своё фото, цвета с фото, выбранный цвет или (по умолчанию) цвет по названию магазина
function shopVars(o, name){
  if(o && (o.photo || o.custom || o.style)) return cardVars({photo:o.photo, custom:o.custom, style:o.style});
  return `--c-bg:${shopGradient(name)}`;
}
function shopGroups(){
  const m=new Map();
  const get=n=>{ const k=norm(n); if(!m.has(k)) m.set(k,{n,own:null,offers:[]}); return m.get(k); };
  for(const sh of looseDoc().shops||[]) get(sh.n).own = sh.prog===undefined ? {...sh, prog: loyaltyFor(sh.n)?.prog || "Карта магазина"} : sh;   // своя карта магазина
  for(const c of cards) for(const sh of c.shops||[]) get(sh.n).offers.push({card:c,p:sh.p,n:sh.n});   // старые предложения банков
  const list=[...m.values()]; list.forEach(g=>g.offers.sort((a,b)=>b.p-a.p));
  const top=g=>Math.max(g.own&&g.own.p!=null?g.own.p:-1, ...g.offers.map(o=>o.p), -1);
  return list.sort((a,b)=>top(b)-top(a) || a.n.localeCompare(b.n,"ru"));
}
/* ---------- поиск продукта: где выгоднее купить ---------- */
const today=()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const dealActive=x=>!x.until || x.until>=today();
const fmtDay=u=>{ if(!u) return ""; const [y,m,d]=u.split("-").map(Number); return `${d} ${GEN[m-1]}`; };
// лучшая банковская карта для покупки в этом магазине (категория по MCC + предложения банка в магазине)
// Кешбек «… доставка» (например «Дикси доставка 14%») действует только при заказе доставки,
// поэтому считаем его отдельно от покупки в самом магазине.
const isDelivery=it=>/доставк|delivery/.test(norm(it.n||""));
function bestBankFor(shopName, delivery=false){
  let terms=expand(shopName); const mer=merchantFor(shopName);
  if(mer) terms=[...terms, ...mer.terms.filter(t=>!t.startsWith("~")).filter(t=>!terms.includes(t))];
  const keep=it=>isBase(it.n) || isDelivery(it)===delivery;
  let best=null;
  for(const c of cards){
    const r=rankCard({...c, items:(c.items||[]).filter(keep), shops:(c.shops||[]).filter(keep)}, terms);
    if(delivery && (r.base || !r.item)) continue;          // для доставки — только явные «… доставка»
    if(!best || r.p>best.p) best={card:c, ...r};
  }
  return best;
}
function productHits(q){
  const nq=norm(q); if(nq.length<2) return [];
  const has=x=>{ const n=norm(x.n); return n.includes(nq) || nq.split(/\s+/).every(w=>w.length>=3 && n.includes(w.slice(0,Math.max(3,w.length-2)))); };
  const res=[];
  for(const sh of looseDoc().shops||[]){
    const deals=(sh.deals||[]).filter(x=>dealActive(x) && has(x)).sort((a,b)=>b.d-a.d);
    const f=sh.fav && sh.fav.month===nowMonth() ? sh.fav : null;
    const favs=f ? [...(f.goods||[]).map(x=>({...x,kind:"товар"})), ...(f.cats||[]).map(x=>({...x,kind:"категория"}))].filter(x=>has(x) && x.p!=null).sort((a,b)=>b.p-a.p) : [];
    if(!deals.length && !favs.length) continue;
    const d=deals[0]?.d||0;
    const b=favs.length ? favs[0].p : (sh.p||0);           // любимый товар/категория важнее общих бонусов карты магазина
    const bank=bestBankFor(sh.n); const c=bank?bank.p:0;
    // скидка, бонусы и кешбек начисляются друг за другом, поэтому складываем не напрямую
    const sum=cb=>100*(1-(1-d/100)*(1-b/100)*(1-cb/100));
    const total=sum(c);
    const del=bestBankFor(sh.n,true); const dc=del && del.p>c ? del.p : 0;
    res.push({sh, deal:deals[0]||null, fav:favs[0]||null, d, b, bank, c, total, del:dc?del:null, dc, dtotal:dc?sum(dc):0});
  }
  return res.sort((a,b)=>b.total-a.total);
}
function productHTML(q){
  const hits=productHits(q); if(!hits.length) return "";
  return `<li class="pres-h">Где выгоднее: «${esc(q.trim())}»</li>`+hits.map((h,i)=>{
    const what=[h.deal?`${esc(h.deal.n)}${h.deal.until?` · до ${esc(fmtDay(h.deal.until))}`:""}`:"", h.fav?(h.deal&&norm(h.deal.n)===norm(h.fav.n)?`любимый товар`:`${esc(h.fav.n)} (любимый ${h.fav.kind==="товар"?"товар":"раздел"})`):""].filter(Boolean).join(" · ");
    const parts=[h.d?`<span class="part sale">Скидка ${fmtP(h.d)}</span>`:"",
      h.b?`<span class="part">Карта ${esc(h.sh.n)} ${fmtP(h.b)}</span>`:"",
      h.bank&&h.c?`<span class="part"><i style="${cardVars(h.bank.card)}"></i>${esc(h.bank.card.bank)} ${fmtP(h.c)}${h.bank.base?" · на всё":""}</span>`:""].join("");
    // кешбек только за доставку — отдельной строкой, чтобы не путать с покупкой в магазине
    const deliv = h.del ? `<div class="pr-deliv"><span class="part deliv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg><i style="${cardVars(h.del.card)}"></i>${esc(h.del.card.bank)} ${fmtP(h.dc)} · только доставка</span><span class="pr-dtotal">с доставкой ≈ ${fmtP(h.dtotal)}</span></div>` : "";
    return `<li class="pres${i===0?" first":""}"><div class="pr-h"><strong>${esc(h.sh.n)}</strong><span class="pr-total">≈ ${fmtP(h.total)}</span></div>
      <div class="pr-what">${what}</div><div class="pr-parts">${parts}</div>${deliv}</li>`; }).join("");
}
function renderShops(){
  const raw=$("#shopQ").value, q=norm(raw);
  const all=shopGroups(); const list=all.filter(g=>!q||norm(g.n).includes(q));
  const box=$("#shopList");
  const prod=q?productHTML(raw):"";
  if(q && prod){ box.innerHTML=prod+(list.length?`<li class="pres-h">Магазины</li>`:"")+list.map(shopItemHTML).join(""); return; }
  if(q && !list.length){ box.innerHTML=`<li class="empty-s">Не нашёл «${esc(raw.trim())}» ни в акциях, ни в любимых товарах. Открой магазин и добавь акцию — например «${esc(raw.trim())} — 30%». <button type="button" class="btn" data-newshop="" style="margin-top:10px">+ Магазин</button></li>`; return; }
  if(!all.length){ box.innerHTML=`<li><button type="button" class="empty-s empty-add" data-newshop="">Добавь первый магазин, где у тебя есть их карта: например «Пятёрочка — Х5 Клуб»</button></li>`; return; }
  if(!list.length){ box.innerHTML=`<li class="empty-s">«${esc($("#shopQ").value)}» не найден. <button type="button" class="btn" data-newshop="${esc($("#shopQ").value)}" style="margin-top:10px">Добавить магазин</button></li>`; return; }
  box.innerHTML=list.map(shopItemHTML).join("");
}
function shopItemHTML(g){
    const o=g.own;
    const own = o ? (o.prog
        ? `<button type="button" class="lcard${o.photo?" photo":""}" data-edit-shop="${esc(g.n)}" style="${shopVars(o,g.n)}" aria-label="Изменить ${esc(g.n)}"><span class="lc-prog">${esc(g.n)}</span><span class="lc-p">${o.p!=null?fmtP(o.p):"карта"}</span></button>`
        : `<button type="button" class="lcard none" data-edit-shop="${esc(g.n)}" aria-label="Изменить ${esc(g.n)}"><span class="lc-prog">Без своей карты</span><span class="lc-p">${o.p!=null?fmtP(o.p):""}</span></button>`)
      : `<button type="button" class="offer add" data-newshop="${esc(g.n)}">+ карта магазина</button>`;
    const offers = g.offers.length ? `<div class="offers"><span class="off-lbl">Банки:</span>${g.offers.map(x=>`<button type="button" class="offer" data-shop="${esc(x.n)}" data-card="${x.card.id}" aria-label="${esc(x.card.bank)} ${fmtP(x.p)}"><i style="${cardVars(x.card)}"></i>${esc(x.card.bank)} <b>${fmtP(x.p)}</b></button>`).join("")}</div>` : "";
    let favs="";
    if(o && o.fav && ((o.fav.cats||[]).length||(o.fav.goods||[]).length)){
      const stale=o.fav.month!==nowMonth();
      const chip=(x,t)=>`<span class="fchip${stale?" old":""}" title="${t}">${t==="товар"?"★ ":""}${esc(x.n)}${x.p!=null?` <b>${fmtP(x.p)}</b>`:""}</span>`;
      favs=`<div class="favs"><button type="button" class="fav-h" data-edit-shop="${esc(g.n)}">${stale?`<span class="stale-t">Любимое за ${esc(monthOnly(o.fav.month))} — обнови</span>`:`Любимое в ${esc(monthPrep(o.fav.month))}`}</button>
        <div class="fchips">${(o.fav.cats||[]).map(x=>chip(x,"категория")).join("")}${(o.fav.goods||[]).map(x=>chip(x,"товар")).join("")}</div></div>`;
    } else if(o){ favs=`<button type="button" class="offer add" data-edit-shop="${esc(g.n)}">+ любимые категории и товары</button>`; }
    const act=(o&&o.deals||[]).filter(dealActive);
    const dealsHTML = act.length ? `<div class="favs"><button type="button" class="fav-h" data-edit-shop="${esc(g.n)}">Акции</button><div class="fchips">${act.map(x=>`<span class="fchip sale">${esc(x.n)} <b>−${fmtP(x.d)}</b>${x.until?` <small>до ${esc(fmtDay(x.until))}</small>`:""}</span>`).join("")}</div></div>` : "";
    // свой магазин — вся рамка нажимается и открывает его настройки
    const tap = o ? ` data-edit-shop="${esc(g.n)}" role="button" tabindex="0" aria-label="Изменить ${esc(g.n)}"` : "";
    return `<li class="shop${o?" tap":""}"${tap}><div class="shop-h"><strong>${esc(g.n)}</strong></div>${own}${favs}${dealsHTML}${offers}</li>`;
}
$("#shopQ").addEventListener("input",renderShops);
$("#shopList").addEventListener("click",e=>{
  // сначала то, что внутри рамки (предложение банка, «добавить»), потом сама рамка магазина
  const o=e.target.closest(".offer[data-card]"); if(o) return openBankOffer(o.dataset.shop,o.dataset.card);
  const n=e.target.closest("[data-newshop]"); if(n) return openShop(n.dataset.newshop,true);
  const ed=e.target.closest("[data-edit-shop]"); if(ed) return openShop(ed.dataset.editShop);
});
$("#shopList").addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ") && e.target.matches(".shop.tap")){ e.preventDefault(); openShop(e.target.dataset.editShop); }
});
// нажатие на рамку магазина: от пальца расходится затемнение
$("#shopList").addEventListener("pointerdown",e=>{
  const li=e.target.closest(".shop.tap"); if(!li || e.target.closest(".offer[data-card]")) return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r=li.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
  const size=2*Math.hypot(Math.max(x,r.width-x), Math.max(y,r.height-y));
  const rip=document.createElement("span"); rip.className="ripple";
  rip.style.cssText=`left:${x-size/2}px;top:${y-size/2}px;width:${size}px;height:${size}px`;
  li.appendChild(rip);
  const t0=performance.now();
  const end=()=>{ removeEventListener("pointerup",end); removeEventListener("pointercancel",end);
    setTimeout(()=>{ rip.classList.add("out"); setTimeout(()=>rip.remove(),350); }, Math.max(0,250-(performance.now()-t0))); };
  addEventListener("pointerup",end); addEventListener("pointercancel",end);
});
// добавить / изменить магазин: на карте магазина пишется его название
function openShop(name="", isNew){
  const ld=looseDoc(); const cur=(ld.shops||[]).find(x=>norm(x.n)===norm(name||"")) || null;
  if(isNew===undefined) isNew=!cur;
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  s.innerHTML=`<form class="sheet" id="shForm" autocomplete="off" role="dialog" aria-modal="true" aria-label="Магазин">
    <h3>${isNew?"Новый магазин":"Изменить магазин"}</h3>
    <div class="fl"><label for="shName">Магазин</label><input class="in" id="shName" required maxlength="40" list="shopNames" placeholder="Пятёрочка"></div>
    <datalist id="shopNames">${MERCHANTS.map(([n])=>`<option value="${esc(n[0])}">`).join("")}</datalist>
    <div class="fl"><span class="lab">Фото карты магазина</span>
      <div class="ph"><div class="lprev ph-shop" id="shPrev" aria-hidden="true"><span class="lc-prog" id="shPrevName"></span><span class="lc-p" id="shPrevP"></span></div>
        <div class="ph-btns">
          <label class="btn" for="shCam">Сфоткать<input class="vh" id="shCam" type="file" accept="image/*" capture="environment"></label>
          <label class="btn" for="shGal">Из галереи<input class="vh" id="shGal" type="file" accept="image/*"></label>
          <button type="button" class="btn ghost" id="shPhDel" hidden>Убрать фото</button></div></div></div>
    <div class="fl" id="shLook"><span class="lab" id="shColorLab">Цвет</span>
      <div class="sw" id="shSw"><button type="button" class="sw-auto" data-st="" style="--c-bg:${shopGradient(name||"магазин")}" aria-label="Цвет по названию магазина"></button>${Object.entries(STYLES).map(([k,v])=>`<button type="button" data-st="${k}" style="${styleVars(k)}" aria-label="${v.name}"></button>`).join("")}<button type="button" class="sw-own" id="shOwn" aria-label="Свой цвет"></button></div></div>
    <div class="fl"><label for="shP">Бонусы по карте магазина, %</label><input class="in" id="shP" inputmode="decimal" placeholder="Например, 5 (можно оставить пустым)"></div>
    <div class="fl" id="shFavBox"><span class="lab lab-h">Любимое на ${esc(monthOnly(nowMonth()))}${qhelp("Любимое","Любимые категории и товары, которые ты выбрал в приложении магазина на этот месяц.")}</span>
      <span class="sublab">Любимые категории</span><div class="favrows" id="shCats"></div>
      <button type="button" class="btn ghost addrow" data-add="cats">+ Категория</button>
      <span class="sublab">Любимые товары</span><div class="favrows" id="shGoods"></div>
      <button type="button" class="btn ghost addrow" data-add="goods">+ Товар</button>
      <p class="note warn" id="shFavStale" hidden></p></div>
    <div class="fl" id="shDealBox"><span class="lab lab-h">Акции и скидки${qhelp("Акции и скидки","Скидка на конкретный товар, например «Шоколад Alpen Gold — 30% до 15 ноября». Дату можно не ставить.")}</span>
      <div class="favrows" id="shDeals"></div>
      <button type="button" class="btn ghost addrow" id="shAddDeal">+ Акция</button></div>
    <div class="acts"><div>${isNew?"":`<button type="button" class="btn danger" id="shDel">Удалить</button>`}</div>
      <div><button type="button" class="btn ghost" id="shCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></div>
  </form>`;
  document.body.appendChild(s);
  const nameEl=$("#shName");   // на карте магазина написано название магазина
  // вид карты магазина — как у банковских карт: фото, готовые цвета или свой цвет
  const look={photo:cur?.photo||null, custom:cur?.custom||null, style:cur?.style||""};
  const drawLook=()=>{
    $("#shPhDel").hidden=!(look.photo||look.custom);
    $("#shPhDel").textContent = look.custom ? "Убрать цвета с фото" : "Убрать фото";
    $("#shColorLab").textContent = look.photo ? "Цвет (если убрать фото)" : "Цвет";
    const autoB=$("#shSw").querySelector(".sw-auto"); autoB.style.setProperty("--c-bg", shopGradient(nameEl.value||"магазин"));
    $("#shSw").querySelectorAll("[data-st]").forEach(b=>b.setAttribute("aria-pressed", !look.custom && b.dataset.st===look.style));
    const own=$("#shOwn"), isOwn=!look.custom && isOwnColor(look.style);
    own.setAttribute("aria-pressed", isOwn); own.setAttribute("style", isOwn ? styleVars(look.style) : "");
  };
  const drawPrev=()=>{
    $("#shPrev").classList.toggle("photo",!!look.photo);
    $("#shPrev").setAttribute("style", shopVars(look, nameEl.value||"магазин"));
    drawLook();
    $("#shPrevName").textContent = nameEl.value.trim() || "Магазин";
    const p=$("#shP").value.trim(); $("#shPrevP").textContent = p ? fmtP(cleanP(p)) : "";
  };
  // любимые категории и товары на текущий месяц; старые месяцы показываем как прошлые
  const nm=nowMonth(); const oldFav=cur&&cur.fav;
  const fav={cats:(oldFav&&oldFav.month===nm?oldFav.cats:[])||[], goods:(oldFav&&oldFav.month===nm?oldFav.goods:[])||[]};
  fav.cats=fav.cats.map(x=>({...x})); fav.goods=fav.goods.map(x=>({...x}));
  if(oldFav && oldFav.month!==nm && ((oldFav.cats||[]).length||(oldFav.goods||[]).length)){
    $("#shFavStale").hidden=false;
    $("#shFavStale").textContent=`В ${monthPrep(oldFav.month)} было: ${[...(oldFav.cats||[]),...(oldFav.goods||[])].map(x=>x.n+" "+fmtP(x.p)).join(", ")}. Впиши, что выбрал на ${monthOnly(nm)}.`; }
  const drawFav=()=>{ for(const kind of ["cats","goods"]){ const box=kind==="cats"?$("#shCats"):$("#shGoods");
      box.innerHTML=fav[kind].map((x,i)=>`<div class="erow" data-k="${kind}" data-i="${i}"><input class="in" data-f="n" placeholder="${kind==="cats"?"Например, Овощи":"Например, Молоко Простоквашино"}" value="${esc(x.n||"")}" aria-label="Название"><input class="in" data-f="p" inputmode="decimal" placeholder="%" value="${x.p!=null&&x.p!==""?esc(String(x.p).replace(".",",")):""}" aria-label="Процент"><button type="button" class="x" data-rm aria-label="Удалить">×</button></div>`).join(""); } };
  const syncFav=()=>{ document.querySelectorAll("#shFavBox .erow").forEach(r=>{ const it=fav[r.dataset.k][+r.dataset.i]; if(!it) return; it.n=r.querySelector("[data-f=n]").value; it.p=r.querySelector("[data-f=p]").value; }); };
  $("#shFavBox").addEventListener("click",e=>{
    const a=e.target.closest("[data-add]"); if(a){ syncFav(); fav[a.dataset.add].push({n:"",p:""}); drawFav(); const rows=(a.dataset.add==="cats"?$("#shCats"):$("#shGoods")).querySelectorAll("[data-f=n]"); rows[rows.length-1]?.focus(); return; }
    const rm=e.target.closest("[data-rm]"); if(rm){ syncFav(); const r=rm.closest(".erow"); fav[r.dataset.k].splice(+r.dataset.i,1); drawFav(); } });
  drawFav();
  // акции на товары: {n — товар, d — скидка %, until — до какого дня (ГГГГ-ММ-ДД)}
  const deals=((cur&&cur.deals)||[]).map(x=>({...x}));
  const drawDeals=()=>{ $("#shDeals").innerHTML=deals.map((x,i)=>`<div class="erow deal" data-i="${i}"><input class="in" data-f="n" placeholder="Например, Шоколад Alpen Gold" value="${esc(x.n||"")}" aria-label="Товар"><input class="in" data-f="d" inputmode="decimal" placeholder="−%" value="${x.d!=null&&x.d!==""?esc(String(x.d).replace(".",",")):""}" aria-label="Скидка, %"><input class="in" data-f="u" type="date" value="${esc(x.until||"")}" aria-label="До какого дня"><button type="button" class="x" data-rmdeal aria-label="Удалить">×</button></div>`).join(""); };
  const syncDeals=()=>{ document.querySelectorAll("#shDeals .erow").forEach(r=>{ const it=deals[+r.dataset.i]; if(!it) return; it.n=r.querySelector("[data-f=n]").value; it.d=r.querySelector("[data-f=d]").value; it.until=r.querySelector("[data-f=u]").value; }); };
  $("#shAddDeal").onclick=()=>{ syncDeals(); deals.push({n:"",d:"",until:""}); drawDeals(); const r=$("#shDeals").querySelectorAll("[data-f=n]"); r[r.length-1]?.focus(); };
  $("#shDeals").addEventListener("click",e=>{ const b=e.target.closest("[data-rmdeal]"); if(!b) return; syncDeals(); deals.splice(+b.closest(".erow").dataset.i,1); drawDeals(); });
  drawDeals();
  nameEl.value=cur?cur.n:(name||""); $("#shP").value=cur&&cur.p!=null?String(cur.p).replace(".",","):"";
  drawPrev();
  nameEl.addEventListener("input",drawPrev);
  $("#shP").addEventListener("input",drawPrev);
  setTimeout(()=>(nameEl.value?$("#shP"):nameEl).focus(),50);
  const close=()=>s.remove();
  s.addEventListener("click",e=>{ if(e.target===s) close(); });
  s.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  $("#shCancel").onclick=close;
  const save=async list=>{ const d={...looseDoc(), shops:list, updatedAt:Date.now()}; putCard(d); renderShops(); render(); await store.save(d); };
  const others=()=>(looseDoc().shops||[]).filter(x=>!cur || norm(x.n)!==norm(cur.n));
  if($("#shDel")) $("#shDel").onclick=async()=>{ close(); await save(others()); };
  $("#shSw").onclick=async e=>{
    if(e.target.closest("#shOwn")){ const hex=await openColorPicker(isOwnColor(look.style)?look.style:"#e8475a", nameEl.value.trim()||"Магазин"); if(!hex) return;
      look.style=hex; look.custom=null; drawPrev(); return; }
    const b=e.target.closest("[data-st]"); if(!b) return; look.style=b.dataset.st; look.custom=null; drawPrev(); };
  const onShopFile=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; if(!f) return;
    const r=await openPhotoEditor(f); if(!r) return;
    if(r.photo){ look.photo=r.photo; look.custom=null; } else { look.custom=r.custom; look.photo=null; }
    drawPrev(); };
  $("#shCam").onchange=onShopFile; $("#shGal").onchange=onShopFile;
  $("#shPhDel").onclick=()=>{ look.photo=null; look.custom=null; drawPrev(); };
  $("#shForm").onsubmit=async e=>{ e.preventDefault();
    const typed=nameEl.value.trim(); if(!typed) return;
    const n=loyaltyFor(typed)?.canon || typed;   // «пятерочка» → «Пятёрочка»
    const pv=$("#shP").value.trim();
    syncFav();
    const clean=a=>a.filter(x=>String(x.n||"").trim()).map(x=>({n:String(x.n).trim(), p: String(x.p||"").trim()?cleanP(x.p):null}));
    const fv={month:nm, cats:clean(fav.cats), goods:clean(fav.goods)};
    const entry={n, prog: n, p: pv ? cleanP(pv) : null,
      fav: (fv.cats.length||fv.goods.length) ? fv : (oldFav && oldFav.month!==nm ? oldFav : null),
      // акции: пустые строки отбрасываем, давно закончившиеся (больше 30 дней назад) — тоже
      deals: (syncDeals(), deals.filter(x=>String(x.n||"").trim() && String(x.d||"").trim()).map(x=>({n:String(x.n).trim(), d:cleanP(x.d), until:x.until||""}))
        .filter(x=>!x.until || (Date.now()-new Date(x.until+"T23:59:59"))/864e5 < 30)),
      ...(look.photo?{photo:look.photo}:{}), ...(look.custom?{custom:look.custom}:{}), ...(look.style?{style:look.style}:{})};
    close();
    await save([...others().filter(x=>norm(x.n)!==norm(n)), entry]);
  };
}
// старые предложения банков в магазинах (например, «Т-Банк 10% в Пятёрочке») — можно поправить процент или удалить
function openBankOffer(name, cardId){
  const card=cards.find(c=>c.id===cardId); if(!card) return;
  const cur=(card.shops||[]).find(x=>norm(x.n)===norm(name)); if(!cur) return;
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  s.innerHTML=`<form class="sheet" id="boForm" role="dialog" aria-modal="true" aria-label="Предложение банка">
    <h3 class="h-help">${esc(card.bank)} в «${esc(cur.n)}»${qhelp("Кешбек банка в магазине","Повышенный кешбек банка в этом магазине. Новые такие предложения добавляются в саму карту банка, а здесь — карты магазинов.")}</h3>
    <div class="fl"><label for="boP">Кешбек, %</label><input class="in" id="boP" inputmode="decimal" value="${esc(String(cur.p).replace(".",","))}"></div>
    <div class="acts"><div><button type="button" class="btn danger" id="boDel">Удалить</button></div>
      <div><button type="button" class="btn ghost" id="boCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></div></form>`;
  document.body.appendChild(s);
  const close=()=>s.remove(); s.addEventListener("click",e=>{ if(e.target===s) close(); }); $("#boCancel").onclick=close;
  const write=async shops=>{ const u={...card, shops, updatedAt:Date.now()}; putCard(u); renderShops(); render(); await store.save(u); };
  $("#boDel").onclick=async()=>{ close(); await write((card.shops||[]).filter(x=>x!==cur)); };
  $("#boForm").onsubmit=async e=>{ e.preventDefault(); const p=cleanP($("#boP").value); close(); await write((card.shops||[]).map(x=>x===cur?{...x,p}:x)); };
}
