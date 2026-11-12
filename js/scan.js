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
  ocrWorker ||= T.createWorker(["rus", "eng"], 1, {
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
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(src, 0, 0, cv.width, cv.height);
  // в серый: цветные плашки с процентами (Сбер) так читаются заметно лучше
  const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
  for(let i = 0; i < px.length; i += 4){ const y = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114; px[i] = px[i + 1] = px[i + 2] = y; }
  g.putImageData(d, 0, 0);
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
    return parseCashback(data.lines?.length ? layoutText(data.lines, img.width) : (data.text || ""));
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
/* строки с координатами слов → текст.
   Плитки: в одной строке несколько процентов («0,5%  15%  4%» у Сбера, «7%  2%» у Альфы).
   Каждый процент связываем с названием в своей колонке — над ним (Сбер) или под ним (Альфа)
   и выдаём строкой «Название 15%». Остальное идёт как есть; большие промежутки — пустая строка. */
function layoutText(lines, W){
  const gap = W * 0.06, tol = W * 0.04;
  const rows = lines.map(l => {
    const segs = [];
    for(const w of [...(l.words || [])].filter(w => w.text && w.text.trim()).sort((a, b) => a.bbox.x0 - b.bbox.x0)){
      const s = segs[segs.length - 1];
      if(s && w.bbox.x0 - s.x1 < gap){ s.t += " " + w.text; s.x1 = w.bbox.x1; } else segs.push({ t: w.text, x0: w.bbox.x0, x1: w.bbox.x1 });
    }
    return { segs, y0: l.bbox.y0, y1: l.bbox.y1 };
  }).filter(r => r.segs.length).sort((a, b) => a.y0 - b.y0);
  const H = r => Math.max(8, r.y1 - r.y0);
  const isPct = s => { const m = s.t.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*[%％]/); return m && (s.t.replace(m[0], "").match(/[a-zа-яё]/gi) || []).length <= 2 ? m[1] + "%" : null; };   // «15% we» — процент с мусором от картинки
  const isTile = r => r.segs.filter(isPct).length >= 2;
  const used = new Set(), emit = new Map();
  rows.forEach((r, i) => {
    if(!isTile(r)) return;
    const cols = r.segs.filter(isPct), col = s => { let c = -1; cols.forEach((p, k) => { if(p.x0 <= s.x0 + tol) c = k; }); return c; };
    const free = k => k >= 0 && k < rows.length && !used.has(k) && !isTile(rows[k]);
    let grp = [];
    const b = i + 1;
    if(free(b) && rows[b].y0 - r.y1 < 1.5 * H(r) && new Set(rows[b].segs.map(col)).size >= 2){   // названия под процентами
      grp = [b]; for(let k = b + 1; free(k) && rows[k].y0 - rows[k - 1].y1 < .8 * H(rows[k - 1]); k++) grp.push(k);
    } else if(free(i - 1) && r.y0 - rows[i - 1].y1 < 12 * H(r)){                                     // названия над процентами
      grp = [i - 1]; for(let k = i - 2; free(k) && rows[k + 1].y0 - rows[k].y1 < .8 * H(rows[k]); k--) grp.unshift(k);
    }
    const names = cols.map(() => "");
    for(const k of grp) for(const s of rows[k].segs){ const c = col(s); if(c < 0 || isPct(s)) continue;
      names[c] = /[a-zа-яё]-$/i.test(names[c]) && /^[a-zа-яё]/.test(s.t) ? names[c].slice(0, -1) + s.t : (names[c] + " " + s.t).trim(); }
    grp.forEach(k => used.add(k));
    emit.set(i, ["", ...cols.map((p, c) => names[c] ? names[c] + " " + isPct(p) : "").filter(Boolean), ""]);
  });
  const out = [];
  rows.forEach((r, i) => {
    if(used.has(i)) return;
    if(i && r.y0 - rows[i - 1].y1 > H(rows[i - 1])) out.push("");
    out.push(...(emit.get(i) || [r.segs.map(s => s.t).join(" ")]));
  });
  return out.join("\n");
}
function parseCashback(text){
  // для поиска банка: латинские двойники букв → кириллица («T-BAHK» → «т-ванк»)
  const low = String(text).replace(/[TBAHKEOPCMX]/g, ch => "ТВАНКЕОРСМХ"["TBAHKEOPCMX".indexOf(ch)]).toLowerCase();
  const items = [], seen = new Map(); let base = null, last = null, prev = "", pend = null;
  const add = (name, p) => {
    if(!(p > 0 && p <= 100) || name.length < 2) return;
    if(isBase(name) || /^((на|за) )?(все|остальн|прочие|другие|любые)/.test(norm(name))){ base = p; return; }
    const k = norm(name);
    if(seen.has(k)){ const it = seen.get(k); it.p = Math.max(it.p, p); return; }
    last = { n: name, p }; items.push(last); seen.set(k, last);
  };
  const junk = w => { const k = norm(w).replace(/[^a-zа-я]/g, ""); return k.length >= 4 && OCR_UI.some(u => u.includes(k)); };
  const clean = s => {
    const t = s.split(/\s+/).filter(w => w && !junk(w));
    while(t.length && !/[a-zа-яё]{2}/i.test(t[0])) t.shift();               // значки слева: «©)», «(<)»
    while(t.length && !/[a-zа-яё]{2}/i.test(t[t.length - 1]) && !/^(в|и|с|у|к|о)$/i.test(t[t.length - 1])) t.pop();   // «®», «i)», «9» — значки справа
    // значок «i» в кружке читается как «ri)», «(i)»: короткий хвост со скобкой или латиница после кириллицы
    while(t.length > 1){ const z = t[t.length - 1];
      if(z.length <= 3 && /[^a-zа-яё0-9.]/i.test(z) || /^[a-z]+\W*$/.test(z) && /[а-яё]/i.test(t[t.length - 2])) t.pop(); else break; }   // и «never,» — кнопка, прочитанная латиницей
    return t.join(" ").replace(/^[^a-zа-яё0-9«"]+/i, "").replace(/[\s,;:—–\-]+$/, "").trim();
  };
  for(const raw of String(text).split("\n")){
    const line = raw.trim();
    if(!line){ if(!(last && OCR_PREP.test(last.n))) last = null; prev = ""; continue; }   // «М.Косметик в» — ждём продолжение и после пустой строки
    if(/\d{1,2}:\d{2}/.test(line)){ last = null; prev = ""; continue; }          // строка статуса телефона: время, заряд «85%»
    if(items.length && /партн[её]р|копим/i.test(line)) break;                    // дальше партнёры (Озон, «Копим бонусы» Сбера) — не наши категории
    const m = line.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*[%％]/);
    if(m){
      const p = parseFloat(m[1].replace(",", "."));
      let name = clean((line.slice(0, m.index) + " " + line.slice(m.index + m[0].length))
        .replace(/(^|\s)(до|кэшбэк|кешбэк|кешбек|кэшбек|cashback|повышенный)(?=\s|$)/gi, " "));
      // начало названия на прошлой строке: «Кафе и / рестораны 7%»
      if(prev && name && (OCR_PREP.test(prev) || /^[a-zа-яё]/.test(name))) name = prev + " " + name;
      else if(prev && !name) name = prev;                                       // «Красота / 7%» — процент отдельной строкой
      last = null; prev = ""; pend = null;
      if(/^\s*(у|при|от)\s/i.test(line.slice(m.index + m[0].length))) continue;                                  // «до 30% у партнёров» — не категория
      if(!name){ pend = p; continue; }                                         // «7%», а название строкой ниже (плитки Альфы)
      add(name, p);
    } else if(pend != null){
      const name = clean(line); if(!name) continue;
      const p = pend; pend = null; add(name, p); last = null;
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
  const low0 = String(text).toLowerCase();
  const bank = (OCR_BANKS.find(([r]) => r.test(low) || r.test(low0)) || [])[1] || "";
  return { items, base, month: mi, bank };
}
if(typeof module !== "undefined") module.exports = { parseCashback, layoutText };
