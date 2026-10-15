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
  const changed=b.dataset.view!==view; setView(b.dataset.view);
  if(changed){ const els = view==="shops" ? [$("#shopsView")] : [...document.querySelectorAll("#cardsView > *")];
    els.forEach(el=>{ el.classList.remove("viewin"); void el.offsetWidth; el.classList.add("viewin"); el.addEventListener("animationend",()=>el.classList.remove("viewin"),{once:true}); }); }
});
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
function shopGroups(){
  const m=new Map();
  const get=n=>{ const k=norm(n); if(!m.has(k)) m.set(k,{n,own:null,offers:[]}); return m.get(k); };
  for(const sh of looseDoc().shops||[]) get(sh.n).own = sh.prog===undefined ? {...sh, prog: loyaltyFor(sh.n)?.prog || "Карта магазина"} : sh;   // своя карта магазина
  for(const c of cards) for(const sh of c.shops||[]) get(sh.n).offers.push({card:c,p:sh.p,n:sh.n});   // старые предложения банков
  const list=[...m.values()]; list.forEach(g=>g.offers.sort((a,b)=>b.p-a.p));
  const top=g=>Math.max(g.own&&g.own.p!=null?g.own.p:-1, ...g.offers.map(o=>o.p), -1);
  return list.sort((a,b)=>top(b)-top(a) || a.n.localeCompare(b.n,"ru"));
}
function renderShops(){
  const q=norm($("#shopQ").value);
  const all=shopGroups(); const list=all.filter(g=>!q||norm(g.n).includes(q));
  const box=$("#shopList");
  if(!all.length){ box.innerHTML=`<li class="empty-s">Добавь магазины, где у тебя есть их карта: например «Пятёрочка — Х5 Клуб». Нажми «+ Магазин».</li>`; return; }
  if(!list.length){ box.innerHTML=`<li class="empty-s">«${esc($("#shopQ").value)}» не найден. <button type="button" class="btn" data-newshop="${esc($("#shopQ").value)}" style="margin-top:10px">Добавить магазин</button></li>`; return; }
  box.innerHTML=list.map(g=>{
    const o=g.own;
    const own = o ? (o.prog
        ? `<button type="button" class="lcard" data-edit-shop="${esc(g.n)}" style="--c-bg:${shopGradient(g.n)}" aria-label="Изменить ${esc(g.n)}"><span class="lc-prog">${esc(o.prog)}</span><span class="lc-p">${o.p!=null?fmtP(o.p):"карта"}</span></button>`
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
    return `<li class="shop"><div class="shop-h"><strong>${esc(g.n)}</strong></div>${own}${favs}${offers}</li>`;
  }).join("");
}
$("#shopQ").addEventListener("input",renderShops);
$("#shopList").addEventListener("click",e=>{
  const ed=e.target.closest("[data-edit-shop]"); if(ed) return openShop(ed.dataset.editShop);
  const o=e.target.closest(".offer[data-card]"); if(o) return openBankOffer(o.dataset.shop,o.dataset.card);
  const n=e.target.closest("[data-newshop]"); if(n) return openShop(n.dataset.newshop,true);
});
// добавить / изменить магазин: название → карта магазина подставляется сама
function openShop(name="", isNew){
  const ld=looseDoc(); const cur=(ld.shops||[]).find(x=>norm(x.n)===norm(name||"")) || null;
  if(isNew===undefined) isNew=!cur;
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  s.innerHTML=`<form class="sheet" id="shForm" autocomplete="off" role="dialog" aria-modal="true" aria-label="Магазин">
    <h3>${isNew?"Новый магазин":"Изменить магазин"}</h3>
    <div class="fl"><label for="shName">Магазин</label><input class="in" id="shName" required maxlength="40" list="shopNames" placeholder="Пятёрочка"></div>
    <datalist id="shopNames">${MERCHANTS.map(([n])=>`<option value="${esc(n[0])}">`).join("")}</datalist>
    <div class="fl"><label for="shProg">Карта магазина</label>
      <div class="lprev" id="shPrev"><span class="lc-prog" id="shPrevName"></span><span class="lc-p" id="shPrevP"></span></div>
      <input class="in" id="shProg" maxlength="40" placeholder="Название карты, например Х5 Клуб">
      <label class="chk"><input type="checkbox" id="shNone"> У магазина нет своей карты</label>
      <p class="note" id="shHint" style="margin:0" hidden></p></div>
    <div class="fl"><label for="shP">Бонусы по карте магазина, %</label><input class="in" id="shP" inputmode="decimal" placeholder="Например, 5 (можно оставить пустым)"></div>
    <div class="fl" id="shFavBox"><span class="lab">Любимое на ${esc(monthOnly(nowMonth()))}</span>
      <p class="note" style="margin:0">Любимые категории и товары, которые ты выбрал в приложении магазина на этот месяц.</p>
      <span class="sublab">Любимые категории</span><div class="favrows" id="shCats"></div>
      <button type="button" class="btn ghost addrow" data-add="cats">+ Категория</button>
      <span class="sublab">Любимые товары</span><div class="favrows" id="shGoods"></div>
      <button type="button" class="btn ghost addrow" data-add="goods">+ Товар</button>
      <p class="note warn" id="shFavStale" hidden></p></div>
    <div class="acts"><div>${isNew?"":`<button type="button" class="btn danger" id="shDel">Удалить</button>`}</div>
      <div><button type="button" class="btn ghost" id="shCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></div>
  </form>`;
  document.body.appendChild(s);
  let progTouched=!!cur;   // если человек сам поправил название карты — больше не подменяем
  const nameEl=$("#shName"), progEl=$("#shProg"), noneEl=$("#shNone"), hint=$("#shHint");
  const drawPrev=()=>{
    const none=noneEl.checked; progEl.disabled=none;
    $("#shPrev").classList.toggle("none",none);
    $("#shPrev").style.setProperty("--c-bg", shopGradient(nameEl.value||"магазин"));
    $("#shPrevName").textContent = none ? "Без своей карты" : (progEl.value.trim() || "Карта магазина");
    const p=$("#shP").value.trim(); $("#shPrevP").textContent = p ? fmtP(cleanP(p)) : "";
  };
  const autofill=()=>{
    const info=loyaltyFor(nameEl.value);
    if(!info){ hint.hidden=true; drawPrev(); return; }
    if(!progTouched){
      if(info.prog===""){ noneEl.checked=true; progEl.value=""; }
      else if(info.prog){ noneEl.checked=false; progEl.value=info.prog; }
      else { noneEl.checked=false; progEl.value=`Карта ${info.canon}`; }
    }
    hint.hidden=false;
    hint.textContent = info.prog==="" ? `Похоже, у «${info.canon}» нет своей карты — кешбек там будет только от банка.`
      : info.prog ? `Карта подставилась сама: «${info.prog}». Если у тебя другая — поправь название.`
      : `Точное название карты «${info.canon}» мы не знаем — поправь, если нужно.`;
    drawPrev();
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
  nameEl.value=cur?cur.n:(name||""); progEl.value=cur?(cur.prog||""):""; noneEl.checked=!!cur && !cur.prog; $("#shP").value=cur&&cur.p!=null?String(cur.p).replace(".",","):"";
  if(!cur) autofill(); else drawPrev();
  nameEl.addEventListener("input",autofill);
  progEl.addEventListener("input",()=>{ progTouched=true; drawPrev(); });
  noneEl.addEventListener("change",()=>{ progTouched=true; drawPrev(); });
  $("#shP").addEventListener("input",drawPrev);
  setTimeout(()=>(nameEl.value?$("#shP"):nameEl).focus(),50);
  const close=()=>s.remove();
  s.addEventListener("click",e=>{ if(e.target===s) close(); });
  s.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  $("#shCancel").onclick=close;
  const save=async list=>{ const d={...looseDoc(), shops:list, updatedAt:Date.now()}; putCard(d); renderShops(); render(); await store.save(d); };
  const others=()=>(looseDoc().shops||[]).filter(x=>!cur || norm(x.n)!==norm(cur.n));
  if($("#shDel")) $("#shDel").onclick=async()=>{ close(); await save(others()); };
  $("#shForm").onsubmit=async e=>{ e.preventDefault();
    const typed=nameEl.value.trim(); if(!typed) return;
    const n=loyaltyFor(typed)?.canon || typed;   // «пятерочка» → «Пятёрочка»
    const pv=$("#shP").value.trim();
    syncFav();
    const clean=a=>a.filter(x=>String(x.n||"").trim()).map(x=>({n:String(x.n).trim(), p: String(x.p||"").trim()?cleanP(x.p):null}));
    const fv={month:nm, cats:clean(fav.cats), goods:clean(fav.goods)};
    const entry={n, prog: noneEl.checked ? "" : (progEl.value.trim()||`Карта ${n}`), p: pv ? cleanP(pv) : null,
      fav: (fv.cats.length||fv.goods.length) ? fv : (oldFav && oldFav.month!==nm ? oldFav : null)};
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
    <h3>${esc(card.bank)} в «${esc(cur.n)}»</h3>
    <p class="note" style="margin:0">Повышенный кешбек банка в этом магазине. Новые такие предложения добавляются в саму карту банка, а здесь — карты магазинов.</p>
    <div class="fl"><label for="boP">Кешбек, %</label><input class="in" id="boP" inputmode="decimal" value="${esc(String(cur.p).replace(".",","))}"></div>
    <div class="acts"><div><button type="button" class="btn danger" id="boDel">Удалить</button></div>
      <div><button type="button" class="btn ghost" id="boCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></div></form>`;
  document.body.appendChild(s);
  const close=()=>s.remove(); s.addEventListener("click",e=>{ if(e.target===s) close(); }); $("#boCancel").onclick=close;
  const write=async shops=>{ const u={...card, shops, updatedAt:Date.now()}; putCard(u); renderShops(); render(); await store.save(u); };
  $("#boDel").onclick=async()=>{ close(); await write((card.shops||[]).filter(x=>x!==cur)); };
  $("#boForm").onsubmit=async e=>{ e.preventDefault(); const p=cleanP($("#boP").value); close(); await write((card.shops||[]).map(x=>x===cur?{...x,p}:x)); };
}
