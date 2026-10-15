// Кешбекер — Аккаунт, хранение и синхронизация с Supabase, вход и регистрация, импорт/экспорт, запуск.
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

/* ---------- account ---------- */
let account={viewer:null,synced:false};
// экран загрузки убираем, когда понятно, что показывать: карты, гостевой режим или вход
const splashStart=Date.now(); let splashGone=false;
function hideSplash(){
  if(splashGone) return; splashGone=true;
  const wait=Math.max(0,700-(Date.now()-splashStart));   // не мигать: показываем хотя бы 0,7 с
  setTimeout(()=>{ const el=document.getElementById("splash"); if(!el) return; el.classList.add("out"); setTimeout(()=>el.remove(),400); },wait);
}
setTimeout(hideSplash,8000);   // на всякий случай, если сеть совсем не отвечает
function showGate(on){ if(on) hideSplash(); $("#gate").hidden=!on; $("#main").style.display=on?"none":"contents"; $("#addBtn").hidden=on; $("#acctBtn").hidden=on; }
$("#guestBtn").addEventListener("click",()=>{ if(lsGet(GUEST)!=="1") setAll([]); startGuest(); });
function drawAvatar(){ const b=$("#acctBtn"); b.hidden=false; fillAvatar(b); }
// своя аватарка хранится отдельной записью "_profile" рядом с картами
const PROFILE_ID="_profile";
const profileDoc=()=>allCards.find(c=>c.id===PROFILE_ID);
function fillAvatar(el){
  el.textContent="";
  const own=profileDoc()?.avatar;
  if(own){ const i=document.createElement("img"); i.alt=""; i.src=own; el.appendChild(i); }
  else {
  el.textContent = account.synced ? (account.viewer?.email||"?")[0].toUpperCase() : "?";
  }
  const del=el.id==="bigAv" && $("#avDel"); if(del) del.hidden=!own;
}
async function makeAvatar(file){
  let src;
  try{ src=await createImageBitmap(file,{imageOrientation:"from-image"}); }
  catch{ src=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); }); }
  const S=256, side=Math.min(src.width,src.height); if(!side) throw new Error("empty");
  const cv=document.createElement("canvas"); cv.width=S; cv.height=S;
  cv.getContext("2d").drawImage(src,(src.width-side)/2,(src.height-side)/2,side,side,0,0,S,S);
  return cv.toDataURL("image/jpeg",.85);
}
async function setAvatar(url){
  const doc={...(profileDoc()||{id:PROFILE_ID}), id:PROFILE_ID, avatar:url, updatedAt:Date.now()};
  putCard(doc); drawAvatar(); const big=$("#bigAv"); if(big) fillAvatar(big);
  await store?.save(doc);
}
function wireAvatar(sheet){
  $("#avFile").onchange=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; if(!f) return;
    try{ await setAvatar(await makeAvatar(f)); toast("Аватарка обновлена"); }catch{ toast("Не получилось открыть фото"); } };
  $("#avDel").onclick=()=>setAvatar(null);
}
$("#acctBtn").addEventListener("click",()=>{
  const v=account.viewer, s=document.createElement("div"); s.className="scrim"; s.id="scrim";
  s.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Аккаунт">
    <div class="acct"><label class="avatar big av-edit" id="bigAv" for="avFile" title="Сменить фото"></label><input class="vh" id="avFile" type="file" accept="image/*"><span class="av-acts"><label class="linkbtn" for="avFile">Сменить фото</label><button type="button" class="linkbtn" id="avDel" hidden>Убрать</button></span><strong id="acctName"></strong><span id="acctSub"></span></div>
    <p class="sync${account.synced?"":" off"}">${account.synced?`Синхронизировано · ${cards.length} ${plural(cards.length,["карта","карты","карт"])}`:"Карты хранятся только в этом браузере"}</p>
    <p class="note">${account.synced?"Твои карты видны только тебе, на любом устройстве, где ты вошёл. Если выйти, карты пропадут с этого устройства, но останутся в аккаунте — после входа они вернутся.":"Войди или зарегистрируйся, чтобы карты не потерялись и были на всех устройствах. Карты, добавленные без входа, можно перенести через «Сохранить в файл» и «Загрузить из файла»."}</p>
    <div class="acts"><div><button type="button" class="btn" id="exportBtn">Сохранить в файл</button><label class="btn" for="importFile">Загрузить из файла<input class="vh" id="importFile" type="file" accept="application/json,.json"></label></div></div>
    <div class="acts"><div>${account.synced?`<button type="button" class="btn danger" id="signOut">Выйти</button>`:`<button type="button" class="btn primary" id="toLogin">Войти</button>`}</div><div><button type="button" class="btn ghost" id="acctClose">Закрыть</button></div></div>
  </div>`;
  document.body.appendChild(s);
  $("#acctName").textContent = account.synced ? (v?.email||"Твой аккаунт") : "Гость";
  $("#acctSub").textContent = account.synced ? "Аккаунт Кешбекера" : "Ты не вошёл в аккаунт";
  fillAvatar($("#bigAv")); wireAvatar(s);
  s.addEventListener("click",e=>{ if(e.target===s||e.target.id==="acctClose") s.remove();
    if(e.target.id==="signOut"){ s.remove(); signOut(); }
    if(e.target.id==="toLogin"){ s.remove(); loginFromGuest(); }
    if(e.target.id==="exportBtn") exportCards(); });
  $("#importFile").onchange=async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; s.remove(); await importCards(f); };
  s.addEventListener("keydown",e=>{ if(e.key==="Escape") s.remove(); });
});
const plural=(n,f)=>f[(n%10===1&&n%100!==11)?0:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?1:2];

/* ---------- storage ---------- */
const LS="cashback-wallet-cache-v2";
const readLS=()=>{ try{ return JSON.parse(localStorage.getItem(LS)||"null"); }catch{ return null; } };
const writeLS=v=>{ try{ localStorage.setItem(LS,JSON.stringify(v)); }catch{} };
const setStatus=t=>$("#status").textContent=t;

const cached=readLS(); if(Array.isArray(cached)){ setAll(cached); }
render();

const SO="cashbacker-signedout", GUEST="cashbacker-guest";
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch{ return null; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch{} };
const lsDel=k=>{ try{ localStorage.removeItem(k); }catch{} };
let unsub=null, sb=null, session=null;
const CFG=window.KESHBEKER_CONFIG||{};

// таблица cards: одна строка = одна карта пользователя (id, user_id, data)
function makeCol(){
  const uid=session.user.id;
  return {
    doc:id=>({
      set:async c=>{ const {error}=await sb.from("cards").upsert({id, user_id:uid, data:c, updated_at:new Date().toISOString()}); if(error) throw error; },
      delete:async()=>{ const {error}=await sb.from("cards").delete().eq("user_id",uid).eq("id",id); if(error) throw error; }
    }),
    onSnapshot:(cb,err)=>{
      let alive=true;
      const pull=async()=>{ if(!alive) return; const {data,error}=await sb.from("cards").select("id,data").eq("user_id",uid);
        if(error){ err&&err(error); return; } if(alive) cb({docs:data.map(r=>({id:r.id,data:()=>r.data}))}); };
      pull();
      // обновляемся, когда приложение снова открыли, и раз в минуту
      const onVis=()=>{ if(document.visibilityState==="visible") pull(); };
      document.addEventListener("visibilitychange",onVis); const t=setInterval(pull,60000);
      return ()=>{ alive=false; document.removeEventListener("visibilitychange",onVis); clearInterval(t); };
    }
  };
}
function startSynced(){
  lsDel(GUEST);
  account={viewer:{email:session.user.email}, synced:true}; drawAvatar(); showGate(false); setStatus("");
  const col=makeCol();
  store={
    save:async c=>{ writeLS(allCards); try{ await col.doc(c.id).set(c); setStatus(""); }catch(e){ setStatus("Не сохранилось: "+(e?.message||"нет связи")+". Попробуй ещё раз."); } },
    remove:async id=>{ writeLS(allCards); try{ await col.doc(id).delete(); }catch(e){ setStatus("Не удалилось: "+(e?.message||"нет связи")); } }
  };
  render();
  unsub=col.onSnapshot(snap=>{
    setAll(applyOrderOverride(snap.docs.map(d=>({...d.data(),id:d.id}))));
    mergeGuest();
    applyRoll(); writeLS(allCards); drawAvatar(); hideSplash();
    if(editing) return; render();
  }, e=>setStatus("Нет связи с базой: "+(e.message||e)+". Проверь интернет или VPN."));
}
// карты, добавленные в гостевом режиме, переносятся в аккаунт при входе
let pendingMerge=null;
function mergeGuest(){
  if(!pendingMerge) return;
  const have=new Set(allCards.map(c=>c.id)); const add=pendingMerge.filter(c=>!have.has(c.id)); pendingMerge=null;
  let n=0;
  for(const c of add){ putCard(c); store.save(c); if(!String(c.id).startsWith("_") && !c.deletedAt) n++; }
  if(n) toast("Перенесено карт из гостевого режима: "+n);
}
function loginFromGuest(){
  $("#authForm").hidden=false; $("#resetForm").hidden=true; setAuthMode("in");
  showGate(true); setTimeout(()=>$("#authEmail").focus(),50);
}
function startGuest(){
  hideSplash();
  lsSet(GUEST,"1");
  account={viewer:null, synced:false}; drawAvatar(); showGate(false);
  store={ save:async()=>writeLS(allCards), remove:async()=>writeLS(allCards) };
  applyRoll(); writeLS(allCards); render();
  setStatus("Без входа карты хранятся только в этом браузере.");
}
async function signOut(){
  unsub?.(); unsub=null; store=null;
  lsDel(GUEST); lsDel(LS);
  setAll([]); selected=null; query=""; $("#q").value="";
  account={viewer:null, synced:false};
  render(); showGate(true); setStatus("");
  try{ await sb?.auth.signOut(); }catch{}
  session=null;
  toast("Ты вышел из Кешбекера");
}

/* ---------- вход и регистрация ---------- */
let authMode="in";
function setAuthMode(m){
  authMode=m;
  $("#authTabs").querySelectorAll("button").forEach(b=>b.setAttribute("aria-selected",b.dataset.mode===m));
  $("#authPass2").hidden = m!=="up"; $("#authPass2").required = m==="up";
  $("#authPass").autocomplete = m==="up" ? "new-password" : "current-password";
  $("#authSubmit").textContent = m==="up" ? "Зарегистрироваться" : "Войти";
  $("#forgotBtn").hidden = m==="up"; authMsg("");
}
function authMsg(t,kind){ const el=$("#authMsg"); el.textContent=t; el.className="auth-msg"+(kind?" "+kind:""); }
const ERR={
  "Invalid login credentials":"Неверная почта или пароль.",
  "Email not confirmed":"Почта ещё не подтверждена. Открой письмо от Кешбекера и нажми на ссылку.",
  "User already registered":"Такая почта уже зарегистрирована. Войди или восстанови пароль."
};
function ruErr(e){
  const m=e?.message||"";
  if(ERR[m]) return ERR[m];
  if(/password/i.test(m)) return "Пароль слишком простой: нужно минимум 6 символов.";
  if(/rate limit/i.test(m)) return "Слишком много попыток. Подожди пару минут.";
  if(/fetch|network/i.test(m) || !m) return "Нет связи с сервером. Проверь интернет или включи VPN.";
  return "Не получилось: "+m;
}
$("#authTabs").addEventListener("click",e=>{ const b=e.target.closest("[data-mode]"); if(b) setAuthMode(b.dataset.mode); });
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!sb) return authMsg("Сайт ещё не подключён к базе. Заполни config.js.","err");
  const email=$("#authEmail").value.trim(), pass=$("#authPass").value;
  if(authMode==="up" && pass!==$("#authPass2").value) return authMsg("Пароли не совпадают.","err");
  const btn=$("#authSubmit"); btn.disabled=true; authMsg(authMode==="up"?"Регистрирую…":"Вхожу…");
  try{
    if(authMode==="up"){
      const {data,error}=await sb.auth.signUp({email,password:pass,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error) throw error;
      if(!data.session) authMsg("Готово! Мы отправили письмо на "+email+". Открой его и нажми на ссылку, чтобы подтвердить почту.","ok");
    } else {
      const {error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error) throw error;
    }
  }catch(err){ authMsg(ruErr(err),"err"); }
  btn.disabled=false;
});
$("#forgotBtn").addEventListener("click",async()=>{
  const email=$("#authEmail").value.trim();
  if(!email) return authMsg("Впиши почту, и я пришлю ссылку для смены пароля.","err");
  if(!sb) return;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  authMsg(error?ruErr(error):"Письмо со ссылкой для смены пароля отправлено на "+email+".", error?"err":"ok");
});
$("#resetForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const {error}=await sb.auth.updateUser({password:$("#newPass").value});
  const m=$("#resetMsg"); m.textContent=error?ruErr(error):"Пароль изменён"; m.className="auth-msg "+(error?"err":"ok");
  if(!error){ $("#resetForm").hidden=true; $("#authForm").hidden=false; $("#guestBtn").hidden=false; if(session) startSynced(); }
});

/* ---------- файл с картами ---------- */
function exportCards(){
  const blob=new Blob([JSON.stringify({app:"keshbeker",version:1,exportedAt:new Date().toISOString(),cards:allCards},null,1)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="keshbeker-cards.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
async function importCards(file){
  try{
    const j=JSON.parse(await file.text()); const list=Array.isArray(j)?j:j.cards;
    if(!Array.isArray(list)) throw new Error("bad");
    let n=0;
    for(const raw of list){
      if(!raw||!raw.id) continue;
      const c={...raw}; putCard(c); await store?.save(c);
      if(!String(c.id).startsWith("_") && !c.deletedAt) n++;
    }
    render(); toast("Загружено карт: "+n);
  }catch{ toast("Не получилось прочитать файл"); }
}

setAuthMode("in");
const cfgBad = !CFG.url || !CFG.key || /ВСТАВЬ/.test(CFG.url+CFG.key) || /\/rest\/v1/.test(CFG.url);
if(!window.supabase || cfgBad){
  if(lsGet(GUEST)==="1") startGuest(); else showGate(true);
  authMsg(!window.supabase ? "Не загрузилась библиотека входа. Проверь интернет или включи VPN и обнови страницу."
    : !window.KESHBEKER_CONFIG ? "Не загрузился config.js или в нём ошибка. Проверь, что файл загружен на сайт и кавычки в нём прямые \"…\", а не «…» или “…”."
    : /ВСТАВЬ/.test(CFG.url+CFG.key) ? "В config.js остался текст ВСТАВЬ_СЮДА — впиши туда адрес проекта и ключ anon public."
    : /\/rest\/v1/.test(CFG.url) ? "В config.js адрес проекта нужно указать без /rest/v1/ на конце."
    : "Сайт ещё не подключён к базе. Заполни config.js.","err");
} else {
  sb=window.supabase.createClient(CFG.url, CFG.key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let started=false;
  sb.auth.onAuthStateChange((event, sess)=>{
    session=sess;
    if(event==="PASSWORD_RECOVERY"){ showGate(true); $("#authForm").hidden=true; $("#resetForm").hidden=false; $("#guestBtn").hidden=true; return; }
    if(sess && !started && $("#resetForm").hidden){ started=true; setTimeout(()=>{
      if(lsGet(GUEST)==="1") pendingMerge=(readLS()||[]).slice(); else setAll(readLS()||[]);
      startSynced(); },0); }
    if(!sess) started=false;
  });
  sb.auth.getSession().then(({data})=>{
    if(!data.session){ if(lsGet(GUEST)==="1") startGuest(); else showGate(true); }
  });
}
