# 🔐 Management Server

Безопасное клиент-серверное приложение для управления конфиденциальной информацией пользователей с поддержкой локального и удаленного режимов работы.

## 🌟 Особенности

- **🔒 End-to-End шифрование** - Все данные шифруются на клиенте перед отправкой
- **🔑 Мастер-пароль** - Единый пароль для доступа ко всем данным
- **🌐 Гибридный режим** - Автоматический выбор между локальным и удаленным сервером
- **💻 Electron приложение** - Кроссплатформенный десктопный клиент
- **🛡️ Многоуровневая безопасность** - Защита на всех уровнях архитектуры
- **📱 Современный UI** - Интуитивный и безопасный интерфейс

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Frontend                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   React UI      │  │  Crypto Service │  │  API Client  │ │
│  │                 │  │                 │  │              │ │
│  │ • Аутентификация│  │ • AES-256-CBC   │  │ • HTTP Client│ │
│  │ • Управление    │  │ • PBKDF2        │  │ • Interceptors│ │
│  │ • Отображение   │  │ • Мастер-ключ   │  │ • Error Handle│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/HTTP
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Local Backend                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Proxy Service │  │  Auth Controller│  │  Crypto      │ │
│  │                 │  │                 │  │  Service     │ │
│  │ • Маршрутизация │  │ • JWT Sessions  │  │ • Local      │ │
│  │ • Fallback      │  │ • Cookie Auth   │  │   Encryption │ │
│  │ • Load Balance  │  │ • Session Mgmt  │  │ • Password   │ │
│  └─────────────────┘  └─────────────────┘  │   Hashing    │ │
│                                            └──────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   SQLite Database                       │ │
│  │  • Зашифрованные данные  • Локальные сессии            │ │
│  │  • Пользователи          • Конфигурация                │ │
│  │  • Миграции Flyway       • Индексы                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Remote Backend                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   REST API      │  │  Security       │  │  Business    │ │
│  │                 │  │                 │  │  Logic       │ │
│  │ • CRUD Operations│  │ • JWT Auth      │  │ • Validation │ │
│  │ • Swagger Docs  │  │ • CORS          │  │ • Services   │ │
│  │ • Health Checks │  │ • Rate Limiting │  │ • Repositories│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                PostgreSQL Database                      │ │
│  │  • Зашифрованные данные  • Пользователи                │ │
│  │  • Миграции Flyway       • Индексы                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Система безопасности

### Клиентское шифрование

```javascript
// Процесс шифрования на клиенте
masterKey = PBKDF2(masterPassword, salt, 100000)
derivedKey = PBKDF2(masterKey, salt + 'data-encryption', 10000)
encryptedData = AES-256-CBC(plaintext, derivedKey, randomIV)
```

### Аутентификация

```javascript
// Хеширование пароля для сервера
masterPasswordHash = SHA256(masterPassword)
finalHash = PBKDF2(masterPasswordHash + salt, salt, 10000)
// Только finalHash отправляется на сервер
```

### Что шифруется

- ✅ Заголовки заметок и паролей
- ✅ Содержимое заметок
- ✅ Пароли и логины
- ✅ URL сайтов
- ✅ Типы записей
- ❌ Метаданные (ID, даты создания)
- ❌ Имена пользователей

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- Java 17+
- PostgreSQL 13+ (для удаленного режима)

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/your-org/ManagmentServer.git
cd ManagmentServer

# Настройка локального бэкенда
cd ui/backend
npm install
cp env.example .env
# Отредактируйте .env файл

# Настройка фронтенда
cd ../frontend
npm install

# Запуск приложения
npm run electron-start
```

### Docker (рекомендуется)

```bash
# Запуск локального стека
cd ui
docker-compose up -d

