// Кешбекер — Редактор карты, корзина, уведомления.
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

/* ---------- editor ---------- */
let tab="cur";
function openEditor(card, startTab="cur"){
  tab=startTab;
  editing = card ? JSON.parse(JSON.stringify(card)) : {id:uid(),bank:"",label:"",style:"blue",order:(Math.max(0,...allCards.map(c=>c.order??0))+1),month:nowMonth(),items:[{n:"",p:5},{n:"Всё остальное",p:1}],shops:[],isNew:true};
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  s.innerHTML=`<form class="sheet" id="edForm" autocomplete="off" role="dialog" aria-modal="true" aria-label="Карта">
    <h3>${editing.isNew?"Новая карта":"Изменить карту"}</h3>
    <div class="two">
      <div class="fl"><label for="edBank">Банк</label><input class="in" id="edBank" required maxlength="30" placeholder="Т-Банк" value="${esc(editing.bank)}"></div>
      <div class="fl"><label for="edLabel">Подпись</label><input class="in" id="edLabel" maxlength="20" placeholder="Black" value="${esc(editing.label)}"></div>
    </div>
    <div class="fl"><span class="lab">Фото карты</span>
      <div class="ph"><div class="ph-prev" id="edPhPrev" aria-hidden="true"></div>
        <div class="ph-btns">
          <label class="btn" for="edCam">Сфотографировать<input class="vh" id="edCam" type="file" accept="image/*" capture="environment"></label>
          <label class="btn" for="edGal">Из галереи<input class="vh" id="edGal" type="file" accept="image/*"></label>
          <button type="button" class="btn ghost" id="edPhDel" hidden>Убрать фото</button>
        </div></div>
    </div>
    <div class="fl"><span class="lab" id="edColorLab">Цвет</span><div class="sw" id="edSw">${Object.entries(STYLES).map(([k,v])=>`<button type="button" data-st="${k}" style="${styleVars(k)}" aria-label="${v.name}" aria-pressed="${k===editing.style}"></button>`).join("")}<button type="button" class="sw-own" id="edOwn" aria-pressed="${isOwnColor(editing.style)}" style="${isOwnColor(editing.style)?styleVars(editing.style):""}" aria-label="Свой цвет"></button></div></div>
    <div class="fl"><span class="lab lab-h">Кешбек${qhelp("Кешбек по месяцам","«Сейчас» — кешбек, который действует в этом месяце. «Следующий» — категории на следующий месяц: выбери их заранее, 1-го числа они сами станут текущими.")}</span>
      <div class="seg" role="tablist" id="edSeg"><button type="button" role="tab" data-tab="cur">Сейчас<small>${esc(monthOnly(nowMonth()))}</small></button><button type="button" role="tab" data-tab="next">Следующий<small>${esc(monthOnly(addMonth(nowMonth())))}</small></button></div>
      <div id="edRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="edAdd">+ Строка</button><button type="button" class="btn ghost" id="edCopy">Скопировать из текущего</button><button type="button" class="btn ghost danger" id="edClearNext">Очистить месяц</button></div></div>
    <datalist id="commonCats">${COMMON.map(c=>`<option value="${c}">`).join("")}</datalist>
    <div class="acts"><div>${editing.isNew?"":`<button type="button" class="btn danger" id="edDel">В корзину</button>`}</div>
      <div><button type="button" class="btn ghost" id="edCancel">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></div>
  </form>`;
  document.body.appendChild(s);
  const nm=addMonth(nowMonth());
  if(!editing.next || editing.next.month!==nm){
    // черновик следующего месяца: магазины и «на всё» переносятся, категории выбираются заново
    editing.next={month:nm, items:[{n:"",p:5},...(editing.items||[]).filter(i=>isBase(i.n)).map(i=>({...i}))], draft:true};
  }
  // смена «Сейчас/Следующий» плавная, как смена разделов: подсказка, строки и кнопки под ними
  // быстро гаснут, меняются и мягко проявляются (кнопка «Скопировать из текущего» не выскакивает резко)
  let tabFade=0, tab0;
  const setTab=(t,first)=>{ if(!first && t===tab0) return; tab0=t; $("#edSeg").querySelectorAll("button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
    if(first){ applyTab(t); return; }
    const my=++tabFade;
    curtainSwap($("#edSeg").parentElement, $("#edRows"), () => applyTab(t), () => my===tabFade);
  };
  const applyTab=(t,noSync)=>{ if(!noSync) syncRows(); tab=t;
    $("#edCopy").hidden = t==="cur"; $("#edClearNext").hidden = t==="cur" || editing.next.draft; drawRows(); };
  $("#edSeg").onclick=e=>{const b=e.target.closest("[data-tab]"); if(b) setTab(b.dataset.tab);};
  $("#edCopy").onclick=()=>{ editing.next.items=(editing.items||[]).map(i=>({...i})); editing.next.draft=false; drawRows(); };
  $("#edClearNext").onclick=()=>{ editing.next={month:nm,items:[{n:"",p:5},...(editing.items||[]).filter(i=>isBase(i.n)).map(i=>({...i}))],draft:true,cleared:true}; tab0="next"; applyTab("next",true); };
  setTab(tab,true);
  setTimeout(()=>$("#edBank").focus(),50);
  s.addEventListener("click",e=>{ if(e.target===s) closeEditor(); });
  $("#edCancel").onclick=closeEditor;
  $("#edSw").onclick=e=>{const b=e.target.closest("[data-st]"); if(!b)return; editing.style=b.dataset.st; editing.custom=null; $("#edSw").querySelectorAll("[data-st]").forEach(x=>x.setAttribute("aria-pressed",x===b)); $("#edOwn").setAttribute("aria-pressed","false"); drawPhoto();};
  // свой цвет: своя палитра с кнопками «Отмена» и «Готово»
  $("#edOwn").onclick=async()=>{
    const hex=await openColorPicker(isOwnColor(editing.style)?editing.style:"#e8475a", $("#edBank").value.trim()||"Карта"); if(!hex) return;
    editing.style=hex; editing.custom=null;
    $("#edSw").querySelectorAll("[data-st]").forEach(x=>x.setAttribute("aria-pressed","false"));
    const own=$("#edOwn"); own.setAttribute("aria-pressed","true"); own.setAttribute("style",styleVars(hex)); drawPhoto(); };
  const drawPhoto=()=>{ $("#edPhPrev").setAttribute("style", cardVars(editing)); $("#edPhDel").hidden=!(editing.photo||editing.custom);
    $("#edPhDel").textContent = editing.custom ? "Убрать цвета с фото" : "Убрать фото";
    $("#edColorLab").textContent = editing.photo ? "Цвет (если убрать фото)" : "Цвет"; };
  drawPhoto();
  const onFile=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; if(!f) return;
    const r=await openPhotoEditor(f); if(!r) return;
    if(r.photo){ editing.photo=r.photo; editing.custom=null; } else { editing.custom=r.custom; editing.photo=null; }
    drawPhoto(); };
  $("#edCam").onchange=onFile; $("#edGal").onchange=onFile;
  $("#edPhDel").onclick=()=>{ editing.photo=null; editing.custom=null; drawPhoto(); };
  $("#edAdd").onclick=()=>{ syncRows(); curRows().push({n:"",p:5}); if(tab==="next") editing.next.draft=false; drawRows(); const ins=$("#edRows").querySelectorAll("input[data-f=n]"); ins[ins.length-1]?.focus(); };
  const del=$("#edDel"); if(del) del.onclick=()=>{ const id=editing.id; closeEditor(); trashCard(id); };
  $("#edForm").onsubmit=async e=>{ e.preventDefault(); syncRows();
    const nextItems=cleanItems(editing.next.items);
    const keepNext = !editing.next.draft && nextItems.some(i=>!isBase(i.n));
    const c={id:editing.id,bank:$("#edBank").value.trim()||"Карта",label:$("#edLabel").value.trim(),style:editing.style,order:editing.order??0,month:nowMonth(),
      photo:editing.photo||null,custom:editing.custom||null,shops:editing.shops||[],items:cleanItems(editing.items),next: keepNext ? {month:editing.next.month, items:nextItems} : null,sample:false,updatedAt:Date.now()};
    closeEditor(); putCard(c); selected=c.id; render(); await store.save(c); };
  s.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#phScrim")) closeEditor(); });
}
const curRows=()=> tab==="next" ? editing.next.items : editing.items;
// фото обрезается по пропорциям банковской карты и сжимается, чтобы влезть в хранилище
async function makePhoto(file){
  let src;
  try{ src=await createImageBitmap(file,{imageOrientation:"from-image"}); }
  catch{ src=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); }); }
  const sw=src.width, sh=src.height; if(!sw||!sh) throw new Error("empty");
  let W=800, out="";
  for(let q=.8; ; q-=.1){
    const H=Math.round(W/1.586), cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const k=Math.max(W/sw,H/sh), dw=sw*k, dh=sh*k;
    cv.getContext("2d").drawImage(src,(W-dw)/2,(H-dh)/2,dw,dh);
    out=cv.toDataURL("image/jpeg",q);
    if(out.length<160000 || q<.45){ if(out.length<160000) break; W=Math.round(W*.75); q=.8; if(W<320) break; }
  }
  return out;
}
function drawRows(){
  $("#edRows").innerHTML=curRows().map((it,i)=>`<div class="erow" data-i="${i}">
    <input class="in" data-f="n" id="edN${i}" list="commonCats" placeholder="Категория" value="${esc(it.n)}" aria-label="Название">
    <input class="in" data-f="p" id="edP${i}" inputmode="decimal" value="${esc(String(it.p).replace(".",","))}" aria-label="Процент">
    <button type="button" class="x" data-rm="${i}" aria-label="Удалить строку">×</button></div>`).join("");
  $("#edRows").onclick=e=>{const b=e.target.closest("[data-rm]"); if(!b)return; syncRows(); curRows().splice(+b.dataset.rm,1); if(tab==="next") editing.next.draft=false; drawRows();};
}
function syncRows(){
  const rows=curRows(); let changed=false;
  $("#edRows").querySelectorAll(".erow").forEach(r=>{ const it=rows[+r.dataset.i]; if(!it)return;
    const n=r.querySelector("[data-f=n]").value, p=String(r.querySelector("[data-f=p]").value).replace(",",".");
    if(n!==it.n||p!==String(it.p)) changed=true; it.n=n; it.p=p; });
  if(tab==="next" && changed) editing.next.draft=false;
}
function closeEditor(){ $("#scrim")?.remove(); editing=null; }

