# ТЗ: Фронтенд — три реализации TODO-приложения

## 1. Тема дипломной работы

**«Создание и сравнение трёх реализаций TODO-приложения на разных фреймворках»**

- Один общий бэкенд (FastAPI, PostgreSQL)
- Три отдельных фронтенд-приложения: **Svelte**, **Vue.js**, **React**
- Каждое приложение — отдельный проект в своей папке репозитория

---

## 2. Технические требования (общие для всех)

| Параметр | Значение |
|----------|----------|
| Язык | JavaScript (TypeScript по желанию для Vue/React) |
| Стили | Чистый CSS или CSS-модули; **без обязательного Tailwind** |
| UI | На усмотрение: **свои компоненты** (как в Svelte) или UI-библиотека (например Ant Design) — главное **единый функционал** и **различие цветовых схем** по фреймворкам |
| Бэкенд | Один общий REST + WebSocket API (FastAPI) |
| Сборка | Рекомендуется **Vite** |

### 2.1 Фактическая реализация Svelte (`frontend-svelte`)

- **Vite** + **Svelte 5**, роутинг **`svelte-spa-router`**, навигация по **`hash`** (`#/`, `#/login`, …)
- **Без Ant Design**: переиспользуемые компоненты (`Button`, `Input`, `Card`, `Modal`, `FormItem`, `CategoryPicker`, `CategoryBadges`) и глобальные CSS-переменные (оранжевая тема, шрифт DM Sans)
- Состояние: **`svelte/store`** — `user`, `token`, **`authReady`** (после `GET /auth/me` при наличии токена), `location`
- Реактивность Svelte 5: `$state`, `$derived`, `$effect` на страницах деталей
- `transition` (например `slide`, `fade`, `fly` в модалках/дашборде)
- `use:` **actions** (например `clickOutside` для меню пользователя)
- API-слой: один модуль `src/lib/api.js` — `fetch` + Bearer, `formatApiError` для 422

Остальные фронтенды должны **повторять поведение** (маршруты, поля форм, вызовы API), чтобы сравнение было честным.

### 2.2 Фактическая реализация Vue (`frontend-vue`)

- **Vite** + **Vue 3** (Composition API), **Vue Router** в режиме **hash** (`#/…`)
- **Ant Design Vue** (`ant-design-vue`), глобальная зелёная тема: `ConfigProvider` + градиентная шапка в `#178a5c`
- Состояние сессии: **`provide` / `inject`** (`AUTH_INJECTION_KEY`, composable `useAuth`), перед монтированием **`await auth.initAuth()`** — паритет с `authReady` в Svelte
- API: тот же контракт, что и в `frontend-svelte/src/lib/api.js` (`src/api/client.js`)
- Порт dev по умолчанию **5174** (чтобы не конфликтовать с Svelte на 5173)

---

## 3. Цветовые схемы

