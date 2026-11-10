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
// Плашка выбора движется на пружине, как системный переключатель iOS 26:
//  • касание — плашка поднимается: становится прозрачной линзой с бликом, чуть раздувается, буквы под ней крупнее;
//  • её можно тащить пальцем между кнопками, при отпускании выбирается ближайшая;
//  • в движении слегка тянется по ходу, остановилась — опускается и снова заливается цветом.
// Чтобы не было рывков, весь путь пружины после отпускания заранее просчитывается и отдаётся браузеру как
// готовая анимация (Web Animations). Её рисует видеокарта с частотой экрана, и она не подтормаживает,
// даже когда в этот момент страница перерисовывает раздел. Покадрово в JS — только пока палец на экране.
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const spring = (response, damping) => [(2 * Math.PI / response) ** 2, 4 * Math.PI * damping / response];
const SP_MOVE = spring(0.5, 0.82), SP_FOLLOW = spring(0.16, 1), SP_LIFT = spring(0.32, 0.86);
const SIM_DT = 1 / 120;
function glassSwitch(root){
  if(root._gs) return; root._gs = true; root.classList.add("gs");
  let pill = root.querySelector(":scope > .gpill");
  if(!pill){ pill = document.createElement("span"); pill.className = "gpill seg-pill"; pill.setAttribute("aria-hidden","true"); root.prepend(pill); }
  pill.innerHTML = '<i class="gp-fill"></i><i class="gp-glass"></i>';
  const fill = pill.firstChild, glass = pill.lastChild;
  const LIFT = root.classList.contains("tabs") ? 0.12 : 0.07;
  const btns = () => [...root.querySelectorAll(":scope > button")];
  const selBtn = () => btns().find(b => b.getAttribute("aria-selected") === "true");
  let geo = [];                                   // размеры кнопок — меряем заранее, не в каждом кадре
  const measure = () => { geo = btns().map(b => ({ b, c: b.offsetLeft + b.offsetWidth / 2, w: b.offsetWidth })); };
  let st = { x: 0, v: 0, l: 0, lv: 0 }, tx = 0, w = 0, pressed = false, drag = null, raf = 0, last = 0, placed = false, wa = null;

  // как выглядит плашка в данном состоянии
  function look(s){
    const sp = Math.min(Math.abs(s.v) / 6000, 0.06), l = Math.max(0, Math.min(1, s.l));
    const c = s.x + w / 2;
    return {
      transform: `translateX(${s.x.toFixed(2)}px) scale(${(1 + s.l * LIFT + sp).toFixed(4)},${(1 + s.l * LIFT - sp * 0.5).toFixed(4)})`,
      fill: 1 - l, glass: l,
      scales: geo.map(g => 1 + 0.06 * l * Math.max(0, 1 - Math.abs(g.c - c) / g.w))
    };
  }
  function draw(){
    const k = look(st);
    pill.style.width = w + "px"; pill.style.transform = k.transform;
    fill.style.opacity = k.fill; glass.style.opacity = k.glass;
    geo.forEach((g, i) => { g.b.style.scale = k.scales[i] > 1.001 ? k.scales[i].toFixed(3) : ""; });
  }
  // один шаг пружины
  function physics(s, dt, goal, hold, [k, c]){
    s.v += (k * (goal - s.x) - c * s.v) * dt; s.x += s.v * dt;
    const moving = Math.abs(goal - s.x) > 1.5 || Math.abs(s.v) > 40;
    s.lv += (SP_LIFT[0] * ((hold || moving) ? 1 : 0) - SP_LIFT[0] * s.l - SP_LIFT[1] * s.lv) * dt; s.l += s.lv * dt;
    s.l = Math.max(0, Math.min(1.04, s.l));
    return moving;
  }
  // где сейчас плашка, если идёт заранее посчитанная анимация
  function stopAnim(){
    if(!wa) return;
    const i = Math.min(wa.frames.length - 1, Math.max(0, Math.floor((performance.now() - wa.t0) / 1000 / SIM_DT)));
    st = { ...wa.frames[i] }; wa.anims.forEach(a => a.cancel()); wa = null; draw();
  }
  // просчитать путь до места и запустить готовой анимацией
  function play(){
    stopAnim(); if(raf){ cancelAnimationFrame(raf); raf = 0; }
    const frames = [{ ...st }], s = { ...st };
    for(let n = 0; n < 240; n++){
      const moving = physics(s, SIM_DT, tx, false, SP_MOVE);
      frames.push({ ...s });
      if(!moving && s.l < 0.004 && Math.abs(s.lv) < 0.05) break;
    }
    st = { x: tx, v: 0, l: 0, lv: 0 };
    if(frames.length < 3 || reduceMotion.matches){ draw(); return; }
    const looks = frames.map(look), dur = (frames.length - 1) * SIM_DT * 1000;
    draw();                                       // конечное состояние — под анимацией
    const opt = { duration: dur, easing: "linear" };
    const anims = [
      pill.animate(looks.map(k => ({ transform: k.transform })), opt),
      fill.animate(looks.map(k => ({ opacity: k.fill })), opt),
      glass.animate(looks.map(k => ({ opacity: k.glass })), opt),
      ...geo.map((g, i) => g.b.animate(looks.map(k => ({ scale: String(k.scales[i]) })), opt))
    ];
    const me = wa = { anims, frames, t0: performance.now() };
    anims[0].finished.then(() => { if(wa === me) wa = null; }).catch(() => {});
  }
  // покадрово — только пока палец на кнопке или тащит плашку
  function step(t){
    const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016; last = t;
    if(!pressed && !drag){ raf = 0; last = 0; play(); return; }
    physics(st, dt, drag ? drag.x : tx, true, drag ? SP_FOLLOW : SP_MOVE);
    draw(); raf = requestAnimationFrame(step);
  }
  function live(){ stopAnim(); if(!raf){ last = 0; raf = requestAnimationFrame(step); } }
  function aim(b, instant){
    if(!b || !b.offsetWidth) return;
    measure(); tx = b.offsetLeft; w = b.offsetWidth;
    if(instant || !placed || reduceMotion.matches){ stopAnim(); st = { x: tx, v: 0, l: 0, lv: 0 }; placed = true; draw(); return; }
    if(pressed || drag) live(); else play();
  }
  function nearest(px){ let best = null, bd = 1e9; geo.forEach(g => { const d = Math.abs(g.c - px); if(d < bd){ bd = d; best = g.b; } }); return best; }
  const rel = e => e.clientX - root.getBoundingClientRect().left;
  root.addEventListener("pointerdown", e => {
    const b = e.target.closest("button"); if(!b || b.parentElement !== root || reduceMotion.matches || !placed) return;
    measure(); pressed = true; drag = null;
    const start = rel(e), lo = geo[0].c - geo[0].w / 2, hi = geo.at(-1).c + geo.at(-1).w / 2;
    tx = b.offsetLeft;                            // линза сразу едет туда, куда нажали
    live();
    const mv = ev => {
      const px = rel(ev);
      if(!drag && Math.abs(px - start) < 6) return;
      drag = { x: Math.max(lo - 8, Math.min(hi - w + 8, px - w / 2)) };
    };
    const up = ev => {
      removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      pressed = false;
      let pick = null;
      if(drag){ pick = nearest(drag.x + w / 2); drag = null; }
      else if(ev.type === "pointerup"){
        const r = root.getBoundingClientRect();
        if(ev.clientX >= r.left - 10 && ev.clientX <= r.right + 10 && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20) pick = nearest(rel(ev));
      }
      if(pick){
        // выбираем кнопку сами, по отпусканию пальца. Обычный «клик» браузера тут не годится: если страница
        // ещё прокручивалась по инерции, айфон тратит касание на остановку прокрутки и клика не присылает —
        // плашка уезжала, а раздел не переключался
        tx = pick.offsetLeft;
        const ce = new MouseEvent("click", { bubbles: true }); ce._gs = true; pick.dispatchEvent(ce);
      } else { const sb = selBtn(); if(sb) tx = sb.offsetLeft; }
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  root.addEventListener("click", e => { if(!e._gs && e.detail > 0 && placed && !reduceMotion.matches){ e.stopPropagation(); e.preventDefault(); } }, true);
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

// Плавная смена содержимого внутри окна (вкладки «Сейчас/Следующий»): поверх блока, начиная с элемента top,
// проявляется «шторка» цвета окна, под ней всё меняется, затем шторка растворяется.
// Сами блоки прозрачность не меняют: Safari на айфоне такие анимации пропускает, а стеклянные кнопки
// внутри полупрозрачного блока рисует с артефактами.
function curtainSwap(box, top, swap, isCurrent = () => true, t = { out: 120, gap: 40, in: 220 }){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ swap(); return; }
  let c = box.querySelector(":scope > .box-curtain");
  if(!c){ c = document.createElement("div"); c.className = "box-curtain"; c.setAttribute("aria-hidden","true"); box.appendChild(c); }
  c.style.top = (top.offsetTop - 2) + "px";
  const from = c._a ? +getComputedStyle(c).opacity : 0;
  c._a?.cancel();
  const a = c._a = c.animate([{ opacity: from }, { opacity: 1 }], { duration: t.out * (1 - from), easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
  a.finished.then(() => {
    if(!isCurrent()) return;
    swap();
    const b = c._a = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.in, delay: t.gap, easing: "cubic-bezier(0,0,.2,1)", fill: "both" });
    a.cancel();
    b.finished.then(() => { if(c._a === b){ b.cancel(); c._a = null; } }).catch(() => {});
  }).catch(() => {});
}

// Подсказка по кнопке «?»: стеклянное окошко с заголовком, текстом и «OK» посреди экрана.
// Пока оно открыто, остальное не нажимается (фон чуть притемнён); закрыть можно только кнопкой «OK».
function helpPop(anchor, title, text){
  if(document.querySelector(".hpop-catch")) return;   // одна подсказка за раз
  const catcher = document.createElement("div"); catcher.className = "hpop-catch";
  const pop = document.createElement("div"); pop.className = "hpop"; pop.setAttribute("role","alertdialog"); pop.setAttribute("aria-modal","true"); pop.setAttribute("aria-label", title);
  pop.innerHTML = `<strong></strong><p></p><button type="button" class="btn">OK</button>`;
  pop.querySelector("strong").textContent = title; pop.querySelector("p").textContent = text;
  catcher.appendChild(pop); document.body.appendChild(catcher);
  anchor?.setAttribute("aria-expanded", "true");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!reduce){
    catcher.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    pop.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1.05)" });
  }
  let closing = false;
  const close = () => {
    if(closing) return; closing = true; anchor?.setAttribute("aria-expanded", "false"); unlock();
    if(reduce){ catcher.remove(); return; }
    catcher.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in", fill: "forwards" });
    const an = pop.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 170, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    an.finished.then(() => catcher.remove()).catch(() => catcher.remove());
  };
  pop.querySelector(".btn").addEventListener("click", close);
  // нажатия мимо окошка никуда не проходят, и страница под ним не листается (айфон иначе прокручивает фон пальцем)
  catcher.addEventListener("click", e => e.stopPropagation());
  const stop = e => e.preventDefault();
  catcher.addEventListener("touchmove", stop, { passive: false });
  catcher.addEventListener("wheel", stop, { passive: false });
  const locked = [document.documentElement, document.body, ...document.querySelectorAll(".sheet")];
  const prevOv = locked.map(el => el.style.overflow);
  locked.forEach(el => { el.style.overflow = "hidden"; });
  const unlock = () => locked.forEach((el, i) => { el.style.overflow = prevOv[i]; });
  pop.querySelector(".btn").focus({ preventScroll: true });
}

// кнопка «?» рядом с заголовком: по нажатию — подсказка посреди экрана (helpPop)
const qhelp = (title, text) => `<button type="button" class="qhelp" data-qhelp data-t="${esc(title)}" data-x="${esc(text)}" aria-label="Подсказка: ${esc(title)}" aria-expanded="false">?</button>`;
document.addEventListener("click", e => {
  const b = e.target.closest("[data-qhelp]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  helpPop(b, b.dataset.t, b.dataset.x);
}, true);

// Пока открыто любое окно (редактор, профиль, магазин, корзина…), страница под ним не листается.
function syncScrollLock(){
  const open = !!document.querySelector(".scrim, .hpop-catch");
  document.documentElement.classList.toggle("scroll-lock", open);
}
new MutationObserver(syncScrollLock).observe(document.body, { childList: true });
// палец на затемнённом фоне вокруг окна — ничего не прокручиваем
document.addEventListener("touchmove", e => {
  if(e.target.classList?.contains("scrim") || e.target.classList?.contains("hpop-catch")) e.preventDefault();
}, { passive: false });
syncScrollLock();
