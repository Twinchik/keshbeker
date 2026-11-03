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
