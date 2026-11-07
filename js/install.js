// Кешбекер — «Установить приложение».
// Android и компьютер (Chrome, Edge, Samsung Internet): браузер сам предлагает установку,
// мы показываем его окно по нажатию на нашу кнопку.
// Айфон: Apple не даёт сайту установить себя, поэтому показываем короткую инструкцию.
// Если сайт уже открыт как приложение — кнопки не видно.

let installPrompt = null;
const ua = navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
// встроенные браузеры (Telegram, Instagram, VK…) не умеют добавлять на экран «Домой»
const inAppBrowser = /telegram|instagram|fban|fbav|vkclient|line\//i.test(ua);

function canOfferInstall(){ return !isStandalone() && (!!installPrompt || isIOS); }
function refreshInstallUI(){
  const show = canOfferInstall();
  document.querySelectorAll("[data-install]").forEach(el => { el.hidden = !show; });
}

addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; refreshInstallUI(); });
addEventListener("appinstalled", () => { installPrompt = null; refreshInstallUI(); if(typeof toast === "function") toast("Кешбекер установлен"); });

const shareIcon = `<svg class="ins-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>`;
const plusIcon = `<svg class="ins-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;

function showIOSHelp(){
  const s = document.createElement("div"); s.className = "scrim"; s.style.zIndex = 700;
  s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Установка на айфон">
    <h3>Установить на айфон</h3>
    ${inAppBrowser ? `<p class="note warn" style="margin:0">Сначала открой сайт в Safari: нажми «…» или значок компаса и выбери «Открыть в Safari».</p>` : ""}
    <ol class="ins-steps">
      <li>Нажми ${shareIcon} <b>«Поделиться»</b> внизу экрана Safari</li>
      <li>Пролистай вниз и выбери ${plusIcon} <b>«На экран "Домой"»</b></li>
      <li>Нажми <b>«Добавить»</b> — Кешбекер появится на экране как приложение</li>
    </ol>
    <div class="acts"><div></div><div><button type="button" class="btn primary" data-close>Понятно</button></div></div>
  </div>`;
  document.body.appendChild(s);
  s.addEventListener("click", e => { if(e.target === s || e.target.closest("[data-close]")) s.remove(); });
}

document.addEventListener("click", async e => {
  if(!e.target.closest("[data-install]")) return;
  if(installPrompt){
    const p = installPrompt; installPrompt = null;
    await p.prompt();
    try{ await p.userChoice; }catch{}
    refreshInstallUI();
  } else if(isIOS) showIOSHelp();
});

refreshInstallUI();
