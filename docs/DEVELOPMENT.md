# Разработка

Используй Node.js 22 (минимум 22.13), npm и `npm ci`. Для локального запуска PWA выполни `npm run dev` и открой http://127.0.0.1:4173. Обычная локальная страница сохраняет настройки штатных сервисов. Для изолированной проверки используй [тесты](TESTING.md).

Работай в отдельной ветке от develop. Назначение веток и правила согласования указаны в [AGENTS.md](../AGENTS.md). После изменения браузерных CSS/JS при подготовке публикации обнови их версии `?v=` по [README](../README.md).

Проектные настройки Codex применяются к доверенному репозиторию. Используй [официальные настройки](https://developers.openai.com/codex/config-reference), [формат ролей](https://developers.openai.com/codex/multi-agent) и [каталог Skills](https://developers.openai.com/codex/skills). При передаче работы обновляй [STATUS.md](STATUS.md).

В Codex CLI 0.172.0 лимит потоков называется `agents.max_concurrent_threads_per_session`.
`agents.max_depth` ограничивает вложенность V1. Для V2 запрет вложенного делегирования задан в инструкциях ролей.
Роли architect и reviewer предназначены для чтения. Их shell и запрос дополнительных разрешений выключены.
Параметры сверены со [схемой CLI 0.172.0](https://raw.githubusercontent.com/openai/codex/rust-v0.172.0/codex-rs/core/config.schema.json).
