// Кешбекер — Справочники, общие функции и состояние, поиск, магазины → категории (MCC).
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

const STYLES = {
  blue:{name:"Синяя",bg:"linear-gradient(135deg,#3f72f7,#2350d8)",ink:"#fff"},
  lime:{name:"Лайм",bg:"linear-gradient(135deg,#aed33f,#6fb43b)",ink:"#15300c"},
  white:{name:"Белая",bg:"linear-gradient(160deg,#fbfcfd,#e8ecf1)",ink:"#1c2c6e"},
  red:{name:"Красная",bg:"linear-gradient(135deg,#e5302a,#c71a14)",ink:"#fff"},
  orange:{name:"Оранжевая",bg:"linear-gradient(100deg,#f8a51c,#f0512a 60%,#e9322b)",ink:"#fff"},
  black:{name:"Чёрная",bg:"#161616",ink:"#ececec",sheen:"radial-gradient(120% 140% at -10% 50%,#050505 0 42%,transparent 42.5%)"},
  violet:{name:"Фиолетовая",bg:"linear-gradient(135deg,#7b4dff,#4d23c9)",ink:"#fff"},
  mint:{name:"Мятная",bg:"linear-gradient(135deg,#34c9a3,#16977b)",ink:"#062a21"},
  graphite:{name:"Графит",bg:"linear-gradient(135deg,#4a515c,#2b3038)",ink:"#f1f3f6"},
  gold:{name:"Золото",bg:"linear-gradient(135deg,#e7c77a,#b38a3a)",ink:"#2b1d05"}
};
const SYN = [
  ["продукт","супермаркет","магнит","пятерочк","перекрест","вкусвилл","лента","ашан","дикси","самокат","лавка"],
  ["кафе","ресторан","фастфуд","кофе","бар","еда вне дома","доставка еды"],
  ["такси","яндекс go","ситимобил"],
  ["азс","топливо","бензин","заправк"],
  ["аптек","здоровье","лекарств","медицин"],
  ["транспорт","метро","автобус","тройка","проезд","электричк"],
  ["одежд","обув","wildberries","вайлдберриз","ozon","озон","маркетплейс","lamoda"],
  ["развлечен","кино","театр","концерт","игр"],
  ["связь","мобильн","интернет"],
  ["красот","салон","косметик","золотое яблоко","летуаль"],
  ["спорт","фитнес","спорттовар"],
  ["дом","ремонт","строй","леруа","икеа","hoff"],
  ["электроник","техник","днс","м.видео","мвидео","эльдорадо"],
  ["книг","образован"],["животн","зоо"],["путешеств","авиа","отел","жд","ржд"]
];
const SHOPS_COMMON = ["Пятёрочка","Перекрёсток","Магнит","ВкусВилл","Лента","Ашан","Самокат","Яндекс Лавка","Ozon","Wildberries","Яндекс Маркет","Ламода","Золотое яблоко","Летуаль","Спортмастер","DNS","М.Видео","Леруа Мерлен","Аптека Ригла","Вкусно — и точка","Шоколадница","Яндекс Go"];
const COMMON = ["Супермаркеты","Кафе и рестораны","Такси","АЗС","Аптеки","Транспорт","Одежда и обувь","Развлечения","Маркетплейсы","Красота","Спорт","Дом и ремонт","Электроника","Фастфуд","Всё остальное"];
const MONTHS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s||"").toLowerCase().replace(/ё/g,"е").trim();
const fmtP = p => (Math.round(p*10)/10).toString().replace(".",",") + "%";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,12);
const nowMonth = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); };
const addMonth = (m,k=1) => { const [y,mm]=String(m).split("-").map(Number); const d=new Date(y,mm-1+k,1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); };
const monthOnly = m => { const [,mm]=String(m||"").split("-"); return mm ? MONTHS[+mm-1] : ""; };
const cleanP = p => Math.max(0,Math.min(100,+String(p).replace(",",".")||0));
const cleanItems = arr => (arr||[]).filter(i=>String(i.n).trim()).map(i=>({n:String(i.n).trim(),p:cleanP(i.p)}));
// «Всё остальное» — базовый кешбек на любые покупки
const isBase = n => /^(вс[её] остальн|остальн|на вс[её]|все покупки|любые покупки)/.test(norm(n).replace(/ё/g,"е"));
// старые карты хранили магазины среди категорий — переносим их в отдельный список
function normCard(c){
  const shops=[...(c.shops||[])];
  const addShop=it=>{ const i=shops.findIndex(x=>norm(x.n)===norm(it.n)); if(i<0) shops.push({n:it.n,p:it.p}); else if(it.p>shops[i].p) shops[i]={n:it.n,p:it.p}; };
  const strip=arr=>(arr||[]).filter(i=>{ if(i.k==="shop"){ addShop(i); return false; } return true; }).map(i=>({n:i.n,p:i.p}));
  const items=strip(c.items); const next=c.next?{...c.next,items:strip(c.next.items)}:c.next;
  return {...c, items, next, shops};
}
// когда наступает месяц, выбранный заранее, он становится текущим
function rollCard(c){
  if(c.next && c.next.month && c.next.month<=nowMonth()){
    return {...c, month:c.next.month, items:c.next.items||[], next:null, updatedAt:Date.now()};
  }
  return null;
}
const monthName = m => { const [y,mm]=String(m||"").split("-"); return mm ? MONTHS[+mm-1]+" "+y : ""; };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let allCards = [];      // все карты, включая те, что в корзине
let cards = [];         // карты в кошельке (без удалённых); {id,bank,label,style,order,month,items:[{n,p,k}],sample,updatedAt}
let selected = null;
let query = "";
let store = null;       // {save(card), remove(id), mode}
let editing = null;

