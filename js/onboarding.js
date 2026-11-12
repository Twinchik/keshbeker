// Кешбекер — помощь новичкам.
// 1) Приветствие: три коротких экрана при самом первом входе.
// 2) Быстрый выбор банка в новой карте (название + цвет одним нажатием) — разметка в editor.js.
// 3) Подсказки категорий под строкой, пока человек вводит категорию.
// 4) Короткий тур по экрану после первой добавленной карты.
// 5) Первая карта вместе: пошаговые подсказки прямо в окне новой карты (банк → скриншот → проценты → сохранить).

const WELCOME_KEY = "cashbacker-welcomed", TOUR_KEY = "cashbacker-toured", GUIDE_KEY = "cashbacker-guided";
const lsHas = k => { try{ return !!localStorage.getItem(k); }catch{ return true; } };   // нет доступа к хранилищу — не навязываемся
const lsMark = k => { try{ localStorage.setItem(k, "1"); }catch{} };
const reduceMo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const realCards = () => cards.filter(c => c.id !== LOOSE_ID && !c.sample);

/* ---------- 1. приветствие ----------
   Показываем, только если на этом устройстве его ещё не видели и человек действительно новичок:
   гость — или аккаунт без карт и без пометки «видел» (пометка хранится в аккаунте, видна со всех устройств). */
function maybeWelcome(){
  if(lsHas(WELCOME_KEY) || document.querySelector(".welcome")) return;
  if(account?.synced && (realCards().length || looseDoc().welcomed)){ lsMark(WELCOME_KEY); return; }
  showWelcome();
}
function showWelcome(){
  const slides = [
    { art: `<div class="wa-fan"><div class="wa-card c1" style="--bg:linear-gradient(135deg,#ffe259,#ffa751)"><b>Т-Банк</b><span>25%</span><i class="wa-chip"></i><em></em><em></em></div><div class="wa-card c2" style="--bg:linear-gradient(135deg,#ff5f6d,#c2185b)"><b>Альфа</b><span>15%</span><i class="wa-chip"></i><em></em><em></em></div><div class="wa-card c3" style="--bg:linear-gradient(135deg,#4facfe,#3a47d5)"><b>Озон</b><span>50%</span><i class="wa-chip"></i><em></em><em></em></div></div>`,
      t: "Все карты в одном месте", d: "Добавь свои карты и кешбек на этот месяц." },
    { art: `<div class="wa-find"><div class="wa-q"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>Пятёрочка<i class="wa-caret"></i></div>
        <div class="wa-pick"><div class="wa-card dim d1" style="--bg:linear-gradient(135deg,#43e97b,#1e9e57)"><b>Сбер</b><span>5%</span><i class="wa-chip"></i><em></em><em></em></div><div class="wa-card best" style="--bg:linear-gradient(135deg,#ff5f6d,#c2185b)"><b>Альфа</b><i class="wa-chip"></i><em></em><em></em></div><span class="wa-badge">10%</span></div></div>`,
      t: "Лучшая карта — первой", d: "Напиши категорию или сразу магазин, например «Пятёрочка», — нужная карта встанет вперёд." },
    { art: `<div class="wa-shopart"><div class="wa-lc" style="--bg:linear-gradient(135deg,#a8e063,#2e9d4f)"><b>Пятёрочка</b><span>10%</span></div>
        <div class="wa-tags"><span style="--t:#ff9f43">Овощи <b>15%</b></span><span style="--t:#54a0ff">Молоко <b>10%</b></span><span style="--t:#ee5a9f">Хлеб <b>5%</b></span></div>
        <div class="wa-deal">Шоколад <b>−30%</b></div></div>`,
      t: "Магазины и акции", d: "Карты лояльности, любимые категории и скидки — рядом." }
  ];
  const w = document.createElement("div"); w.className = "welcome"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true"); w.setAttribute("aria-label","Добро пожаловать");
  w.innerHTML = `<div class="wl-top"><span class="ob-count" aria-live="polite">1 из ${slides.length}</span><button type="button" class="wl-skip">Пропустить</button></div>
    <div class="wl-track">${slides.map(s => `<section class="wl-slide"><div class="wl-art">${s.art}</div><h2>${s.t}</h2><p>${s.d}</p></section>`).join("")}</div>
    <div class="wl-foot"><div class="wl-dots">${slides.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>
      <button type="button" class="btn primary wl-next">Дальше</button></div>`;
  document.body.appendChild(w);
  const trk = w.querySelector(".wl-track"), next = w.querySelector(".wl-next"), dots = [...w.querySelectorAll(".wl-dots i")];
  const idx = () => Math.round(trk.scrollLeft / trk.clientWidth);
  const sync = () => { const i = idx(); dots.forEach((d, k) => d.classList.toggle("on", k === i)); next.textContent = i === slides.length - 1 ? "Начать" : "Дальше"; w.querySelector(".ob-count").textContent = `${i + 1} из ${slides.length}`; };
  trk.addEventListener("scroll", sync, { passive: true });
  const finish = () => {
    lsMark(WELCOME_KEY); track("welcome_done");
    if(account?.synced && store){ const d = { ...looseDoc(), welcomed: true, updatedAt: Date.now() }; putCard(d); store.save(d); }
    if(reduceMo()){ w.remove(); return; }
    w.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(1.02)" }], { duration: 260, easing: "ease-in", fill: "forwards" }).finished.then(() => w.remove());
  };
  next.onclick = () => { const i = idx(); if(i >= slides.length - 1){ finish(); if(wantGuide()) setTimeout(() => { if(!document.querySelector(".scrim")) openEditor(null); }, 280); return; } trk.scrollTo({ left: (i + 1) * trk.clientWidth, behavior: reduceMo() ? "auto" : "smooth" }); };
  w.querySelector(".wl-skip").onclick = finish;
  if(!reduceMo()) w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
}