// магазины без карты хранятся отдельной записью "_shops" рядом с картами
const LOOSE_ID="_shops";
const looseDoc=()=>allCards.find(c=>c.id===LOOSE_ID) || {id:LOOSE_ID, kind:"shops", items:[], shops:[]};
function setAll(list){
  allCards=(list||[]).map(normCard);
  cards=allCards.filter(c=>!c.deletedAt && !String(c.id).startsWith("_"));
}
function putCard(c){ const i=allCards.findIndex(x=>x.id===c.id); const l=[...allCards]; if(i>=0) l[i]=c; else l.push(c); setAll(l); writeLS(allCards); }
function applyRoll(){
  setAll(allCards.map(c=>{ if(c.deletedAt) return c; const r=rollCard(c); if(r){ store?.save(r); return r; } return c; }));
}
async function trashCard(id){
  const c=allCards.find(x=>x.id===id); if(!c) return;
  const d={...c, deletedAt:Date.now()};
  if(selected===id) selected=null;
  putCard(d); render(); toast(`${c.bank} в корзине`, "Вернуть", ()=>restoreCard(id));
  await store.save(d);
}
async function restoreCard(id){
  const c=allCards.find(x=>x.id===id); if(!c) return;
  const r={...c}; delete r.deletedAt; r.deletedAt=null;
  putCard(r); render(); await store.save(r);
}
async function purgeCard(id){ setAll(allCards.filter(c=>c.id!==id)); writeLS(allCards); render(); await store.remove(id); }
let toastT;
function toast(text, act, fn){
  document.querySelector(".toast")?.remove(); clearTimeout(toastT);
  const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status");
  const sp=document.createElement("span"); sp.textContent=text; t.appendChild(sp);
  if(act){ const b=document.createElement("button"); b.type="button"; b.textContent=act; b.onclick=()=>{ t.remove(); fn(); }; t.appendChild(b); }
  // нажатие по самому уведомлению убирает его сразу (чтобы не мешало нажимать то, что под ним)
  t.addEventListener("click",e=>{ if(!e.target.closest("button")){ t.remove(); clearTimeout(toastT); } });
  document.body.appendChild(t); toastT=setTimeout(()=>t.remove(),4000);
}
function openTrash(){
  document.querySelector(".toast")?.remove();
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  const draw=()=>{
    const del=allCards.filter(c=>c.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);
    s.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Корзина">
      <h3 class="h-help">Корзина${qhelp("Корзина","Удалённые карты лежат здесь, пока ты сам не удалишь их навсегда.")}</h3>
      ${del.length?`<ul class="tlist">${del.map(c=>{
        return `<li class="titem"><span class="mini" style="${cardVars(c)};background-size:cover;background-position:center"></span><strong>${esc(c.bank)}${c.label?" · "+esc(c.label):""}</strong>
        <span>Удалена ${esc(relTime(c.deletedAt))}</span>
        <span class="ta"><button type="button" class="btn danger" data-purge="${c.id}">Удалить навсегда</button><button type="button" class="btn primary" data-restore="${c.id}">Восстановить</button></span></li>`; }).join("")}</ul>`
      : `<p class="hint">Корзина пуста</p>`}
      <div class="acts"><div></div><div><button type="button" class="btn ghost" data-x>Закрыть</button></div></div></div>`;
  };
  draw(); document.body.appendChild(s);
  s.addEventListener("click",async e=>{
    if(e.target===s||e.target.closest("[data-x]")) return s.remove();
    const r=e.target.closest("[data-restore]"); if(r){ await restoreCard(r.dataset.restore); toast("Карта вернулась в кошелёк"); draw(); if(!allCards.some(c=>c.deletedAt)) s.remove(); return; }
    const p=e.target.closest("[data-purge]"); if(p){
      if(!p.classList.contains("armed")){ p.classList.add("armed"); p.textContent="Точно? Вернуть будет нельзя"; return; }
      await purgeCard(p.dataset.purge); draw(); }
  });
  s.addEventListener("keydown",e=>{ if(e.key==="Escape") s.remove(); });
}
$("#trashBtn").addEventListener("click",openTrash);

/* ---------- палитра «Свой цвет» ---------- */
// Квадрат (насыщенность × яркость) + полоса оттенка + быстрые цвета. Карта-образец меняется вживую.
// Возвращает "#rrggbb" по «Готово» или null по «Отмена».
function hsv2hex(h,s,v){ const f=n=>{ const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); };
  return "#"+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join(""); }
function hex2hsv(hex){ const n=parseInt(hex.slice(1),16), r=(n>>16&255)/255, g=(n>>8&255)/255, b=(n&255)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0;
  if(d){ h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; if(h<0) h+=360; }
  return [h, mx?d/mx:0, mx]; }
const QUICK_COLORS=["#e8475a","#ff7a1a","#f5c518","#34c759","#00a3a3","#2f80ed","#5b3df5","#c13bd6","#ff5fa2","#8d6e63","#607d8b","#1d1d1f"];
function openColorPicker(start, bank){
  return new Promise(resolve=>{
    let [h,s,v]=hex2hsv(start);
    const sc=document.createElement("div"); sc.className="scrim"; sc.style.zIndex=700;
    sc.innerHTML=`<div class="sheet cp" role="dialog" aria-modal="true" aria-label="Свой цвет">
      <h3>Свой цвет</h3>
      <div class="cp-card" id="cpCard"><b>${esc(bank)}</b><span>до 5%</span></div>
      <div class="cp-sv" id="cpSv"><i class="cp-dot" id="cpSvDot"></i></div>
      <div class="cp-hue" id="cpHue"><i class="cp-dot" id="cpHueDot"></i></div>
      <div class="cp-quick" id="cpQuick">${QUICK_COLORS.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div>
      <div class="acts"><div></div><div><button type="button" class="btn ghost" id="cpCancel">Отмена</button><button type="button" class="btn primary" id="cpOk">Готово</button></div></div>
    </div>`;
    document.body.appendChild(sc);
    const sv=sc.querySelector("#cpSv"), hue=sc.querySelector("#cpHue");
    const draw=()=>{ const hex=hsv2hex(h,s,v);
      sv.style.setProperty("--hue",`hsl(${h} 100% 50%)`);
      sc.querySelector("#cpSvDot").style.cssText=`left:${s*100}%;top:${(1-v)*100}%;background:${hex}`;
      sc.querySelector("#cpHueDot").style.cssText=`left:${h/360*100}%;background:hsl(${h} 100% 50%)`;
      sc.querySelector("#cpCard").setAttribute("style",styleVars(hex));
      sc.querySelectorAll("[data-c]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.c===hex)); };
    const drag=(el,fn)=>el.addEventListener("pointerdown",e=>{ e.preventDefault(); el.setPointerCapture(e.pointerId);
      const at=ev=>{ const r=el.getBoundingClientRect(); fn(Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)), Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height))); draw(); };
      at(e); el.onpointermove=at; el.onpointerup=el.onpointercancel=()=>{ el.onpointermove=null; }; });
    drag(sv,(x,y)=>{ s=x; v=1-y; });
    drag(hue,x=>{ h=Math.min(359.9,x*360); });
    sc.querySelector("#cpQuick").onclick=e=>{ const b=e.target.closest("[data-c]"); if(!b) return; [h,s,v]=hex2hsv(b.dataset.c); draw(); };
    const done=val=>{ sc.remove(); resolve(val); };
    sc.querySelector("#cpCancel").onclick=()=>done(null);
    sc.querySelector("#cpOk").onclick=()=>done(hsv2hex(h,s,v));
    sc.addEventListener("click",e=>{ if(e.target===sc) done(null); });
    draw();
  });
}