$("#monthLbl").textContent = "Категории на " + monthName(nowMonth());

/* ---------- search ---------- */
function expand(q){
  const nq = norm(q); if(!nq) return [];
  const terms = new Set([nq]);
  for (const g of SYN) if (g.some(t => t.includes(nq) || (nq.length>=3 && nq.includes(t)))) g.forEach(t=>terms.add(t));
  return [...terms];
}
function matches(item, terms){
  const n = norm(item.n);
  return terms.some(t => n.includes(t) || (n.length>=4 && t.includes(n)) || t.split(" ").some(w => w.length>=4 && n.includes(w.slice(0,Math.max(4,w.length-2)))));
}
function rankCard(card, terms){
  let best=null, base=null;
  for (const it of card.items||[]) {
    if (isBase(it.n)) { if(!base || it.p>base.p) base=it; continue; }
    if (matches(it,terms) && (!best || it.p>best.p)) best=it;
  }
  // магазины ищем по точному названию, без синонимов: «пятёрочка» не должна находить «Самокат»
  for (const sh of card.shops||[]) if (matches(sh,[terms[0]]) && (!best || sh.p>best.p)) best={...sh, shop:true};
  if (best) return {p:best.p, item:best, base:false};
  if (base) return {p:base.p, item:base, base:true};
  return {p:0, item:null, base:true};
}
/* ---------- магазины → категория кешбека (по MCC-коду кассы) ---------- */
// Банк определяет категорию по MCC-коду, который магазин ставит на своём терминале.
// Ниже — типичные коды крупных сетей (по справочникам MCC и чекам). У отдельной точки код может отличаться.
// В terms: обычные слова — точная категория; со знаком «~» — похожая, если точной нет ни на одной карте.
const MCC_GROUPS={
  fastfood:{label:"Фастфуд",mcc:"5814",terms:["фастфуд","фаст-фуд","фаст фуд","~кафе","~ресторан"]},
  cafe:{label:"Кафе и рестораны",mcc:"5812",terms:["кафе","ресторан","~фастфуд"]},
  bar:{label:"Бары",mcc:"5813",terms:["бар","~кафе","~ресторан"]},
  bakery:{label:"Пекарни",mcc:"5462",terms:["пекарн","кондитер","выпечк","~фастфуд","~кафе","~продукт"]},
  delivery:{label:"Доставка еды",mcc:"5812",terms:["доставка еды","доставк","~кафе","~ресторан","~фастфуд"]},
  grocery:{label:"Супермаркеты",mcc:"5411",terms:["супермаркет","продукт"]},
  alcohol:{label:"Алкоголь",mcc:"5921",terms:["алкогол","вино","~продукт","~супермаркет"]},
  pharmacy:{label:"Аптеки",mcc:"5912",terms:["аптек","~здоровье","~медицин"]},
  medical:{label:"Медицина",mcc:"8071",terms:["медицин","здоровье","анализ","клиник","~аптек"]},
  optics:{label:"Оптика",mcc:"8043",terms:["оптик","~медицин","~здоровье"]},
  taxi:{label:"Такси",mcc:"4121",terms:["такси"]},
  carshare:{label:"Каршеринг и аренда",mcc:"7512",terms:["каршеринг","аренда авто","кикшеринг","~такси","~транспорт"]},
  fuel:{label:"АЗС",mcc:"5541",terms:["азс","топливо","бензин","заправк"]},
  auto:{label:"Автотовары",mcc:"5533",terms:["авто","запчаст","~азс"]},
  parking:{label:"Парковки",mcc:"7523",terms:["парков","~транспорт","~авто"]},
  transport:{label:"Транспорт",mcc:"4111",terms:["транспорт","проезд","метро"]},
  rail:{label:"Ж/д билеты",mcc:"4112",terms:["жд","ж/д","поезд","~путешеств","~транспорт"]},
  air:{label:"Авиабилеты",mcc:"4511",terms:["авиа","~путешеств"]},
  travel:{label:"Путешествия",mcc:"4722",terms:["путешеств","турагент","туризм","~авиа"]},
  hotel:{label:"Отели",mcc:"7011",terms:["отел","гостиниц","~путешеств"]},
  clothes:{label:"Одежда и обувь",mcc:"5651",terms:["одежд","~обув"]},
  shoes:{label:"Обувь",mcc:"5661",terms:["обув","~одежд"]},
  bags:{label:"Сумки и аксессуары",mcc:"5948",terms:["сумк","аксессуар","~одежд"]},
  jewelry:{label:"Ювелирные",mcc:"5944",terms:["ювелир","украшен"]},
  dept:{label:"Универмаги",mcc:"5311",terms:["универмаг","~одежд"]},
  discount:{label:"Товары для дома",mcc:"5310",terms:["универмаг","дисконт","~дом"]},
  electronics:{label:"Электроника",mcc:"5732",terms:["электроник","техник","бытов"]},
  beauty:{label:"Красота и косметика",mcc:"5977",terms:["красот","косметик","парфюм"]},
  salon:{label:"Салоны красоты",mcc:"7230",terms:["салон","парикмах","красот"]},
  home:{label:"Дом и ремонт",mcc:"5200",terms:["дом","ремонт","строй","мебел"]},
  sport:{label:"Спорттовары",mcc:"5941",terms:["спорт"]},
  fitness:{label:"Фитнес",mcc:"7941",terms:["фитнес","спорт"]},
  kids:{label:"Детские товары",mcc:"5945",terms:["дет","игрушк"]},
  pets:{label:"Зоотовары",mcc:"5995",terms:["животн","зоо"]},
  books:{label:"Книги",mcc:"5942",terms:["книг"]},
  office:{label:"Канцтовары",mcc:"5943",terms:["канцеляр","~книг"]},
  cinema:{label:"Кино",mcc:"7832",terms:["кино","~развлечен"]},
  events:{label:"Билеты и развлечения",mcc:"7922",terms:["развлечен","концерт","театр","~кино"]},
  digital:{label:"Цифровые сервисы",mcc:"5815",terms:["цифров","подписк","онлайн-кино","~кино","~развлечен"]},
  telecom:{label:"Связь",mcc:"4814",terms:["связь","мобильн","интернет"]},
  edu:{label:"Образование",mcc:"8299",terms:["образован","обучен","курс"]},
  flowers:{label:"Цветы",mcc:"5992",terms:["цветы","цветоч","флорист"]},
  gifts:{label:"Подарки",mcc:"5947",terms:["подар","сувенир"]},
  utilities:{label:"ЖКХ и услуги",mcc:"4900",terms:["жкх","коммунал","~услуг"]},
  market:{label:"Маркетплейсы",mcc:"5399",terms:["маркетплейс","онлайн"]}
};
// MCC-код → группа (для поиска по номеру, например «5814»)
const MCC_CODES={"5814":"fastfood","5812":"cafe","5811":"cafe","5813":"bar","5462":"bakery","5441":"bakery",
  "5411":"grocery","5499":"grocery","5422":"grocery","5451":"grocery","5300":"grocery","5921":"alcohol",
  "5912":"pharmacy","5122":"pharmacy","8071":"medical","8099":"medical","8011":"medical","8062":"medical","8021":"medical","8043":"optics",
  "4121":"taxi","7512":"carshare","7513":"carshare","7519":"carshare","5541":"fuel","5542":"fuel","5983":"fuel","5172":"fuel",
  "5533":"auto","5531":"auto","5532":"auto","7538":"auto","7542":"auto","7523":"parking","4784":"transport",
  "4111":"transport","4131":"transport","4112":"rail","4511":"air","3000":"air","4722":"travel","4411":"travel","7011":"hotel","7012":"hotel",
  "5651":"clothes","5691":"clothes","5699":"clothes","5621":"clothes","5611":"clothes","5631":"clothes","5681":"clothes","5661":"shoes",
  "5948":"bags","5944":"jewelry","5311":"dept","5310":"discount","5331":"discount",
  "5732":"electronics","5722":"electronics","5045":"electronics","5734":"electronics","5946":"electronics","5977":"beauty","7230":"salon","7298":"salon","7297":"salon",
  "5200":"home","5211":"home","5251":"home","5261":"home","5712":"home","5713":"home","5714":"home","5719":"home","5231":"home",
  "5941":"sport","5655":"sport","7941":"fitness","7997":"fitness","5641":"kids","5945":"kids",
  "5995":"pets","0742":"pets","5942":"books","5994":"books","5943":"office","5111":"office","7832":"cinema","7922":"events","7996":"events","7999":"events","7991":"events",
  "5815":"digital","5816":"digital","5817":"digital","5818":"digital","4812":"telecom","4814":"telecom","4899":"telecom",
  "8299":"edu","8220":"edu","8211":"edu","5992":"flowers","5193":"flowers","5947":"gifts","4900":"utilities","5399":"market","5262":"market","5964":"market"};