# Проверка
curl http://localhost:3001/api/health
```

## 📖 Документация

- **[SETUP.md](SETUP.md)** - Подробные инструкции по установке
- **[SECURITY.md](SECURITY.md)** - Документация по безопасности
- **[ui/README.md](ui/README.md)** - Документация UI компонентов

## 🔧 Режимы работы

### 1. Локальный режим 🏠

- SQLite база данных
- Один пользователь
- Работает без интернета
- Данные хранятся локально

### 2. Удаленный режим 🌐

- PostgreSQL база данных
- Множество пользователей
- Требует интернет соединение
- Синхронизация данных

### 3. Гибридный режим ⚡ (по умолчанию)

- Автоматический выбор доступного сервера
- Fallback на локальный при отсутствии соединения
- Приоритет удаленному серверу

## 🛠️ Разработка

### Структура проекта

```
ManagmentServer/
├── src/                    # Spring Backend (Java)
│   ├── main/java/         # Исходный код
│   ├── main/resources/    # Конфигурация
│   └── test/              # Тесты
├── ui/                    # Frontend + Local Backend
│   ├── backend/           # Node.js прокси сервер
│   │   ├── src/          # Исходный код
│   │   ├── data/         # SQLite база
│   │   └── logs/         # Логи
│   └── frontend/         # React + Electron
│       ├── src/          # Исходный код
│       ├── public/       # Статические файлы
│       └── build/        # Сборка
├── example/              # Примеры для фронтенда
├── scripts/              # Скрипты автоматизации
├── SECURITY.md           # Документация безопасности
├── SETUP.md              # Инструкции по установке
└── README.md             # Этот файл
```

### Команды разработки

```bash
# Spring Backend
./mvnw spring-boot:run
./mvnw test

# Local Backend
cd ui/backend
npm run dev
npm test

# Frontend
cd ui/frontend
npm start
npm run electron-dev-win

# Docker
docker-compose up -d
docker-compose logs -f
```

## 🧪 Тестирование

```bash
# Все тесты
npm run test:all

# Тесты безопасности
npm run test:security

# Интеграционные тесты
npm run test:integration

# Проверка уязвимостей
npm audit
```

## 📊 API

### Swagger документация

- **Spring API**: http://localhost:8080/swagger-ui.html
- **Local API**: http://localhost:3001/api/health

### Основные эндпоинты

```bash
# Аутентификация
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify

# Заметки
GET    /api/notes
POST   /api/notes
PUT    /api/notes/:id
DELETE /api/notes/:id

# Пароли
GET    /api/passwords
POST   /api/passwords
PUT    /api/passwords/:id
DELETE /api/passwords/:id

# Система
GET /api/health
GET /api/server/mode
```

## 🔒 Безопасность

### Принципы

1. **Zero Trust** - Не доверяем никому, проверяем всё
2. **Defense in Depth** - Многоуровневая защита
3. **Principle of Least Privilege** - Минимальные права доступа
4. **Fail Secure** - Безопасный отказ при ошибках

### Меры защиты

- 🔐 End-to-End шифрование
- 🛡️ HTTPS/TLS для всех соединений
- 🍪 HttpOnly cookies
- 🚫 CORS политики
- ⏱️ Защита от timing attacks
- 🔍 Валидация всех входных данных
- 📝 Аудит логирование

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

### Стандарты кода

- ESLint для JavaScript/TypeScript
- Checkstyle для Java
- Prettier для форматирования
- Conventional Commits

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

- 📧 Email: support@managementserver.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/ManagmentServer/issues)
- 📖 Wiki: [GitHub Wiki](https://github.com/your-org/ManagmentServer/wiki)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/ManagmentServer/discussions)

## 🙏 Благодарности

- [Electron](https://www.electronjs.org/) - Кроссплатформенные десктопные приложения
- [React](https://reactjs.org/) - Библиотека для пользовательских интерфейсов
- [Spring Boot](https://spring.io/projects/spring-boot) - Java фреймворк
- [CryptoJS](https://cryptojs.gitbook.io/) - Криптографические функции для JavaScript

---

**⚠️ Важно**: Это приложение предназначено для хранения конфиденциальной информации. Обязательно прочитайте [SECURITY.md](SECURITY.md) перед использованием в продакшене. 