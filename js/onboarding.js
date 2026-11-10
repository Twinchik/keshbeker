// Кешбекер — помощь новичкам.
// 1) Приветствие: три коротких экрана при самом первом входе.
// 2) Быстрый выбор банка в новой карте (название + цвет одним нажатием) — разметка в editor.js.
// 3) Подсказки категорий под строкой, пока человек вводит категорию.
// 4) Короткий тур по экрану после первой добавленной карты.

const WELCOME_KEY = "cashbacker-welcomed", TOUR_KEY = "cashbacker-toured";
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
    { art: `<div class="wa-stack"><i style="--c:#2f80ed"></i><i style="--c:#f5c518"></i><i style="--c:#1d1d1f"></i></div>`,
      t: "Все карты в одном месте", d: "Добавь свои карты и кешбек на этот месяц." },
    { art: `<div class="wa-search"><span>Аптеки</span><b>7%</b></div><div class="wa-best"></div>`,
      t: "Лучшая карта — первой", d: "Напиши, что покупаешь, — нужная карта встанет вперёд." },
    { art: `<div class="wa-shop"><span>Пятёрочка</span><b>10%</b></div><div class="wa-chips"><i></i><i></i><i></i></div>`,
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
  next.onclick = () => { const i = idx(); if(i >= slides.length - 1) return finish(); trk.scrollTo({ left: (i + 1) * trk.clientWidth, behavior: reduceMo() ? "auto" : "smooth" }); };
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
  const steps = [
    { el: () => $("#wallet .card"), t: "Нажми на карту — откроются все её категории." },
    { el: () => $("#q")?.parentElement || $("#q"), t: "Напиши, что покупаешь, — лучшая карта встанет первой." },
    { el: () => $('#viewTabs [data-view="shops"]'), t: "Здесь карты магазинов, любимые категории и акции." }
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
  t.querySelector(".tour-skip").onclick = end;
  if(!reduceMo()) t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
  place();
}
// «Показать подсказки снова» в профиле
function replayOnboarding(){
  try{ localStorage.removeItem(WELCOME_KEY); localStorage.removeItem(TOUR_KEY); }catch{}
  document.querySelectorAll(".scrim").forEach(s => s.remove());
  showWelcome();
}
