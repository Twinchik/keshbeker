// Кешбекер — кешбек со скриншота приложения банка.
// Текст распознаётся прямо в телефоне (Tesseract, русский язык) — скриншот никуда не отправляется.
// В первый раз скачивается движок и словарь (несколько МБ), дальше браузер берёт их из кеша.
// Словарь (быстрая русская модель tessdata_fast) лежит рядом с сайтом: ocr/rus.traineddata.

const OCR_JS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let ocrLoad = null, ocrWorker = null, ocrProgress = null;
function loadOcr(){
  if(window.Tesseract) return Promise.resolve(window.Tesseract);
  return ocrLoad ||= new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = OCR_JS; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error("no lib"));
    s.onerror = () => { ocrLoad = null; s.remove(); rej(new Error("load")); };
    document.head.appendChild(s);
  });
}
async function ocrGetWorker(){
  const T = await loadOcr();
  ocrWorker ||= T.createWorker("rus", 1, {
    langPath: new URL("ocr/", location.href).href, gzip: false,
    logger: m => ocrProgress?.(m)
  }).catch(e => { ocrWorker = null; throw e; });
  return ocrWorker;
}
// скриншот → холст не шире 1100 px (быстрее и точность та же)
async function ocrImage(file){
  let src;
  try{ src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch{ src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const k = Math.min(1, 1100 / src.width), cv = document.createElement("canvas");
  cv.width = Math.round(src.width * k); cv.height = Math.round(src.height * k);
  const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
// распознать скриншот: onStep("load" | "read", доля 0..1)
async function scanCashback(file, onStep){
  ocrProgress = m => {
    if(/recogniz/i.test(m.status)) onStep?.("read", m.progress || 0);
    else onStep?.("load", m.progress || 0);
  };
  try{
    onStep?.("load", 0);
    const [w, img] = await Promise.all([ocrGetWorker(), ocrImage(file)]);
    const { data } = await w.recognize(img);
    return parseCashback(data.text || "");
  } finally { ocrProgress = null; }
}

/* ---------- разбор текста ----------
   Ищем строки с процентом: «5% Кино» (Т-Банк) или «Супермаркеты 5%» (Сбер, Альфа).
   Длинное название, перенесённое на вторую строку («М.Косметик в / Шопинге»), склеиваем.
   Кнопки («Перейти», «Подробнее»), значки и строку «Условия программы…» выкидываем. */
const OCR_UI = ["перейти","подробнее","выбрать","подключить","активировать","изменить","смотреть","открыть","закрыть","условия","оформить"];
const OCR_MONTHS = ["январ","феврал","март","апрел","ма[йяе]","июн","июл","август","сентябр","октябр","ноябр","декабр"];
const OCR_BANKS = [[/т[\s\-_.—–]?[бв]анк|тинькофф/,"Т-Банк"],[/сбер/,"Сбер"],[/альфа/,"Альфа-Банк"],[/(^|[^а-яё])втб([^а-яё]|$)/,"ВТБ"],[/озон|ozon/,"Озон Банк"],[/яндекс/,"Яндекс Банк"],[/газпромбанк/,"Газпромбанк"],[/(^|[^а-яё])мтс([^а-яё]|$)/,"МТС Банк"],[/райффайзен/,"Райффайзен"],[/совкомбанк|халва/,"Совкомбанк"]];
const OCR_PREP = /\s(в|во|на|и|за|с|со|у|по|для|от|из|к)$/i;
function parseCashback(text){
  const low = String(text).toLowerCase();
  const items = [], seen = new Map(); let base = null, last = null, prev = "";
  const junk = w => { const k = norm(w).replace(/[^a-zа-я]/g, ""); return k.length >= 4 && OCR_UI.some(u => u.includes(k)); };
  const clean = s => {
    const t = s.split(/\s+/).filter(w => w && !junk(w));
    while(t.length && !/[a-zа-яё]{2}/i.test(t[0])) t.shift();               // значки слева: «©)», «(<)»
    while(t.length && !/[a-zа-яё0-9]/i.test(t[t.length - 1])) t.pop();       // стрелки и «?» справа
    return t.join(" ").replace(/^[^a-zа-яё0-9«"]+/i, "").replace(/[\s,;:—–\-]+$/, "").trim();
  };
  for(const raw of String(text).split("\n")){
    const line = raw.trim();
    if(!line){ if(!(last && OCR_PREP.test(last.n))) last = null; prev = ""; continue; }   // «М.Косметик в» — ждём продолжение и после пустой строки
    if(/\d{1,2}:\d{2}/.test(line)){ last = null; prev = ""; continue; }          // строка статуса телефона: время, заряд «85%»
    const m = line.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*[%％]/);
    if(m){
      const p = parseFloat(m[1].replace(",", "."));
      let name = clean((line.slice(0, m.index) + " " + line.slice(m.index + m[0].length))
        .replace(/(^|\s)(до|кэшбэк|кешбэк|кешбек|кэшбек|cashback|повышенный)(?=\s|$)/gi, " "));
      // начало названия на прошлой строке: «Кафе и / рестораны 7%»
      if(prev && name && (OCR_PREP.test(prev) || /^[a-zа-яё]/.test(name))) name = prev + " " + name;
      else if(prev && !name) name = prev;                                       // «Красота / 7%» — процент отдельной строкой
      last = null; prev = "";
      if(/^\s*(у|при|от)\s/i.test(line.slice(m.index + m[0].length))) continue;                                  // «до 30% у партнёров» — не категория
      if(!(p > 0 && p <= 100) || name.length < 2) continue;
      if(isBase(name) || /^(на )?(все|остальн|прочие|другие)/.test(norm(name))){ base = p; continue; }
      const k = norm(name);
      if(seen.has(k)){ const it = seen.get(k); it.p = Math.max(it.p, p); continue; }
      last = { n: name, p }; items.push(last); seen.set(k, last);
    } else if(last){
      // продолжение названия: прошлая строка кончилась предлогом («…в») или эта начинается с маленькой буквы
      const first = (line.match(/[a-zа-яё]+/i) || [""])[0];
      const add = clean(line);
      if(!add) continue;                                                       // обрывок кнопки — продолжение может быть ниже
      if(OCR_PREP.test(last.n) || /^[a-zа-яё]/.test(first)){ seen.delete(norm(last.n)); last.n += " " + add; seen.set(norm(last.n), last); prev = ""; }
      else prev = /^[A-ZА-ЯЁ]/.test(first) ? add : "";
      last = null;
    } else {
      const first = (line.match(/[a-zа-яё]+/i) || [""])[0];
      prev = /^[A-ZА-ЯЁ]/.test(first) ? clean(line) : "";
    }
  }
  for(const it of items){ it.n = it.n.split(" ").filter((w, k, a) => !k || norm(w) !== norm(a[k - 1])).join(" ");   // «в в» после склейки
    it.n = it.n.replace(OCR_PREP, "").trim(); it.n = it.n[0].toUpperCase() + it.n.slice(1); }
  const mi = OCR_MONTHS.findIndex(r => new RegExp("(^|[^а-яё])" + r).test(low));
  const bank = (OCR_BANKS.find(([r]) => r.test(low)) || [])[1] || "";
  return { items, base, month: mi, bank };
}
if(typeof module !== "undefined") module.exports = { parseCashback };
