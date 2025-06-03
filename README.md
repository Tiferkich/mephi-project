# 🔐 Password Management System

Безопасная система управления паролями с локальным и удаленным серверами.

## 🏗️ Архитектура

```
┌─────────────────────────┐    HTTP/HTTPS    ┌──────────────────────────┐
│  ManagmentLocalServer   │◄────────────────►│   ManagmentServer        │
│  (SQLite + Spring Boot) │                  │  (PostgreSQL + Spring)   │
│  Port: 3001             │                  │  Port: 8080              │
└─────────────────────────┘                  └──────────────────────────┘
```

## 🚀 Быстрый запуск

### 📋 Предварительные требования

- Docker Desktop
- Java 17+
- curl (для проверки статуса)

### ▶️ Запуск серверов

1. **Запустить оба сервера:**
   ```cmd
   run-servers.bat
   ```

2. **Остановить серверы:**
   ```cmd
   stop-servers.bat
   ```

## 📍 Адреса серверов

### 🏠 Локальный сервер (ManagmentLocalServer)
- **Основной URL:** http://localhost:3001
- **Swagger UI:** http://localhost:3001/swagger-ui.html
- **Health Check:** http://localhost:3001/actuator/health
- **База данных:** SQLite (./data/local_database.db)

### 🌐 Удаленный сервер (ManagmentServer)
- **Основной URL:** http://localhost:8080  
- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **Health Check:** http://localhost:8080/actuator/health
- **База данных:** PostgreSQL (localhost:5432)

## 🔧 Использование

### 1️⃣ Настройка локального аккаунта
```http
POST http://localhost:3001/auth/setup
Content-Type: application/json

{
  "username": "your_username",
  "salt": "random_salt_string",
  "passwordHash": "argon2_hashed_password"
}
```

### 2️⃣ Вход в локальный аккаунт
```http
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "username": "your_username", 
  "passwordHash": "argon2_hashed_password"
}
```

### 3️⃣ Связка с удаленным сервером
```http
POST http://localhost:3001/remote/register
Authorization: Bearer <local_jwt_token>
```

### 4️⃣ Синхронизация данных
```http
# Выгрузить данные на удаленный сервер
POST http://localhost:3001/sync/push
Authorization: Bearer <local_jwt_token>

# Загрузить данные с удаленного сервера  
GET http://localhost:3001/sync/pull
Authorization: Bearer <local_jwt_token>
```

## 📝 API Endpoints

### 🔐 Аутентификация (Локальный)
- `POST /auth/setup` - Первичная настройка
- `POST /auth/login` - Вход в систему
- `GET /auth/status` - Статус аутентификации

### 🌐 Удаленная аутентификация
- `POST /remote/register` - Регистрация на удаленном сервере
- `POST /remote/login` - Вход на удаленном сервере
- `GET /remote/status` - Статус удаленного аккаунта
- `POST /remote/disconnect` - Отключить удаленный аккаунт

### 🔄 Синхронизация
- `POST /sync/push` - Выгрузить данные
- `GET /sync/pull` - Загрузить данные  
- `GET /sync/status` - Статус синхронизации

### 📝 Заметки (Локальные)
- `GET /notes` - Получить все заметки
- `POST /notes` - Создать заметку
- `PUT /notes/{id}` - Обновить заметку
- `DELETE /notes/{id}` - Удалить заметку

### 🔑 Пароли (Локальные)
- `GET /passwords` - Получить все пароли
- `POST /passwords` - Создать пароль
- `PUT /passwords/{id}` - Обновить пароль
- `DELETE /passwords/{id}` - Удалить пароль

## 🛡️ Безопасность

- **End-to-End шифрование** - все данные шифруются на клиенте
- **Zero-knowledge архитектура** - сервер не знает мастер-пароль
- **Argon2 хеширование** - безопасное хранение паролей
- **JWT аутентификация** - токен-based авторизация
- **Разделение данных** - каждый пользователь видит только свои данные

## 🔄 Разрешение конфликтов

При синхронизации поддерживаются стратегии:
- `LATEST_TIMESTAMP` - берется более новая версия (по умолчанию)
- `LOCAL_WINS` - приоритет локальной версии
- `REMOTE_WINS` - приоритет удаленной версии
- `SKIP_CONFLICTS` - пропустить конфликтные записи

## 📁 Структура проекта

```
mephi-project/
├── ManagmentServer/          # Удаленный сервер (PostgreSQL)
├── ManagmentLocalServer/     # Локальный сервер (SQLite)
├── run-servers.bat          # Запуск серверов
├── stop-servers.bat         # Остановка серверов
└── README.md               # Этот файл
```

## 🐛 Отладка

### Логи контейнеров:
```cmd
# Локальный сервер
docker logs management_local_server -f

# Удаленный сервер  
docker logs vault_spring -f

# PostgreSQL
docker logs vault_postgres -f
```

### Проверка статуса:
```cmd
# Проверить, что серверы отвечают
curl http://localhost:3001/actuator/health
curl http://localhost:8080/actuator/health
```

При возникновении проблем:
1. Проверьте логи контейнеров
2. Убедитесь, что порты 3001 и 8080 свободны
3. Перезапустите серверы через `stop-servers.bat` и `run-servers.bat` 