/* ---------- 3. подсказки категорий ----------
   Пока вводишь категорию, под строкой появляются варианты: свои прошлые категории и частые. Нажал — подставилось. */
const CAT_POOL = () => {
  const seen = new Set(), out = [];
  const add = n => { const k = norm(n); if(!n || isBase(n) || seen.has(k)) return; seen.add(k); out.push(n); };
  for(const c of allCards) for(const it of [...(c.items || []), ...(c.next?.items || [])]) add(it.n);   // свои
  COMMON.forEach(add); Object.values(MCC_GROUPS).forEach(g => add(g.label));
  return out;
};
let catBox = null;
function drawCatSuggest(input){
  const row = input.closest(".erow"); if(!row) return;
  const q = norm(input.value.trim());
  if(isBase(input.value)) return hideCatSuggest();
  const taken = new Set([...document.querySelectorAll('#edRows [data-f="n"]')].filter(x => x !== input).map(x => norm(x.value.trim())));
  const list = CAT_POOL().filter(n => !taken.has(norm(n)) && (!q || norm(n).includes(q)) && norm(n) !== q).slice(0, 8);
  if(!list.length) return hideCatSuggest();
  if(!catBox){ catBox = document.createElement("div"); catBox.className = "cat-sug"; catBox.setAttribute("role","listbox");
    catBox.addEventListener("pointerdown", e => e.preventDefault());   // не теряем фокус в поле
    catBox.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if(!b || !catBox._input) return;
      const inp = catBox._input; inp.value = b.dataset.cat; inp.dispatchEvent(new Event("input", { bubbles: true }));
      hideCatSuggest(); inp.closest(".erow")?.querySelector('[data-f="p"]')?.focus(); track("cat_pick"); }); }
  catBox._input = input;
  catBox.innerHTML = list.map(n => `<button type="button" data-cat="${esc(n)}">${esc(n)}</button>`).join("");
  if(catBox.previousElementSibling !== row){ row.after(catBox); if(!reduceMo()) catBox.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" }); }
}
function hideCatSuggest(){ catBox?.remove(); if(catBox) catBox._input = null; }
document.addEventListener("focusin", e => { if(e.target.matches?.('#edRows [data-f="n"]')) drawCatSuggest(e.target); });
document.addEventListener("input", e => { if(e.target.matches?.('#edRows [data-f="n"]')) drawCatSuggest(e.target); });
document.addEventListener("focusout", e => { if(e.target.matches?.('#edRows [data-f="n"]')) setTimeout(() => { if(!document.activeElement?.matches?.('#edRows [data-f="n"]')) hideCatSuggest(); }, 120); });

