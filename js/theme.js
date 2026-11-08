// Кешбекер — светлая и тёмная тема.
// Пока человек не выбрал сам, тема следует настройке телефона. После переключения выбор
// запоминается на этом устройстве (ставится ещё до загрузки стилей — см. <head> в index.html).

const THEME_KEY = "keshbeker-theme";
const darkMQ = matchMedia("(prefers-color-scheme: dark)");

function currentTheme(){
  const t = document.documentElement.dataset.theme;
  return t === "dark" || t === "light" ? t : (darkMQ.matches ? "dark" : "light");
}
function syncThemeUI(){
  const dark = currentTheme() === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach(el => el.setAttribute("aria-checked", String(dark)));
  // цвет строки состояния на телефоне
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", dark ? "#0d0f12" : "#e8ebf0"));
}
function setTheme(t){
  document.documentElement.dataset.theme = t;
  try{ localStorage.setItem(THEME_KEY, t); }catch{}
  syncThemeUI();
}
// переключатель «день/ночь»: днём солнце справа на голубом небе с облаками,
// ночью луна слева на тёмном небе со звёздами. Подписи нет — смысл понятен по картинке.
function themeSwitchHTML(){
  return `<button type="button" class="tswitch" role="switch" aria-label="Тёмная тема" aria-checked="${currentTheme()==="dark"}" data-theme-toggle>
    <span class="ts-sky" aria-hidden="true"></span>
    <span class="ts-stars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <svg class="ts-clouds day" viewBox="0 0 80 24" aria-hidden="true"><g fill="#fff" fill-opacity=".45"><circle cx="6" cy="22" r="9"/><circle cx="18" cy="17" r="8"/><circle cx="31" cy="21" r="8"/><circle cx="43" cy="24" r="7"/></g><g fill="#fff" fill-opacity=".75"><circle cx="2" cy="25" r="7"/><circle cx="14" cy="23" r="6"/><circle cx="26" cy="25" r="6"/><circle cx="37" cy="27" r="5"/></g></svg>
    <svg class="ts-clouds night" viewBox="0 0 80 24" aria-hidden="true"><g fill="#9aa1ab"><circle cx="40" cy="25" r="7"/><circle cx="52" cy="21" r="8"/><circle cx="65" cy="17" r="9"/><circle cx="78" cy="14" r="9"/></g><g fill="#d4d8de"><circle cx="48" cy="27" r="5"/><circle cx="59" cy="25" r="6"/><circle cx="71" cy="22" r="7"/><circle cx="82" cy="20" r="7"/></g></svg>
    <span class="ts-knob" aria-hidden="true"><span class="ts-moon"></span></span>
  </button>`;
}
// вставить переключатель во все места с data-theme-slot (экран входа)
document.querySelectorAll("[data-theme-slot]").forEach(el => { el.innerHTML = themeSwitchHTML(); });

document.addEventListener("click", e => {
  if(!e.target.closest("[data-theme-toggle]")) return;
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});
darkMQ.addEventListener("change", syncThemeUI);
syncThemeUI();

// свежая версия сайта при каждом открытии (см. sw.js)
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});

