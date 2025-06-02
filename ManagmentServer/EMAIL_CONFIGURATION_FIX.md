# Email Configuration Fix for Remote Server

## Проблема
Удаленный сервер не мог запуститься из-за ошибки:
```
Parameter 0 of constructor in EmailService required a bean of type 'JavaMailSender' that could not be found.
```

Это приводило к ошибкам 403 Forbidden при обращении к эндпоинтам, потому что сам сервер не запускался.

## Решение

### 1. Создан MailConfig.java
```java
@Configuration
public class MailConfig {
    @Bean
    @ConditionalOnProperty(name = "mail.enabled", havingValue = "true", matchIfMissing = true)
    public JavaMailSender javaMailSender() {
        // Конфигурация JavaMailSender с поддержкой mock режима
    }
}
```

### 2. Добавлена поддержка Mock Email
- **Если email настройки пусты** → используется mock sender
- **Mock sender** логирует email в консоль вместо отправки
- **Позволяет тестировать** без настройки SMTP

### 3. Обновлен application.yaml
```yaml
mail:
  enabled: true                    # Можно отключить
  username: ${MAIL_USERNAME:}      # Пустое значение для тестирования
  password: ${MAIL_PASSWORD:}      # Пустое значение для тестирования
```

## Варианты конфигурации

### Режим 1: Тестирование (Mock Email)
```yaml
mail:
  enabled: true
  username: ""  # Пустое значение
  password: ""  # Пустое значение
```
**Результат:** Email логируются в консоль

### Режим 2: Продакшн (Реальный Email)
```yaml
mail:
  enabled: true
  username: "your-email@gmail.com"
  password: "your-app-password"
```
**Результат:** Email отправляются через SMTP

### Режим 3: Отключен
```yaml
mail:
  enabled: false
```
**Результат:** Mock sender используется принудительно

## Логи для отладки

### Mock Email:
```
⚠️ Email настройки не заданы, используем mock email sender
📧 MOCK EMAIL SENT:
   To: user@example.com
   Subject: Password Manager - Sync Setup Verification
   Text: Hello username, Your OTP code is: 123456
```

### Реальный Email:
```
✅ Настроен real email sender: your-email@gmail.com
✅ Sync setup OTP sent to: user@example.com
```

## Проверка работы

1. **Запустить удаленный сервер:**
   ```bash
   mvn spring-boot:run
   ```

2. **Проверить health endpoint:**
   ```bash
   curl http://localhost:8080/actuator/health
   ```

3. **Тестировать sync-setup:**
   ```bash
   curl -X POST http://localhost:8080/auth/sync-setup \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "passwordHash": "hash123",
       "salt": "salt123",
       "localUserId": "local123"
     }'
   ```

## Архитектура после исправления

```
Frontend → Local Server (JWT ✅) → Remote Server (EMAIL ✅)
                                      ↓
                                 EmailService
                                      ↓
                              JavaMailSender ✅
                                      ↓
                              [Mock или Real Email]
```

Теперь система работает корректно с email функциональностью! 