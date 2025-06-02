# Routing Fix for 403 Forbidden Error

## Проблема
После добавления детального логирования выяснилось, что запросы не доходят до `AuthController.setupSync`, несмотря на то, что проходят через все фильтры (JWT, CORS).

### Логи показали:
```
🔄 Отправляем запрос на: http://localhost:8080/auth/sync-setup
🔥 REMOTE JWT Filter: POST /auth/sync-setup
🔥 REMOTE Auth Header: null
🔥 REMOTE No JWT token found, continuing filter chain  ✅
🔥 REMOTE CORS Filter working: POST /auth/sync-setup  ✅
🔥 REMOTE Non-OPTIONS request - continuing chain     ✅
❌ НО AuthController.setupSync НЕ вызывается!
```

## Корень проблемы

**Несоответствие URL маршрутов:**

- **Фронтенд отправляет запрос на:** `/auth/sync-setup`
- **AuthController настроен на:** `/api/auth/sync-setup`

```java
@RequestMapping("/api/auth")  // ← Проблема здесь!
public class AuthController {
    @PostMapping("/sync-setup")  // ← Итого: /api/auth/sync-setup
```

Spring не мог найти handler для `/auth/sync-setup` и возвращал 403 Forbidden.

## Решение

Изменили маршрут контроллера с `/api/auth` на `/auth`:

```java
@RestController
@RequestMapping("/auth")  // ← Исправлено: убрали /api
@RequiredArgsConstructor
public class AuthController {
    @PostMapping("/sync-setup")  // ← Теперь: /auth/sync-setup ✅
```

## Альтернативные решения

### Вариант 1: Изменить контроллер (выбрали этот)
```java
@RequestMapping("/auth")  // Убрать /api
```

### Вариант 2: Изменить фронтенд
```javascript
// Вместо /auth/sync-setup использовать:
const response = await fetch(`${REMOTE_PROXY_URL}/api/auth/sync-setup`, {
```

### Вариант 3: Добавить дубликат маршрутов
```java
@RequestMapping({"/auth", "/api/auth"})  // Поддерживать оба
```

## Проверка исправления

После изменения логи должны показывать:
```
🔄 Отправляем запрос на: http://localhost:8080/auth/sync-setup
🔥 REMOTE JWT Filter: POST /auth/sync-setup
🔥 REMOTE No JWT token found, continuing filter chain  ✅
🔥 REMOTE CORS Filter working: POST /auth/sync-setup  ✅
🔥 REMOTE AuthController.setupSync вызван!          ✅ НОВОЕ!
🔥 REMOTE Request data: username=..., email=...     ✅ НОВОЕ!
```

## Влияние на другие эндпоинты

Изменение затронуло все эндпоинты в AuthController:
- `/api/auth/register` → `/auth/register`
- `/api/auth/login` → `/auth/login`
- `/api/auth/verify-otp` → `/auth/verify-otp`
- И т.д.

Если другие клиенты используют `/api/auth/*` URL, их нужно обновить.

## SecurityConfig совместимость

SecurityConfig уже поддерживал оба варианта:
```java
.requestMatchers(
    "/api/auth/**",  // ← Старый путь (теперь не используется)
    "/auth/**",      // ← Новый путь (используется)
    "/swagger-ui/**",
    "/v3/api-docs/**",
    "/actuator/health"
).permitAll()
```

Поэтому никаких дополнительных изменений в Security не требуется. 