// Liquid Glass при нажатии: кнопка раздувается, в месте касания светится, и чуть тянется за пальцем
document.addEventListener("pointerdown", e => {
  const b = e.target.closest(".btn"); if(!b || b.disabled) return;
  const r = b.getBoundingClientRect();
  const at = ev => { b.style.setProperty("--x", (ev.clientX - r.left) + "px"); b.style.setProperty("--y", (ev.clientY - r.top) + "px"); };
  at(e); b.classList.add("down");
  const mv = ev => { at(ev); const dx = Math.max(-4, Math.min(4, (ev.clientX - e.clientX) / 8)), dy = Math.max(-3, Math.min(3, (ev.clientY - e.clientY) / 8)); b.style.translate = `${dx}px ${dy}px`; };
  const up = () => { b.classList.remove("down"); b.style.translate = ""; removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
});

// Переключатели в стиле Liquid Glass: «Карты/Магазины» (.tabs) и все .seg.
// Плашка выбора движется на пружине (с небольшим перелётом), а не по таймеру:
//  • касание — плашка поднимается: становится прозрачной линзой, раздувается, буквы под ней крупнее;
//  • её можно тащить пальцем между кнопками, при отпускании выбирается ближайшая;
//  • в движении тянется по ходу и сплющивается по высоте, остановилась — опускается и заливается цветом.
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
function glassSwitch(root){
  if(root._gs) return; root._gs = true; root.classList.add("gs");
  let pill = root.querySelector(":scope > .gpill");
  if(!pill){ pill = document.createElement("span"); pill.className = "gpill seg-pill"; pill.setAttribute("aria-hidden","true"); root.prepend(pill); }
  const isTabs = root.classList.contains("tabs");
  // параметры как у системного переключателя iOS 26: линза поднимается до ~×1.12, переезд — пружина
  // response 0.5 с, затухание 0.82 (SwiftUI .smooth), за пальцем — response 0.16 с; растяжение по скорости — не больше 6 %
  const LIFT = isTabs ? 0.12 : 0.07;
  const spring = (response, damping) => [(2 * Math.PI / response) ** 2, 4 * Math.PI * damping / response];
  const MOVE = spring(0.5, 0.82), FOLLOW = spring(0.16, 1), LIFTS = spring(0.32, 0.86);
  const btns = () => [...root.querySelectorAll(":scope > button")];
  let x = 0, v = 0, tx = 0, w = 0, tw = 0, l = 0, lv = 0, pressed = false, drag = null, raf = 0, last = 0, placed = false;
  const selBtn = () => btns().find(b => b.getAttribute("aria-selected") === "true");
  function aim(b, instant){
    if(!b || !b.offsetWidth) return false;
    tx = b.offsetLeft; tw = b.offsetWidth;
    if(instant || !placed || reduceMotion.matches){ x = tx; w = tw; v = 0; placed = true; draw(); return true; }
    kick(); return true;
  }
  function draw(){
    const sp = Math.min(Math.abs(v) / 6000, 0.06);            // лёгкое растяжение по ходу движения
    const sx = 1 + l * LIFT + sp, sy = 1 + l * LIFT - sp * 0.5;
    pill.style.width = w + "px";
    pill.style.transform = `translateX(${x}px) scale(${sx},${sy})`;
    pill.style.setProperty("--l", l.toFixed(3));
    const c = x + w / 2;
    btns().forEach(b => {                                        // «лупа»: буквы под линзой чуть крупнее
      const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - c) / b.offsetWidth;
      const m = 1 + 0.06 * l * Math.max(0, 1 - d);
      b.style.scale = m > 1.001 ? m.toFixed(3) : "";
    });
  }
  function step(t){
    const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016; last = t;
    const goal = drag ? drag.x : tx;
    const [k, c] = drag ? FOLLOW : MOVE;
    v += (k * (goal - x) - c * v) * dt; x += v * dt;
    w += (tw - w) * Math.min(1, dt * 10);
    const moving = Math.abs(goal - x) > 0.5 || Math.abs(v) > 15;
    const lt = (pressed || moving) ? 1 : 0;
    lv += (LIFTS[0] * (lt - l) - LIFTS[1] * lv) * dt; l += lv * dt; l = Math.max(0, Math.min(1.04, l));
    if(!moving && !pressed && Math.abs(l) < 0.01 && Math.abs(lv) < 0.05){ x = tx; v = 0; l = 0; lv = 0; draw(); raf = 0; last = 0; return; }
    draw(); raf = requestAnimationFrame(step);
  }
  function kick(){ if(!raf){ last = 0; raf = requestAnimationFrame(step); } }
  function nearest(px){ let best = null, bd = 1e9; btns().forEach(b => { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - px); if(d < bd){ bd = d; best = b; } }); return best; }
  const rel = e => e.clientX - root.getBoundingClientRect().left;
  root.addEventListener("pointerdown", e => {
    const b = e.target.closest("button"); if(!b || b.parentElement !== root || reduceMotion.matches || !placed) return;
    pressed = true; drag = null; root._start = rel(e); root._moved = false;
    if(b !== selBtn()){ tx = b.offsetLeft; tw = b.offsetWidth; }  // линза сразу едет туда, куда нажали
    kick();
    const mv = ev => {
      const px = rel(ev);
      if(!root._moved && Math.abs(px - root._start) < 6) return;
      root._moved = true;
      const lo = btns()[0].offsetLeft, hi = btns().at(-1).offsetLeft + btns().at(-1).offsetWidth - w;
      drag = { x: Math.max(lo - 8, Math.min(hi + 8, px - w / 2)) };
      const n = nearest(px); tw = n.offsetWidth; kick();
    };
    const up = ev => {
      removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      pressed = false;
      if(drag){
        const n = nearest(drag.x + w / 2); drag = null;
        // клик выбранной кнопке, а «случайный» клик после перетаскивания гасим
        root.addEventListener("click", ce => { if(!ce._gs){ ce.stopPropagation(); ce.preventDefault(); } }, { capture: true, once: true });
        setTimeout(() => { const ce = new MouseEvent("click", { bubbles: true }); ce._gs = true; n.dispatchEvent(ce); }, 0);
        tx = n.offsetLeft; tw = n.offsetWidth;
      } else if(ev.type === "pointercancel"){ aim(selBtn()); }
      kick();
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  new MutationObserver(() => aim(selBtn())).observe(root, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  new ResizeObserver(() => aim(selBtn(), true)).observe(root);
  aim(selBtn(), true);
}
function watchSwitches(node){
  if(node.nodeType !== 1) return;
  if(node.matches(".seg, .tabs")) glassSwitch(node);
  node.querySelectorAll(".seg, .tabs").forEach(glassSwitch);
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(watchSwitches))).observe(document.body, { childList: true, subtree: true });
watchSwitches(document.body);
