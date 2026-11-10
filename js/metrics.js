// Кешбекер — аналитика (Яндекс Метрика: посещения, Вебвизор, карта кликов, события).
// track("событие") — отметить действие человека; если Метрика не загрузилась, ничего не ломается.
// Личное не отправляем: почта на экране и всё, что вводят в поля, скрыто от записи Вебвизора.

const YM_ID = 114174613;
(function(m,e,t,r,i,k,a){ m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)}; m[i].l=1*new Date();
  for(var j=0;j<document.scripts.length;j++){ if(document.scripts[j].src===r) return; }
  k=e.createElement(t); a=e.getElementsByTagName(t)[0]; k.async=1; k.src=r; a.parentNode.insertBefore(k,a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(YM_ID, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });

function track(goal, params){ try{ ym(YM_ID, "reachGoal", goal, params); }catch{} }
// раздел как отдельная «страница» — чтобы видеть время в Картах и в Магазинах
function trackPage(name){ try{ ym(YM_ID, "hit", location.pathname + "#" + name, { title: name }); }catch{} }
// один и тот же человек между заходами: номер аккаунта (не почта) или случайный номер этого устройства
function trackUser(id){ try{ ym(YM_ID, "setUserID", String(id)); ym(YM_ID, "userParams", { UserID: String(id) }); }catch{} }
function deviceId(){
  try{ let d = localStorage.getItem("cashbacker-device"); if(!d){ d = "d-" + Math.random().toString(36).slice(2, 12); localStorage.setItem("cashbacker-device", d); } return d; }
  catch{ return "d-unknown"; }
}

// Вебвизор не записывает, что человек печатает в полях
const hideKeys = root => root.querySelectorAll?.("input, textarea").forEach(el => el.classList.add("ym-disable-keys"));
hideKeys(document);
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if(n.nodeType === 1){ if(n.matches("input, textarea")) n.classList.add("ym-disable-keys"); hideKeys(n); } })))
  .observe(document.documentElement, { childList: true, subtree: true });

// что ищут (без привязки к человеку): отправляем запрос, когда человек перестал печатать
let searchT = 0;
document.addEventListener("input", e => {
  const id = e.target.id; if(id !== "q" && id !== "shopQ") return;
  clearTimeout(searchT);
  const q = e.target.value.trim(); if(q.length < 2) return;
  searchT = setTimeout(() => track(id === "q" ? "search_cashback" : "search_product", { q: q.slice(0, 40) }), 1500);
});
