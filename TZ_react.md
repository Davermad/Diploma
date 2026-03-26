# Пошаговое руководство: React-приложение TODO (паритет с `frontend-svelte`)

Документ описывает, **что именно** реализовать на React, в каком порядке и с какими деталями контракта с бэкендом. Ориентир по UX и API — текущий **`frontend-svelte`** и **`backend`**.

**Цветовая схема React:** голубая гамма (отдельно от оранжевого Svelte и зелёного Vue). Задай CSS-переменные, например `--primary: #1890ff` (или свой оттенок), `--primary-dark`, `--bg`, `--surface`, `--text`, `--border`, `--danger` и используй их в компонентах.

**Роутинг:** для единообразия с Svelte удобен **hash-router** (`#/`, `#/login`), чтобы не настраивать `historyApiFallback` на сервере. В React Router v6: `createHashRouter` + `RouterProvider`. Альтернатива — `BrowserRouter` + `basename` — тогда dev через Vite без доп. настроек.

**Переменные окружения:** файл `.env`:

```env
VITE_API_URL=http://localhost:4000
```

(порт возьми из своего `docker-compose` / запуска бэкенда).

---

## Шаг 0. Зависимости и запуск

```bash
npm create vite@latest frontend-react -- --template react
cd frontend-react
npm install react-router-dom
npm install
```

- В `main.jsx` оберни приложение в **`React.StrictMode`**.
- Скопируй структуру папок (см. шаг 2), подключи **`src/index.css`** с голубой темой.

Проверка: `npm run dev` открывает пустую страницу без ошибок.

---

## Шаг 1. Базовый URL и HTTP-клиент

Создай **`src/api/client.js`** (или один файл `api.js`, как в Svelte):

1. `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'`
2. Функция **`getToken()`** — `localStorage.getItem('token')`
3. Функция **`formatApiError(body)`** — как в Svelte: `detail` строка или массив объектов с `msg` (FastAPI 422)
4. Функция **`request(path, options)`**:
   - заголовок `Content-Type: application/json` для JSON-тел
   - если есть токен — `Authorization: Bearer ${token}`
   - при **401**: удалить токен, редирект на логин. Для hash-router: `window.location.hash = '#/login'` или `navigate('/login')` из роутера
   - при ошибке: `res.json()`, бросить `Error(formatApiError(...))`
   - **204** → `null`

Отдельно реализуй **`auth.login(email, password)`**:

- `POST ${API_URL}/auth/login` с телом **`FormData`**: `username` = email, `password` = password (не JSON — так устроен OAuth2 password flow в FastAPI)
- при успехе вернуть JSON с **`access_token`**

Остальные методы разнеси по модулям или одному объекту, **как в** `frontend-svelte/src/lib/api.js`:

| Модуль | Методы |
|--------|--------|
| `auth` | `register`, `me` |
| `projects` | `list`, `get`, `create`, `update`, `delete`, `getChat`, `sendMessage`, `addMember` |
| `tasks` | `list(params)`, `get`, `create`, `update`, `delete`, `getComments`, `addComment` |
| `categories` | полный CRUD |
| `stats` | `get(period)`, `dashboard` |
| `chat` | `globalMessages`, `sendGlobalMessage` |

Плюс **`getWsUrl(path)`**: `API_URL.replace(/^http/, 'ws') + path` для WebSocket URL.

Проверка: из консоли после импорта вызвать `request('/stats/dashboard')` с подставленным токеном (или через временную кнопку) и убедиться, что ответ приходит.

---

## Шаг 2. Структура папок (рекомендуемая)

```
frontend-react/src/
├── api/
│   ├── client.js       # request, formatApiError, getToken, getWsUrl
│   ├── auth.js
│   ├── projects.js
│   ├── tasks.js
│   ├── categories.js
│   ├── stats.js
│   └── chat.js
├── contexts/
│   └── AuthContext.jsx    # или AuthProvider + useAuth
├── hooks/
│   useAuth.js             # обёртка над контекстом (опционально)
│   useWebSocket.js        # опционально: url, onMessage, send
├── components/
│   Button.jsx
│   Input.jsx
│   Card.jsx
│   Modal.jsx
│   FormItem.jsx
│   CategoryPicker.jsx     # мультивыбор категорий для задачи
│   CategoryBadges.jsx
├── pages/
│   Login.jsx
│   Register.jsx
│   Dashboard.jsx
│   Projects.jsx
│   ProjectDetail.jsx
│   TaskDetail.jsx
│   Categories.jsx
│   GlobalChat.jsx
├── App.jsx                # layout: навбар + Outlet / защита маршрутов
├── main.jsx
└── index.css              # голубая тема, глобальные классы (.page-shell, .muted)
```

Имена можно чуть менять; важно покрыть **все страницы** из таблицы ниже.

---

