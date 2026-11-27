# Тестирование

| Команда | Проверка |
| --- | --- |
| `npm test` | Все тесты Vitest |
| `npm run test:unit` | Нормализация, поиск, OCR, подбор карты, генерация индекса |
| `npm run test:integration` | Сценарии между модулями и CLI индекса |
| `npm run test:e2e` | Chromium, локальный HTTP и синтетический кошелёк |
| `npm run test:coverage` | Покрытие тестируемых браузерных модулей |
| `npm run lint` | ESLint |
| `npm run check` | Актуальность индекса, ESLint и Vitest |

Перед E2E установи Chromium командой `npx playwright install chromium`. С установленным Google Chrome можно запустить `KESHBEKER_BROWSER_CHANNEL=chrome npm run test:e2e`. E2E подставляет синтетическую конфигурацию и заглушку клиента Supabase, блокирует внешние запросы и сервис-воркеры. Smoke проверяет гостевой поток. Unit и integration исполняют исходные классические скрипты в отдельном контексте с минимальными подстановками браузера и замороженным временем. Используй только синтетические fixtures.