/* ---------- 4. тур после первой карты ----------
   Затемнение с «окошком» вокруг нужного места и стеклянная плашка с одной фразой. Окошко плавно переезжает. */
function maybeTour(){
  if(lsHas(TOUR_KEY) || realCards().length !== 1) return;
  setTimeout(startTour, 650);   // дать окну редактора закрыться и карте встать на место
}
function startTour(){
  if(document.querySelector(".tour") || document.querySelector(".scrim")) return;
  if(selected){ selected = null; render(); }   // карту убираем обратно — первый шаг как раз «нажми на карту»
  const steps = [
    { el: () => $("#wallet .card"), t: "Нажми на карту — откроются все её категории.", tap: el => { if(!selected) el.click(); } },
    { el: () => $("#q")?.parentElement || $("#q"), t: "Пиши категорию или сразу магазин — лучшая карта встанет первой." },
    { el: () => $('#viewTabs [data-view="shops"]'), t: "Здесь карты магазинов, любимые категории и акции.", tap: el => el.click() }
  ].filter(s => s.el());
  if(!steps.length) return;
  lsMark(TOUR_KEY);
  const t = document.createElement("div"); t.className = "tour";
  t.innerHTML = `<div class="tour-hole"></div><div class="tour-pop hpop"><p></p><div class="tour-acts"><span class="tour-left"><button type="button" class="tour-skip">Пропустить</button><span class="ob-count" aria-live="polite"></span></span><button type="button" class="btn primary tour-next">Дальше</button></div></div>`;
  document.body.appendChild(t);
  const hole = t.querySelector(".tour-hole"), pop = t.querySelector(".tour-pop"), next = t.querySelector(".tour-next");
  t.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  let i = 0;
  const place = () => {
    const s = steps[i], el = s.el(); if(!el) return;
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect(), pad = 6, rad = getComputedStyle(el).borderRadius || "16px";
    Object.assign(hole.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px", borderRadius: rad });
    pop.querySelector("p").textContent = s.t;
    next.textContent = i === steps.length - 1 ? "Понятно" : "Дальше";
    t.querySelector(".ob-count").textContent = `${i + 1} из ${steps.length}`;
    const ph = pop.offsetHeight, below = r.bottom + 16 + ph < innerHeight - 12;
    pop.style.top = (below ? r.bottom + 16 : Math.max(12, r.top - 16 - ph)) + "px";
    if(!reduceMo()) pop.animate([{ opacity: 0, transform: `translateY(${below ? -6 : 6}px)` }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1)" });
  };
  const end = () => { track("tour_done", { step: i + 1 });
    if(reduceMo()){ t.remove(); return; }
    t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.then(() => t.remove()); };
  next.onclick = () => { if(++i >= steps.length) return end(); place(); };
  // нажатие прямо на подсвеченное место: делает то же, что и само место (открыть карту, Магазины), и ведёт дальше
  t.addEventListener("click", e => {
    if(e.target.closest(".tour-pop")) return;
    const r = hole.getBoundingClientRect();
    if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const s = steps[i], el = s.el(); track("tour_tap", { step: i + 1 });
    if(i >= steps.length - 1) end(); else { i++; }
    s.tap?.(el);
    if(document.querySelector(".tour") === t && i < steps.length && t.isConnected) setTimeout(() => t.isConnected && place(), s.tap ? 120 : 0);
  });
  t.querySelector(".tour-skip").onclick = end;
  if(!reduceMo()) t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
  place();
}
// «Показать подсказки снова» в профиле
function replayOnboarding(){
  try{ localStorage.removeItem(WELCOME_KEY); localStorage.removeItem(TOUR_KEY); localStorage.removeItem(GUIDE_KEY); }catch{}
  document.querySelectorAll(".scrim").forEach(s => s.remove());
  showWelcome();
}

/* ---------- 5. первая карта вместе ----------
   Плашка сверху окна «Новая карта»: шаг, одна фраза и «Дальше». «Дальше» загорается, когда шаг сделан.
   Нужное место в окне обводится пульсирующей рамкой. Показываем, пока у человека нет ни одной карты. */
let guideEnd = null;
function wantGuide(){ return !lsHas(GUIDE_KEY) && realCards().length === 0; }
function startGuide(){
  const sheet = $("#edForm"); if(!sheet || !editing) return;
  editing.guide = true;
  const hasCats = () => [...document.querySelectorAll('#edRows [data-f="n"]')].some(x => x.value.trim() && !isBase(x.value))
    || [...(editing?.items || []), ...(editing?.next?.items || [])].some(i => String(i.n).trim() && !isBase(i.n));
  const steps = [
    { el: () => $("#edPicks") || $("#edBank"), t: "Выбери свой банк — или впиши название сам.", ok: () => !!$("#edBank")?.value.trim() },
    { el: () => $("#edScan"), t: "Загрузи скриншот кешбека из приложения банка — категории заполнятся сами. Или впиши их вручную.", ok: hasCats },
    { el: () => $("#edRows"), t: "Проверь категории и проценты. Лишнее убери крестиком.", ok: () => true },
    { el: () => sheet.querySelector('[type="submit"]'), t: "Всё верно? Нажми «Сохранить».", last: true }
  ];
  const g = document.createElement("div"); g.className = "guide";
  g.innerHTML = `<div class="gd-top"><span class="ob-count" aria-live="polite"></span><button type="button" class="gd-skip">Пропустить</button></div>
    <div class="gd-row"><p aria-live="polite"></p><button type="button" class="btn primary gd-next" disabled>Дальше</button></div>`;
  sheet.querySelector("h3").after(g);
  const next = g.querySelector(".gd-next"), p = g.querySelector("p");
  let i = 0, hi = null;
  const check = () => { const s = steps[i]; if(!s || s.last) return;
    const ok = !!s.ok();
    if(ok && next.disabled && !reduceMo()) next.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)" });
    next.disabled = !ok; };
  const reveal = el => {   // прокрутить окно так, чтобы нужное место было видно под плашкой
    const sr = sheet.getBoundingClientRect(), r = el.getBoundingClientRect(), top = sr.top + g.offsetHeight + 16;
    if(r.top >= top && r.bottom <= sr.bottom - 12) return;
    sheet.scrollTo({ top: Math.max(0, sheet.scrollTop + r.top - top), behavior: reduceMo() ? "auto" : "smooth" }); };
  const show = () => { const s = steps[i];
    hi?.classList.remove("gd-hi"); hi = s.el(); hi?.classList.add("gd-hi");
    p.textContent = s.t; g.querySelector(".ob-count").textContent = `Шаг ${i + 1} из ${steps.length}`;
    next.hidden = !!s.last; check();
    if(!reduceMo()) p.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1)" });
    if(hi) setTimeout(() => reveal(hi), 40); };
  const recheck = () => setTimeout(check, 0);
  sheet.addEventListener("input", recheck); sheet.addEventListener("click", recheck); document.addEventListener("ed-change", recheck);
  next.onclick = () => { if(next.disabled) return; track("guide_step", { s: i + 1 }); i++; show(); };
  guideEnd = done => {
    guideEnd = null; lsMark(GUIDE_KEY); track(done ? "guide_done" : "guide_skip", { step: i + 1 });
    document.removeEventListener("ed-change", recheck); hi?.classList.remove("gd-hi");
    if(editing) editing.guide = false;
    if(done || reduceMo()){ g.remove(); return; }
    g.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-6px)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.then(() => g.remove());
  };
  g.querySelector(".gd-skip").onclick = () => guideEnd?.(false);
  if(!reduceMo()) g.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 120, easing: "cubic-bezier(.2,.9,.3,1)", fill: "backwards" });
  show();
}