| Фреймворк | Цветовая гамма |
|-----------|----------------|
| Svelte | Оранжевые тона (`--primary` ≈ #e07820 и производные) — **реализовано** |
| Vue.js | Зелёные тона — **реализовано** (`#178a5c`, Ant Design Vue) |
| React | Голубые тона — **к реализации** (подробно в `TZ_react.md`) |

---

## 4. Обязательное использование уникальных фич фреймворков

Каждое приложение должно активно использовать возможности, которых нет или которые реализованы иначе в других фреймворках.

### 4.1 Svelte — сделано

- **Stores** (`writable`, `derived`)
- **Реактивность** (в т.ч. runes Svelte 5: `$state`, `$derived`, `$effect`)
- **Transitions** (`transition:`, `in:`, `out:`)
- **Actions** (`use:action`)

### 4.2 Vue.js — реализовано (`frontend-vue`)

- **Composition API** (`ref`, `reactive`, `computed`, `watch`)
- **Slots** — `PageCard` (default + `title` / `extra`)
- **Provide / Inject** — тема `appTheme` (primary `#178a5c`) для дочерних компонентов
- **Teleport** — панель «Справка» (`HelpPanel.vue`)
- **Custom directive** — `v-click-outside` (меню пользователя)
- **Vite** + **Vue Router** (hash), **Ant Design Vue** + зелёная тема через `ConfigProvider`

### 4.3 React — автор диплома (самостоятельно)

- **Hooks** (`useState`, `useEffect`, `useContext`, при необходимости `useReducer`, `useMemo`, `useCallback`)
- **Context API** (auth и т.д.)
- **Custom hooks** (`useAuth`, `useWebSocket`, …)
- **Strict Mode** в `main.jsx`

Детальный пошаговый план — в **`TZ_react.md`**.

---

## 5. Функционал приложений (паритет с текущим бэкендом и Svelte)

Все три приложения реализуют один контракт с API:

| Область | Поведение |
|---------|-----------|
| Регистрация / вход | `POST /auth/register`, `POST /auth/login` (OAuth2 form: `username`=email, `password`), токен в `localStorage`, `GET /auth/me` |
| Сессия | Пока идёт проверка токена — **не показывать одновременно** шапку приложения и форму логина (аналог `authReady`) |
| Проекты | CRUD: список, деталь, создание/редактирование в модалках, удаление с подтверждением |
| Участники проекта | Только у владельца: список участников, **приглашение по email** — `POST /projects/{id}/members` с телом `{ "email": "..." }` (пользователь уже зарегистрирован) |
| Задачи | CRUD; исполнитель — только из **участников проекта** (`executor_id`); категории — `category_ids`; статус/приоритет как в API; **дедлайн** в ISO8601; при `datetime-local` на фронте отправлять UTC/корректную строку (бэкенд нормализует под `TIMESTAMP` при необходимости) |
| Категории | Отдельная страница CRUD, цвет (`color`) + название |
| Дашборд | `GET /stats/dashboard` — по статусам, просрочка, топ просроченных, последние выполненные |
| Чат проекта | REST: `GET/POST /projects/{id}/chat/messages` |
| Чат задачи | История: `GET /tasks/{id}/comments`; в реальном времени: **WebSocket** `WS .../chat/ws/tasks/{task_id}?token=...`, отправка `{"text":"..."}`; fallback на `POST` комментария при отсутствии WS |
| Общий чат | `GET /chat/global/messages`, `POST /chat/global/messages`, **WS** `.../chat/ws/global?token=...` |

Наблюдатели задач (`observer_ids`), если есть в схеме API, можно не выносить в UI до появления на бэкенде в явном виде — в Svelte сейчас акцент на исполнителе и категориях.

---

## 6. Структура репозитория

```
Diploma/
├── backend/              # FastAPI
├── frontend-svelte/      # готово
├── frontend-vue/         # готово (Vue 3 + Ant Design Vue, зелёная тема)
├── frontend-react/       # предстоит (см. TZ_react.md)
├── docker-compose.yml    # БД + backend (фронты обычно `npm run dev` локально)
└── …
```

---

## 7. Docker Compose

Текущий `docker-compose.yml` поднимает **PostgreSQL** и **backend**. Фронтенды при разработке запускаются отдельно, например:

```bash
cd frontend-svelte && npm install && npm run dev
# или Vue (порт 5174 по умолчанию в vite.config):
cd frontend-vue && npm install && npm run dev
```

При необходимости для защиты можно добавить сервисы с образами фронтов или `profiles` — не обязательно для сравнения фреймворков.

Переменные: у фронта **`VITE_API_URL`** (например `http://localhost:4000` если бэкенд в Docker на порту 4000 — см. `docker-compose.yml`).

---

## 8. План реализации

| Приложение | Кто делает | Статус |
|------------|------------|--------|
| Svelte | реализовано (AI/итерации) | **готово** |
| Vue.js | по ТЗ | **готово** (`frontend-vue`) |
| React | автор диплома | по **`TZ_react.md`** |

---

## 9. API Backend (справка, синхронизирована с кодом)

**Base URL:** из `VITE_API_URL` (например `http://localhost:8000` или порт из Docker)

### Auth

- `POST /auth/register` — JSON `{ email, password }`
- `POST /auth/login` — form `username` (email), `password` → `{ access_token }`
- `GET /auth/me` — Bearer

### Projects

- `GET /projects/`, `POST /projects/`
- `GET /PUT /DELETE /projects/{id}`
- `GET /projects/{id}/chat/messages`, `POST /projects/{id}/chat/messages` — тело `{ text }`
- `POST /projects/{id}/members` — например `{ "email": "user@mail.com" }` или `user_id` (см. бэкенд)

### Tasks

- `GET /tasks/` — query: в т.ч. `project_id`
- `POST /tasks/`, `GET /PUT /DELETE /tasks/{id}`
- `GET /POST /tasks/{id}/comments`

### Categories

- `GET /POST /categories/`
- `GET /PUT /DELETE /categories/{id}`

### Stats

- `GET /stats/?period=week|month|all`
- `GET /stats/dashboard`

### Chat (HTTP + WS)

- `GET /chat/global/messages`, `POST /chat/global/messages`
- `WS /chat/ws/global?token=...`
- `WS /chat/ws/tasks/{task_id}?token=...`

Сообщения WS от сервера — смотреть обработчик в Svelte (`TaskDetail.svelte`, `GlobalChat.svelte`): тип `message`, поля `id`, `text`, `email` и т.д.

---

## 10. Сравнение в пояснительной записке

Имеет смысл зафиксировать: размер бандла, время первой отрисовки, удобство роутинга/состояния, реализация WebSocket, объём шаблонного кода — при **одинаковом** функционале по таблице из раздела 5.
