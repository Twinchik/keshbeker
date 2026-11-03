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
// разметка переключателя: на экране входа и в окне аккаунта
function themeSwitchHTML(extra=""){
  return `<button type="button" class="tswitch${extra?" "+extra:""}" role="switch" aria-checked="${currentTheme()==="dark"}" data-theme-toggle>
    <span class="ts-lbl">Тёмная тема</span><span class="ts-track" aria-hidden="true"><span class="ts-knob"></span></span></button>`;
}

document.addEventListener("click", e => {
  if(!e.target.closest("[data-theme-toggle]")) return;
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});
darkMQ.addEventListener("change", syncThemeUI);
syncThemeUI();
