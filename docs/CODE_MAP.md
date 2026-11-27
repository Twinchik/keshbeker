# Карта кода

| Область | Где искать |
| --- | --- |
| Формат карты, месяцы, MCC, категории, ранжирование | [js/data.js](../js/data.js) |
| Кошелёк, подсказки, сортировка карт | [js/wallet.js](../js/wallet.js) |
| Редактор, сохранение, корзина | [js/editor.js](../js/editor.js) |
| Вход, профиль, гостевой режим, Supabase | [js/account.js](../js/account.js) · [js/config.js](../js/config.js) |
| Карты лояльности и подбор карты для магазина | [js/shops.js](../js/shops.js) |
| OCR и парсинг текста, обработка фото | [js/scan.js](../js/scan.js) · [js/photo.js](../js/photo.js) |
| Установка, темы, подсказки, аналитика | [js/install.js](../js/install.js) · [js/theme.js](../js/theme.js) · [js/onboarding.js](../js/onboarding.js) · [js/metrics.js](../js/metrics.js) |
| Разметка, стили, PWA | [index.html](../index.html) · [css/style.css](../css/style.css) · [sw.js](../sw.js) · [manifest.webmanifest](../manifest.webmanifest) |
| Генерация индекса и поиск | [scripts/generate-code-map.mjs](../scripts/generate-code-map.mjs) · [scripts/find-symbol.mjs](../scripts/find-symbol.mjs) |

`npm run code:find -- rank` или `npm run code:find -- --file js/data.js`.
Индекс в [code-index/](code-index/) хранит один JSON на исходный файл. Строки сверяй с исходником.
`npm run code:index` обновляет индекс. `npm run code:index:check` сравнивает индекс без записи.

Генератор читает корневые исходники и каталоги `js/`, `src/`, `app/`, `mobile/`, `scripts/`.
В тесте классического скрипта можно явно указать `// @covers js/data.js#rankCard`.
Связь добавляется к однозначному символу. Для модулей учитываются прямые именованные импорты в тестах.
