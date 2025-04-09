# WinstonVPN Bot

Telegram бот для продажи подписок на VPN-сервис. Использует GrammY для работы с Telegram Bot API, Convex для базы данных и серверной логики, и интегрируется с 3x-ui API для управления VPN-аккаунтами.

## Технологический стек

- Node.js
- TypeScript
- GrammY (фреймворк для Telegram ботов)
- Convex (база данных и бэкенд)
- 3x-ui API (управление VPN)

## Установка и запуск

### Предварительные требования

- Node.js 18+ и npm
- Аккаунт Convex (https://www.convex.dev/)
- Сервер с установленным 3x-ui

### Установка зависимостей

```bash
npm install
```

### Настройка окружения

1. Скопируйте файл `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Заполните необходимые переменные окружения в файле `.env`:
   - `BOT_TOKEN` - токен вашего Telegram бота (получите у [@BotFather](https://t.me/BotFather))
   - `ADMIN_TELEGRAM_IDS` - Telegram ID администраторов (через запятую)
   - `CONVEX_DEPLOYMENT` - ID деплоя Convex
   - `XUI_API_URL` - URL вашего сервера с 3x-ui
   - `XUI_API_USERNAME` - Имя пользователя для доступа к API 3x-ui
   - `XUI_API_PASSWORD` - Пароль для доступа к API 3x-ui
   - `XUI_DEFAULT_INBOUND_ID` - ID inbound сервера в 3x-ui

### Инициализация Convex

```bash
npx convex dev
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Запуск в production режиме

```bash
npm run build
npm start
```

## Основные функции бота

- Регистрация пользователя
- Выбор и выдача бесплатной подписки VPN
- Просмотр информации о подписке и использованном трафике
- Административные функции для управления пользователями и подписками

## Структура проекта

```
├── convex/                      # Серверный код Convex
│   ├── schema.ts                # Схема данных Convex
│   ├── users.ts                 # Логика работы с пользователями
│   ├── subscriptionPlans.ts     # Управление тарифами
│   ├── userSubscriptions.ts     # Управление подписками пользователей
│   ├── vpnAccounts.ts           # Управление VPN-аккаунтами
│   └── http/                    # HTTP хендлеры для вебхуков
│
├── src/
│   ├── api/                     # Интеграция с 3x-ui API
│   │   ├── xui-client.ts        # Класс для работы с 3x-ui API
│   │   └── models.ts            # Типы данных для API
│   │
│   ├── bot/                     # Код Telegram бота
│   │   ├── bot.ts               # Инициализация бота
│   │   ├── commands/            # Обработчики команд
│   │   ├── middlewares/         # Промежуточные обработчики
│   │   ├── scenes/              # Сцены для сложных диалогов
│   │   └── keyboards.ts         # Клавиатуры и кнопки
│   │
│   ├── utils/                   # Вспомогательные функции
│   │   ├── config.ts            # Конфигурация приложения
│   │   └── logger.ts            # Логирование
│   │
│   └── index.ts                 # Точка входа
│
├── .env.example                 # Пример .env файла
├── .gitignore
├── convex.json                  # Конфигурация Convex
├── package.json
├── tsconfig.json
└── README.md
```

## Дальнейшее развитие

- Интеграция платежной системы YooKassa
- Дополнительные тарифы и планы подписок
- Реферальная система
- Статистика и аналитика
- Автоматическое продление подписок 