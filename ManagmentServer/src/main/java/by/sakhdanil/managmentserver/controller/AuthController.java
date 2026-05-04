package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.auth.*;
import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "🔐 Authentication", description = "Эндпоинты для аутентификации пользователей")
public class AuthController {
    
    private final UserService userService;
    
    @PostMapping("/register")
    @Operation(
        summary = "Регистрация нового пользователя",
        description = """
            Регистрирует нового пользователя в системе.
            
            **Важно**: 
            - Мастер-пароль должен быть захеширован на клиенте (SHA-256)
            - Затем добавлена соль и повторно захеширован с помощью Argon2
            - Сервер никогда не получает исходный мастер-пароль
            
            **Процесс на клиенте:**
            1. `masterPasswordHash = SHA256(masterPassword)`
            2. `salt = generateRandomSalt()`
            3. `passwordHash = Argon2(masterPasswordHash + salt)`
            4. Отправить `{username, salt, passwordHash}` на сервер
            """,
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Данные для регистрации",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RegisterRequest.class),
                examples = @ExampleObject(
                    name = "Пример регистрации",
                    value = """
                        {
                          "username": "john_doe",
                          "salt": "a1b2c3d4e5f6",
                          "passwordHash": "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
                        }
                        """
                )
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Пользователь успешно зарегистрирован",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class),
                examples = @ExampleObject(
                    name = "Успешная регистрация",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Ошибка валидации",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 400,
                          "error": "Bad Request",
                          "message": "Username must be between 3 and 50 characters",
                          "path": "/auth/register"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "409",
            description = "Пользователь уже существует",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Пользователь существует",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 409,
                          "error": "Conflict",
                          "message": "Username already exists",
                          "path": "/auth/register"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtResponse> register(@Valid @RequestBody RegisterRequest request) {
        JwtResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    @Operation(
        summary = "Вход в систему",
        description = """
            Аутентифицирует пользователя и возвращает JWT токен.
            
            **Важно**: 
            - Используйте тот же алгоритм хеширования, что и при регистрации
            - `passwordHash = Argon2(SHA256(masterPassword) + salt)`
            - Соль можно получить отдельным запросом или сохранить на клиенте
            
            **Полученный JWT токен** используйте в заголовке `Authorization: Bearer <token>` 
            для доступа к защищенным эндпоинтам.
            """,
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Данные для входа",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = LoginRequest.class),
                examples = @ExampleObject(
                    name = "Пример входа",
                    value = """
                        {
                          "username": "john_doe",
                          "passwordHash": "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
                        }
                        """
                )
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешный вход в систему",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class),
                examples = @ExampleObject(
                    name = "Успешный вход",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Ошибка валидации",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 400,
                          "error": "Bad Request",
                          "message": "Username is required",
                          "path": "/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Неверные учетные данные",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Неверный пароль",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 401,
                          "error": "Unauthorized",
                          "message": "Invalid credentials",
                          "path": "/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Пользователь не найден",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Пользователь не найден",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 404,
                          "error": "Not Found",
                          "message": "User not found",
                          "path": "/auth/login"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    // ✅ НОВЫЕ ЭНДПОИНТЫ ДЛЯ СИНХРОНИЗАЦИИ И ВОССТАНОВЛЕНИЯ

    @PostMapping("/sync-setup")
    @Operation(
        summary = "Подключение синхронизации",
        description = "Настройка синхронизации с email и отправка OTP кода для подтверждения"
    )
    public ResponseEntity<Map<String, Object>> setupSync(@Valid @RequestBody SyncSetupRequest request) {
        System.out.println("🔥 REMOTE AuthController.setupSync вызван!");
        System.out.println("🔥 REMOTE Request data: username=" + request.getUsername() + ", email=" + request.getEmail());
        
        try {
            Map<String, Object> response = userService.setupSync(request);
            System.out.println("🔥 REMOTE setupSync успешно выполнен: " + response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("🔥 REMOTE setupSync ошибка: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @PostMapping("/verify-otp")
    @Operation(
        summary = "Подтверждение OTP кода",
        description = "Верификация OTP кода для email подтверждения, восстановления или синхронизации"
    )
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody OtpVerificationRequest request) {
        Map<String, Object> response = userService.verifyOtp(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/initiate-recovery")
    @Operation(
        summary = "Инициация восстановления аккаунта",
        description = "Отправка OTP кода на email для восстановления аккаунта"
    )
    public ResponseEntity<Map<String, Object>> initiateRecovery(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String email = request.get("email");
        Map<String, Object> response = userService.initiateAccountRecovery(username, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete-recovery")
    @Operation(
        summary = "Завершение восстановления аккаунта",
        description = "Восстановление аккаунта с новым мастер-паролем после подтверждения OTP"
    )
    public ResponseEntity<Map<String, Object>> completeRecovery(@Valid @RequestBody AccountRecoveryRequest request) {
        Map<String, Object> response = userService.completeAccountRecovery(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create-transfer-token")
    @Operation(
        summary = "Создание токена переноса",
        description = "Создание одноразового токена для переноса данных на другое устройство (действует 5 минут)"
    )
    public ResponseEntity<Map<String, Object>> createTransferToken(@Valid @RequestBody TransferTokenRequest request) {
        Map<String, Object> response = userService.createTransferToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/use-transfer-token")
    @Operation(
        summary = "Использование токена переноса",
        description = "Получение всех данных пользователя по одноразовому токену переноса"
    )
    public ResponseEntity<Map<String, Object>> useTransferToken(@RequestBody Map<String, String> request) {
        String transferToken = request.get("transferToken");
        Map<String, Object> response = userService.useTransferToken(transferToken);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    @Operation(
        summary = "Проверка состояния сервера",
        description = "Эндпоинт для проверки доступности сервера"
    )
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "timestamp", java.time.Instant.now().toString()
        ));
    }

    @PutMapping("/public-key")
    @Operation(
        summary = "Сохранить X25519 публичный ключ пользователя",
        description = "Вызывается клиентом после разблокировки vault. Ключ используется другими пользователями для ECDH при передаче группового ключа."
    )
    public ResponseEntity<Map<String, Object>> updatePublicKey(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        String publicKey = body.get("publicKey");
        if (publicKey == null || publicKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "publicKey is required"));
        }
        userService.updatePublicKey(user, publicKey);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/test-email")
    @Operation(
        summary = "Тест отправки email",
        description = "Тестовый эндпоинт для проверки настроек email"
    )
    public ResponseEntity<Map<String, Object>> testEmail(@RequestBody Map<String, String> request) {
        try {
            String testEmail = request.get("email");
            if (testEmail == null || testEmail.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Email is required"
                ));
            }
            
            String otpCode = userService.getEmailService().generateOtpCode();
            userService.getEmailService().sendSyncSetupOtp(testEmail, "Test User", otpCode);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Test email sent successfully!",
                "email", testEmail,
                "otpCode", otpCode
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/cloud-login")
    @Operation(
        summary = "Облачный вход через email, username и master password",
        description = """
            Инициирует облачный вход через email, username и master password.
            Отправляет OTP код на email для верификации.
            
            **Процесс:**
            1. Проверяет учетные данные пользователя
            2. Генерирует и отправляет OTP код на email
            3. Возвращает sessionId для последующей верификации
            
            **Использование:**
            - Облачный вход с другого устройства
            - Альтернатива JWT токену
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "OTP код отправлен на email",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "OTP отправлен",
                    value = """
                        {
                          "requiresOTP": true,
                          "sessionId": "session_12345",
                          "username": "john_doe",
                          "message": "OTP code sent to your email"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Неверные учетные данные"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Пользователь не найден"
        )
    })
    public ResponseEntity<Map<String, Object>> cloudLogin(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String username = request.get("username");
        String masterPassword = request.get("masterPassword");
        
        Map<String, Object> response = userService.cloudLogin(email, username, masterPassword);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-cloud-otp")
    @Operation(
        summary = "Верификация OTP для облачного входа",
        description = """
            Завершает облачный вход через верификацию OTP кода.
            Возвращает полные данные пользователя и JWT токен.
            
            **Процесс:**
            1. Проверяет OTP код
            2. Возвращает JWT токен и данные пользователя
            3. Включает все пароли и заметки для синхронизации
            
            **Результат:**
            - JWT токен для авторизации
            - Полные данные пользователя
            - Все пароли и заметки
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "OTP верифицирован, возвращены данные пользователя",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешная верификация",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe",
                          "email": "john@example.com",
                          "passwordHash": "$argon2id$v=19$m=4096,t=3,p=1$...",
                          "salt": "a1b2c3d4e5f6",
                          "passwords": [...],
                          "notes": [...]
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверный OTP код"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Сессия не найдена или истекла"
        )
    })
    public ResponseEntity<Map<String, Object>> verifyCloudOTP(@RequestBody Map<String, String> request) {
        String otpCode = request.get("otpCode");
        String username = request.get("username");
        
        Map<String, Object> response = userService.verifyCloudOTP(otpCode, username);
        return ResponseEntity.ok(response);
    }
}
