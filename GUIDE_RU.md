# Быстрый запуск FactGuard AI

## Что внутри
- `contracts/fact_guard.py` — GenLayer intelligent contract
- `frontend/` — красивый статический frontend для GitHub Pages
- `deploy/001_deploy_fact_guard.ts` — deploy script
- `tests/direct/test_fact_guard.py` — direct-mode test scaffold

## Самый короткий путь
1. Разверни `contracts/fact_guard.py` в GenLayer Studio.
2. Скопируй адрес контракта.
3. В `frontend/.env` укажи:
   - `VITE_GENLAYER_NETWORK=studionet`
   - `VITE_CONTRACT_ADDRESS=0x...`
   - `VITE_BASE_PATH=/`
4. Запусти frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
5. Для GitHub Pages просто пушни репозиторий и включи GitHub Actions Pages.

## Что проверяет MVP
- текст
- статьи
- твиты / треды
- видео через вставленный транскрипт
- URL источников

## Как работает verdict
Контракт принимает claim + source text + URL, при необходимости делает web fetch и screenshot, затем формирует структурированный verdict:
- `LIKELY_TRUE`
- `LIKELY_FALSE`
- `MIXED_OR_UNCLEAR`

## Важно
GitHub Pages хостит только frontend. Логика fact-checking живёт в GenLayer contract.
