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
      <div class="fl"><label for="edLabel">Подпись</label><input class="in" id="edLabel" maxlength="20" placeholder="Black или •• 4417" value="${esc(editing.label)}"></div>
    </div>
    <div class="fl"><span class="lab">Фото карты</span>
      <div class="ph"><div class="ph-prev" id="edPhPrev" aria-hidden="true"></div>
        <div class="ph-btns">
          <label class="btn" for="edCam">Сфотографировать<input class="vh" id="edCam" type="file" accept="image/*" capture="environment"></label>
          <label class="btn" for="edGal">Из галереи<input class="vh" id="edGal" type="file" accept="image/*"></label>
          <button type="button" class="btn ghost" id="edPhDel" hidden>Убрать фото</button>
        </div></div>
      <p class="note" style="margin:0">Сфотографируй лицевую сторону карты. Номер лучше прикрыть пальцем. Фото видно только тебе.</p>
    </div>
    <div class="fl"><span class="lab" id="edColorLab">Цвет</span><div class="sw" id="edSw">${Object.entries(STYLES).map(([k,v])=>`<button type="button" data-st="${k}" style="${styleVars(k)}" aria-label="${v.name}" aria-pressed="${k===editing.style}"></button>`).join("")}</div></div>
    <div class="fl"><span class="lab">Кешбек</span>
      <div class="seg" role="tablist" id="edSeg"><button type="button" role="tab" data-tab="cur">Сейчас<small>${esc(monthOnly(nowMonth()))}</small></button><button type="button" role="tab" data-tab="next">Следующий<small>${esc(monthOnly(addMonth(nowMonth())))}</small></button></div>
      <p class="note" id="edTabNote" style="margin:0"></p>
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
  const setTab=t=>{ syncRows(); tab=t; $("#edSeg").querySelectorAll("button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
    $("#edTabNote").textContent = t==="cur" ? `Кешбек, который действует сейчас, в ${monthOnly(nowMonth())}.` : `Выбери категории на ${monthOnly(nm)} заранее. 1 ${genMonth(nm)} они сами станут текущими.`;
    $("#edCopy").hidden = t==="cur"; $("#edClearNext").hidden = t==="cur" || editing.next.draft; drawRows(); };
  $("#edSeg").onclick=e=>{const b=e.target.closest("[data-tab]"); if(b) setTab(b.dataset.tab);};
  $("#edCopy").onclick=()=>{ editing.next.items=(editing.items||[]).map(i=>({...i})); editing.next.draft=false; drawRows(); };
  $("#edClearNext").onclick=()=>{ editing.next={month:nm,items:[{n:"",p:5},...(editing.items||[]).filter(i=>isBase(i.n)).map(i=>({...i}))],draft:true,cleared:true}; setTab("next"); };
  setTab(tab);
  setTimeout(()=>$("#edBank").focus(),50);
  s.addEventListener("click",e=>{ if(e.target===s) closeEditor(); });
  $("#edCancel").onclick=closeEditor;
  $("#edSw").onclick=e=>{const b=e.target.closest("[data-st]"); if(!b)return; editing.style=b.dataset.st; editing.custom=null; $("#edSw").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); drawPhoto();};
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
  document.body.appendChild(t); toastT=setTimeout(()=>t.remove(),6000);
}
function openTrash(){
  document.querySelector(".toast")?.remove();
  const s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  const draw=()=>{
    const del=allCards.filter(c=>c.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);
    s.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Корзина">
      <h3>Корзина</h3>
      <p class="note" style="margin:0">Удалённые карты лежат здесь, пока ты сам не удалишь их навсегда.</p>
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