## Шаг 3. Auth Context и флаг «сессия проверена»

Создай **`AuthContext`**:

**Состояние:**

- `user` — объект пользователя или `null` (ответ `GET /auth/me`)
- `token` — строка или `null`, синхронизирована с `localStorage`
- **`authReady`** — `false` до завершения первой проверки токена, затем `true`

**При монтировании приложения** (`useEffect` в Provider):

1. `authReady = false`
2. если в `localStorage` нет токена → `user = null`, `authReady = true`
3. если токен есть → `GET /auth/me`; при успехе `user = data`, при ошибке очистить токен и `user`
4. в `finally` → `authReady = true`

**Методы:**

- `login(email, password)` — `auth.login` → сохранить `access_token` → снова `me()` → выставить `user`
- `register(email, password)` — `POST /auth/register` → затем `login(...)`
- `logout()` — очистить токен и `user`

**Экспорт:** `useAuth()` — хук, который читает контекст (иначе ошибка вне Provider).

Поведение как в Svelte: **пока `authReady === false`**, показывай один экран «Проверка сессии…» (спиннер), **не** рендери одновременно навбар и форму логина.

---

## Шаг 4. Маршруты и защита

Таблица маршрутов (аналог Svelte):

| Путь | Страница | Доступ |
|------|----------|--------|
| `/` | Dashboard | только авторизованный |
| `/login` | Login | гость (авторизованного редирект на `/`) |
| `/register` | Register | гость |
| `/projects` | Projects | авторизованный |
| `/projects/:id` | ProjectDetail | авторизованный |
| `/tasks/:id` | TaskDetail | авторизованный |
| `/categories` | Categories | авторизованный |
| `/chat` | GlobalChat | авторизованный |

Реализуй:

- **`ProtectedRoute`**: если `!authReady` — спиннер; если `!user` — редирект на `/login`
- **`GuestRoute`** (опционально): если `user` — редирект на `/`

В **`App.jsx`** для авторизованной зоны: шапка с ссылками (Дашборд, Проекты, Категории, Общий чат), меню пользователя (email), выход. Стили — в голубой гамме, аналог `App.svelte`.

---

## Шаг 5. Страница Login

- Поля: email, password
- Submit: `login`, при успехе `navigate('/')`
- Ошибка: баннер с текстом из `Error.message`
- Ссылка на регистрацию

Используй свои `Input`, `Button`, `FormItem` или Ant Design — по желанию.

---

## Шаг 6. Страница Register

- Аналогично логину; после успеха — на дашборд или логин (как в Svelte — сразу сессия через `register` → `login`).

---

## Шаг 7. Dashboard

- `GET /stats/dashboard`
- Отобрази:
  - **by_status** — подписи статусов: TODO → «К выполнению», IN_PROGRESS → «В работе», DONE → «Выполнено» / «Готово» (как в Svelte)
  - **overdue_count**
  - **top_overdue** — ссылки на `#/tasks/:id`
  - **last_completed** — ссылки на задачи

Пока данные грузятся — текст «Загрузка…». Ошибка — сообщение или toast.

---

## Шаг 8. Проекты (список)

- `GET /projects/`
- Кнопка «Создать проект» → **модалка**: название, описание → `POST /projects/`
- Карточки проектов: описание, кнопки:
  - **Открыть** → `navigate('/projects/' + id)`
  - если `user.id === project.owner_id`: **Изменить** (модалка `PUT`), **Удалить** (`DELETE` + confirm)

---

## Шаг 9. Проект (деталь)

Загрузка параллельно:

- `GET /projects/:id` — в ответе должны быть **`members`** (для списка исполнителей и приглашений)
- `GET /tasks/?project_id=...`
- `GET /projects/:id/chat/messages`
- `GET /categories/`

**Блок «Участники»** (только владелец):

- Список email участников
- Поле email + кнопка «Добавить в проект» → `POST /projects/:id/members` с `{ email }`
- Ответы бэкенда: если пользователь уже в проекте — показать сообщение (в Svelte был `alert` с текстом от API)

**Задачи:**

- Список с названием, **бейджами категорий**, исполнителем, статусом
- Ссылка на `#/tasks/:id`

**Чат проекта:**

- Лента сообщений из `getChat`
- Ввод + отправка `sendMessage(projectId, text)`
- Enter в поле — по желанию отправка (как в Svelte)

**Кнопки владельца:** редактирование проекта (`PUT`), удаление (`DELETE`) с confirm.

**Создание задачи** — модалка с полями:

- title, description
- **CategoryPicker** — множественный выбор `category_ids`
- **Исполнитель** — `<select>`: пусто или id из **`memberOptions`** (уникальные `project.members`, сортировка по email)
- status, priority (как в API: TODO / IN_PROGRESS / DONE, LOW / MEDIUM / HIGH)
- `POST /tasks/` с `project_id`, `executor_id` или `null`, `category_ids`