// Сети: «название|другое написание|…:группа;»
const MERCHANTS_RAW=`Ростикс|rostics|rostic's|kfc|кфс:fastfood;Вкусно — и точка|вкусно и точка|вкусно-и точка|вкусноиточка|вкусно|макдоналдс|mcdonalds|макдак:fastfood;
Бургер Кинг|burger king|бургеркинг|бк:fastfood;Додо Пицца|додо|dodo:fastfood;Теремок:fastfood;Subway|сабвей:fastfood;Папа Джонс|papa johns:fastfood;
Крошка Картошка:fastfood;Black Star Burger|блэк стар бургер:fastfood;Шаурма|шаверма|шаурмичная:fastfood;Цех85|цех 85:fastfood;Буше|bushe:bakery;
Штолле|stolle:bakery;Хлебник:bakery;Волконский|пекарня волконский:bakery;Хлеб насущный:bakery;Братья Караваевы|караваевы|кулинарная лавка братьев караваевых:bakery;
Cofix|кофикс:fastfood;Даблби|double b|дабл би:fastfood;Surf Coffee|сёрф кофе|серф кофе:fastfood;One Price Coffee|ван прайс кофе:fastfood;Stars Coffee|старс кофе|starbucks|старбакс:fastfood;
Coffee Like|кофе лайк:fastfood;Кофе Хауз|coffee house:fastfood;Domino's|доминос|домино пицца:fastfood;Ташир пицца|ташир:fastfood;Стардогс|stardogs:fastfood;
Суши Wok|суши вок:fastfood;Му-Му|муму:fastfood;Грабли:fastfood;Кухня на районе:delivery;Яндекс Еда|yandex eda:delivery;Delivery Club|деливери клаб:delivery;
Шоколадница:cafe;Кофемания:cafe;Чайхона №1|чайхона:cafe;Тануки:cafe;Якитория:cafe;Il Patio|иль патио:cafe;Планета Суши:cafe;Евразия:cafe;Мама Рома:cafe;Хачапурная|Хинкальная:cafe;
Пятёрочка|пятерочка|5ка:grocery;Магнит|магнит у дома|магнит семейный:grocery;Перекрёсток|перекресток:grocery;ВкусВилл|вкусвилл|vkusvill:grocery;Лента:grocery;Ашан|auchan:grocery;
Дикси:grocery;О'Кей|окей|o'key:grocery;Азбука Вкуса:grocery;Глобус|гиперглобус:grocery;Metro Cash & Carry|metro c&c|метро кэш:grocery;Самокат:grocery;Яндекс Лавка|лавка:grocery;
Светофор:grocery;Чижик:grocery;Spar|спар|евроспар:grocery;Монетка:grocery;Мария-Ра|мария ра:grocery;Верный:grocery;Ярче:grocery;Бахетле:grocery;Магнолия:grocery;
Купер|сбермаркет|kuper:grocery;Утконос:grocery;Табрис:grocery;Мясницкий ряд:grocery;Командор:grocery;Fresh market:grocery;
Красное&Белое|красное и белое|красное белое|кб:alcohol;Бристоль:alcohol;ВинЛаб|винлаб:alcohol;Simple Wine|симпл вайн:alcohol;Ароматный мир:alcohol;Норман:alcohol;
Ригла:pharmacy;Горздрав:pharmacy;36,6|36.6|аптека 36:pharmacy;Аптека.ру|аптека ру:pharmacy;ЕАптека|еаптека:pharmacy;Столички:pharmacy;Асна:pharmacy;Здравсити|zdravcity:pharmacy;
Озерки:pharmacy;Живика:pharmacy;Апрель|аптека апрель:pharmacy;Планета здоровья:pharmacy;Здоров.ру|здоров ру:pharmacy;Аптека Вита|вита:pharmacy;Мелодия здоровья:pharmacy;
Невис:pharmacy;Неофарм:pharmacy;Самсон-фарма|самсон фарма:pharmacy;Максавит:pharmacy;Будь здоров:pharmacy;Ваша аптека:pharmacy;
Инвитро|invitro:medical;Гемотест:medical;KDL|кдл:medical;Хеликс|helix:medical;Ситилаб:medical;Медси|medsi:medical;СМ-Клиника|см клиника:medical;
Линзмастер:optics;Очкарик:optics;
Яндекс Go|яндекс го|яндекс такси|yandex go:taxi;Ситимобил:taxi;Такси Максим|максим:taxi;Uber|убер:taxi;Везёт|везет:taxi;Kiwitaxi|кивитакси:taxi;
Делимобиль:carshare;Яндекс Драйв:carshare;BelkaCar|белкакар:carshare;Ситидрайв|citydrive:carshare;Whoosh|вуш:carshare;Юрент|urent:carshare;
Лукойл:fuel;Роснефть:fuel;Газпромнефть|газпром нефть:fuel;Татнефть:fuel;Shell|шелл:fuel;Teboil|тебойл:fuel;BP|бп:fuel;Башнефть:fuel;Нефтьмагистраль:fuel;
Трасса:fuel;ПТК:fuel;Сургутнефтегаз:fuel;Neste|несте:fuel;Яндекс Заправки:fuel;
Exist|экзист:auto;Автодок|autodoc:auto;Emex|емекс:auto;Колесо.ру|колесо ру:auto;Московский паркинг|моспаркинг|парковки москвы:parking;
Тройка|карта тройка:transport;Подорожник:transport;Мосгортранс:transport;Аэроэкспресс:transport;ЦППК:transport;
РЖД|ржд:rail;Туту|tutu:rail;
Аэрофлот|aeroflot:air;S7|эс севен:air;Победа (авиакомпания)|победа:air;Уральские авиалинии|уральские:air;Utair|ютэйр:air;Nordwind|нордвинд:air;Red Wings|ред вингс:air;Азимут:air;
Слетать.ру|слетать:travel;Travelata|травелата:travel;Level.Travel|левел тревел:travel;Aviasales|авиасейлс:travel;OneTwoTrip|onetwotrip:travel;
Островок|ostrovok:hotel;Суточно:hotel;Яндекс Путешествия:hotel;Booking|букинг:hotel;Отелло:hotel;Броневик|bronevik:hotel;
Zara|зара|maag|мааг:clothes;H&M|эйч энд эм:clothes;Befree|бифри:clothes;Gloria Jeans|глория джинс|глория:clothes;O'stin|ostin|остин:clothes;Love Republic|лав репаблик:clothes;
Lamoda|ламода:clothes;Твоё|твое:clothes;Uniqlo|юникло:clothes;Mango|манго:clothes;Снежная Королева:clothes;Sela|села:clothes;Concept Club|концепт клаб:clothes;
Zarina|зарина:clothes;Incity|инсити:clothes;Finn Flare|финн флаер:clothes;Модис|modis:clothes;Familia|фамилия:clothes;Oodji|оджи:clothes;Ecru|екрю:clothes;
Vilet|вилет:clothes;Lime|лайм:clothes;12 Storeez:clothes;Gate31:clothes;Calzedonia|кальцедония:clothes;Intimissimi:clothes;Tezenis:clothes;
Kari|кари:shoes;Rendez-Vous|рандеву:shoes;Ecco|экко:shoes;Zenden|зенден:shoes;Ralf Ringer|ральф рингер:shoes;Respect|респект:shoes;ЦентрОбувь|центробувь:shoes;
Thomas Munz|томас мюнц:shoes;Эконика|econika:shoes;Unichel|юничел:shoes;
Samsonite|самсонайт:bags;1000 и одна сумка|тысяча и одна сумка:bags;
Sokolov|соколов:jewelry;Sunlight|санлайт:jewelry;585 Gold|585 золотой|585:jewelry;Адамас|adamas:jewelry;Pandora|пандора:jewelry;Эстет:jewelry;
ЦУМ:dept;ГУМ:dept;
Fix Price|фикс прайс|fixprice|фиксик:discount;Галамарт:discount;Miniso|минисо:discount;Улыбка радуги:beauty;
DNS|днс:electronics;М.Видео|мвидео|м видео:electronics;Эльдорадо:electronics;Ситилинк|citilink:electronics;re:Store|рестор:electronics;Технопарк:electronics;
Холодильник.ру|холодильник ру:electronics;Онлайн Трейд|онлайнтрейд:electronics;ЧиП и ДиП|чип и дип:electronics;Xiaomi|сяоми|ксиоми:electronics;Samsung|самсунг:electronics;
Huawei|хуавей:electronics;Мир Музыки:electronics;Связной:electronics;
Золотое Яблоко|золотое яблоко|зя:beauty;Л'Этуаль|летуаль|лэтуаль|l'etoile:beauty;Рив Гош|ривгош:beauty;Подружка:beauty;Магнит Косметик:beauty;Ив Роше|yves rocher:beauty;
L'Occitane|локситан:beauty;Иль де Ботэ|ile de beaute:beauty;Faberlic|фаберлик:beauty;Oriflame|орифлейм:beauty;Атоми|atomy:beauty;
Чио Чио:salon;Цирюльник:salon;
Леруа Мерлен|леруа|lemana pro|лемана про|лемана:home;ОБИ|obi:home;Петрович:home;Hoff|хофф:home;IKEA|икеа|swed house:home;Максидом:home;Всеинструменты.ру|все инструменты|всеинструменты:home;
Castorama|касторама:home;Бауцентр:home;Твой Дом:home;Cozy Home|кози хоум:home;Askona|аскона:home;Орматек:home;Много Мебели:home;Шатура:home;Lazurit|лазурит:home;Zara Home|зара хоум:home;
Спортмастер|sportmaster:sport;Декатлон|desport|decathlon:sport;Триал-Спорт|триал спорт:sport;Kant|кант:sport;Экспедиция:sport;
World Class|ворлд класс:fitness;Fitness House|фитнес хаус:fitness;X-Fit|икс фит:fitness;DDX|ддх:fitness;Spirit Fitness|спирит фитнес:fitness;Alex Fitness|алекс фитнес:fitness;Территория фитнеса:fitness;
Детский мир:kids;Гулливер|gulliver:kids;Toy.ru|той ру:kids;Hamleys|хэмлис:kids;Дочки-Сыночки|дочки сыночки:kids;Кораблик:kids;
Четыре лапы|4 лапы:pets;Бетховен:pets;Зоозавр:pets;Petshop|петшоп:pets;Зоомир:pets;Старая ферма:pets;
Читай-город|читай город:books;Буквоед:books;Литрес|litres:books;Республика:books;Московский дом книги|мдк:books;Лабиринт|labirint:books;Book24|бук24:books;Подписные издания:books;
Комус|komus:office;
Синема Парк|формула кино:cinema;КАРО|karo:cinema;Киномакс:cinema;Синема Стар|cinema star:cinema;Мираж Синема:cinema;Киноплекс:cinema;Люксор|luxor:cinema;
Яндекс Афиша:events;Кассир.ру|кассир:events;Ticketland|тикетленд:events;Концерт.ру|концерт ру:events;
Кинопоиск:digital;Иви|ivi:digital;Okko|окко:digital;Яндекс Плюс:digital;Кион|kion:digital;Wink|винк:digital;Premier|премьер:digital;More.tv|море тв:digital;
VK Музыка|вк музыка:digital;Звук|сбер звук:digital;Steam|стим:digital;PlayStation Store|playstation:digital;
МТС|mts:telecom;Билайн|beeline:telecom;МегаФон|мегафон:telecom;Т2|tele2|теле2:telecom;Ростелеком:telecom;Yota|йота:telecom;Дом.ру|дом ру:telecom;МГТС:telecom;Т-Мобайл|тинькофф мобайл:telecom;СберМобайл:telecom;
Skillbox|скиллбокс:edu;Яндекс Практикум|практикум:edu;Нетология:edu;GeekBrains|гикбрейнс:edu;Skyeng|скайенг:edu;Фоксфорд|foxford:edu;Учи.ру|учи ру:edu;
Флорист.ру|флорист:flowers;Flowwow|флаувау:flowers;Семицветик:flowers;
AnyGift|энигифт:gifts;Giftery|гифтери:gifts;Подарок.ру:gifts;
Мосэнергосбыт:utilities;МОЭК:utilities;Госуслуги|gosuslugi:utilities;
Wildberries|вайлдберриз|валберис|вб|wb:market;Ozon|озон:market;Яндекс Маркет|yandex market:market;Мегамаркет|сбермегамаркет:market;AliExpress|алиэкспресс|али:market;
Магнит Маркет|kazanexpress|казанэкспресс:market;Авито|avito:market`;
const MERCHANTS=MERCHANTS_RAW.split(";").map(x=>x.trim()).filter(Boolean).map(x=>{ const i=x.lastIndexOf(":"); return [x.slice(0,i).split("|").map(s=>s.trim()), x.slice(i+1).trim()]; }).filter(([n,k])=>MCC_GROUPS[k]);
// найти сеть или MCC-код по запросу
function merchantFor(q){
  const nq=norm(q).replace(/[«»"']/g,"").trim(); if(nq.length<2) return null;
  if(/^\d{4}$/.test(nq)){ const key=MCC_CODES[nq] || (+nq>=3000 && +nq<=3350 ? "air" : +nq>=3351 && +nq<=3500 ? "carshare" : +nq>=3501 && +nq<=3999 ? "hotel" : null);
    if(key){ const g=MCC_GROUPS[key]; return {name:"MCC "+nq, key, ...g, mcc:nq, byCode:true}; } return null; }
  let best=null;
  // обычные слова («кофе», «такси») ищем как категорию, а не как начало названия сети
  const generic = expand(q).length>1;
  for(const [names,key] of MERCHANTS) for(const n of names){ const nn=norm(n).replace(/[«»"']/g,"");
    let sc = nq===nn ? 3 : generic ? 0 : (nq.length>=4 && nn.startsWith(nq)) ? 2 : (nq.length>=4 && nn.length>=4 && nq.startsWith(nn)) ? 1 : 0;
    if(sc && (!best || sc>best.sc)) best={sc, name:names[0], key}; }
  return best ? {name:best.name, key:best.key, ...MCC_GROUPS[best.key]} : null;
}
function merchantSuggestions(q){
  const nq=norm(q); if(nq.length<2) return [];
  const out=[], seen=new Set();
  for(const [names,key] of MERCHANTS){
    const hit=names.find(n=>norm(n).startsWith(nq) || (nq.length>=3 && norm(n).includes(nq))); if(!hit || seen.has(names[0])) continue; seen.add(names[0]);
    const g=MCC_GROUPS[key]; let best=null;
    const prim=g.terms.filter(t=>!t.startsWith("~")), sim=g.terms.filter(t=>t.startsWith("~")).map(t=>t.slice(1));
    for(const ts of [prim,sim]){ if(best||!ts.length) break;
      for(const c of cards) for(const it of c.items||[]) if(!isBase(it.n) && matches(it,ts) && (!best||it.p>best.p)) best={p:it.p,bank:c.bank}; }
    if(best) out.push({n:names[0], p:best.p, bank:best.bank, kind:"merchant", cat:g.label});
    if(out.length>=4) break;
  }
  return out;
}

function ranking(){
  let terms = expand(query); if(!terms.length) return null;
  // сеть магазинов или MCC-код → добавляем её категорию (Ростикс → Фастфуд)
  const merchant = merchantFor(query);
  // сначала ищем точную категорию (Фастфуд), и только если её нет ни на одной карте — похожую (Кафе) — «~» в списке
  const primary = merchant ? merchant.terms.filter(t=>!t.startsWith("~")) : [];
  const similar = merchant ? merchant.terms.filter(t=>t.startsWith("~")).map(t=>t.slice(1)) : [];
  const rank = ts => { const r = cards.map(c => ({card:c, ...rankCard(c,ts)})); r.sort((a,b)=> (a.base-b.base) || (b.p-a.p)); return r; };
  terms=[...terms, ...primary.filter(t=>!terms.includes(t))];
  let r = rank(terms), viaSimilar=false;
  if(similar.length && r.every(x=>x.base)){ terms=[...terms, ...similar]; r=rank(terms); viaSimilar=!r.every(x=>x.base); }
  // в «следом» не подмешиваем похожие категории, если точная нашлась
  return {terms, list:r, merchant, viaSimilar};
}