---

## Шаг 10. Задача (деталь)

Загрузка:

- `GET /tasks/:id` — с вложенными `project`, `categories`, `creator`, `executor` если API отдаёт
- `GET /categories/`
- `GET /projects/:project_id` — чтобы получить **members** для смены исполнителя
- `GET /tasks/:id/comments` — история чата

**Права редактирования:** как в Svelte — `canEditTask`: пользователь совпадает с `creator_id` или `owner_id` задачи (уточни по своему `backend`, поля должны быть в ответе `GET /tasks/:id`).

Для редактирования задачи (модалка):

- title, description, status, priority
- **deadline**: `input type="datetime-local"`; при сохранении отправляй **`new Date(value).toISOString()`** или снимай локаль в UTC — как в Svelte `TaskDetail.svelte`

**Исполнитель** (если `canEditTask` и есть проект):

- select из `project.members`, кнопка «Сохранить» → `PUT /tasks/:id` с `{ executor_id }`

**Категории:**

- `CategoryPicker` + кнопка сохранения → `PUT` с `{ category_ids: [...] }`

**Удаление задачи** — confirm, затем `DELETE`, редирект на проект или список проектов.

---

## Шаг 11. WebSocket — чат задачи

1. URL: `getWsUrl('/chat/ws/tasks/' + taskId + '?token=' + encodeURIComponent(token))`
2. При `onopen` можно выставить флаг «WS подключён»
3. `onmessage`: `JSON.parse`, если `type === 'message'` — добавить сообщение в state (проверка по `id`, чтобы не дублировать)
4. Отправка: `ws.send(JSON.stringify({ text }))`
5. Если WS недоступен — отправка через **`addComment(taskId, text)`** (как fallback в Svelte)

Поля входящего сообщения сопоставь с бэкендом (`id`, `text`, `email`, …).

---

## Шаг 12. Общий чат

- Загрузка: `chat.globalMessages()`
- Отправка: `chat.sendGlobalMessage(text)` или через WS `.../chat/ws/global?token=...`
- Список сообщений: email автора + текст

---

## Шаг 13. Категории (CRUD)

- Список `GET /categories/`
- Создание/редактирование: имя + **color** (input type color), `POST` / `PUT`
- Удаление с confirm
- Карточки с акцентной полосой цвета (логика как в Svelte `Categories.svelte`)

---

## Шаг 14. Кастомные хуки (React-фича)

Реализуй минимум:

1. **`useAuth`** — если не вынесено в отдельный файл, достаточно `useContext(AuthContext)`
2. **`useWebSocket(url, { onMessage, enabled })`** — в `useEffect` создаёт `WebSocket`, чистит при размонтировании / смене url; опционально возвращает `{ send, ready }`

Используй **`useMemo` / `useCallback`** там, где передаёшь колбэки дочерним компонентам и есть риск лишних ререндеров (по желанию, но для диплома — явное использование).

---

## Шаг 15. UI-компоненты (минимум)

Чтобы не разъезжался вид, сделай примитивы:

- **Button**: варианты `primary`, `default`, `danger`; состояние `loading`; `type="submit"`
- **Input**: общий стиль фокуса
- **Modal**: оверлей, крестик, клик по фону закрывает
- **Card**: заголовок + тело
- **FormItem**: label + error

Голубая палитра задаётся в **`index.css`** через `:root`.

---

## Шаг 16. Обработка ошибок и edge cases

- Любой `fetch` через единый `request` с **formatApiError**
- Пустые списки — дружелюбный текст («Нет проектов», …)
- После **401** не оставляй «полупустой» UI без редиректа

---

## Шаг 17. Сборка и проверка перед защитой

```bash
npm run build
```

Чек-лист:

- [ ] Регистрация, логин, выход
- [ ] `authReady`: нет мигания дашборда и формы входа
- [ ] CRUD проектов; участники по email (владелец)
- [ ] CRUD задач: категории, исполнитель из участников, дедлайн
- [ ] CRUD категорий
- [ ] Дашборд (`/stats/dashboard`)
- [ ] Чат проекта (REST)
- [ ] Чат задачи: комментарии + WS (+ fallback)
- [ ] Общий чат: HTTP + WS
- [ ] Голубая тема отличается от Svelte/Vue
- [ ] **StrictMode** включён

---

## Шаг 18. Сравнение с Svelte (для текста диплома)

Зафиксируй в таблице: объём кода (строки), количество файлов, время на типичный сценарий (создание задачи с категориями), удобство работы с WebSocket и формами.

---

## Полезные ссылки

- [React](https://react.dev/)
- [React Router](https://reactrouter.com/) — раздел Hash Router
- [Vite](https://vitejs.dev/)
- Контракт API — живой код: `frontend-svelte/src/lib/api.js`, роуты — `App.svelte`
