package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.auth.AuthResponse;
import com.mephi.ManagmentLocalServer.dto.auth.LoginRequest;
import com.mephi.ManagmentLocalServer.dto.auth.SetupRequest;
import com.mephi.ManagmentLocalServer.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "🔐 Authentication", description = "Эндпоинты для локальной авторизации")
public class AuthController {

    private final UserService userService;

    @PostMapping("/setup")
    @Operation(
        summary = "Первичная настройка пользователя",
        description = """
            Первоначальная настройка локального пользователя.
            
            **Важно**: 
            - Может быть выполнена только один раз
            - Мастер-пароль должен быть захеширован на клиенте
            - Создает единственного пользователя для локального режима
            
            **Процесс на клиенте:**
            1. `masterPasswordHash = SHA256(masterPassword)`
            2. `salt = generateRandomSalt()`
            3. `passwordHash = Argon2(masterPasswordHash + salt)`
            4. Отправить `{username, salt, passwordHash}` на сервер
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Пользователь успешно настроен",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthResponse.class),
                examples = @ExampleObject(
                    name = "Успешная настройка",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "username": "user",
                          "isSetup": true
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные или пользователь уже настроен"
        )
    })
    public ResponseEntity<AuthResponse> setup(@Valid @RequestBody SetupRequest request) {
        log.info("Setup request for username: {}", request.getUsername());
        AuthResponse response = userService.setup(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    @Operation(
        summary = "Вход в систему",
        description = """
            Локальная аутентификация пользователя.
            
            **Важно**: 
            - Требует предварительной настройки (/auth/setup)
            - Используйте тот же алгоритм хеширования, что и при настройке
            - Возвращает новый JWT токен для локальных запросов
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешный вход в систему",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AuthResponse.class),
                examples = @ExampleObject(
                    name = "Успешный вход",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "username": "user",
                          "isSetup": true
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Неверный пароль"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Пользователь не настроен"
        )
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request received");
        AuthResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    @Operation(
        summary = "Статус авторизации",
        description = """
            Проверяет статус локальной авторизации.
            
            **Возвращает:**
            - `isSetup`: настроен ли пользователь
            - `isAuthenticated`: авторизован ли текущий запрос (если есть Bearer токен)
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Статус получен",
            content = @Content(
                mediaType = "application/json",
                examples = {
                    @ExampleObject(
                        name = "Настроен и авторизован",
                        value = """
                            {
                              "isSetup": true,
                              "isAuthenticated": true,
                              "username": "user"
                            }
                            """
                    ),
                    @ExampleObject(
                        name = "Не настроен",
                        value = """
                            {
                              "isSetup": false,
                              "isAuthenticated": false
                            }
                            """
                    )
                }
            )
        )
    })
    public ResponseEntity<Map<String, Object>> status(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        boolean isSetup = userService.isSetup();
        boolean isAuthenticated = authHeader != null && authHeader.startsWith("Bearer ");
        
        Map<String, Object> response = Map.of(
            "isSetup", isSetup,
            "isAuthenticated", isAuthenticated
        );
        
        if (isSetup && isAuthenticated) {
            try {
                String username = userService.getCurrentUser().getUsername();
                response = Map.of(
                    "isSetup", isSetup,
                    "isAuthenticated", isAuthenticated,
                    "username", username
                );
            } catch (Exception e) {
                // Игнорируем ошибки получения пользователя
            }
        }
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(
        summary = "Информация о текущем пользователе",
        description = """
            Возвращает информацию о текущем авторизованном пользователе.
            
            **Требует**: Bearer токен в заголовке Authorization
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Информация получена",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Информация о пользователе",
                    value = """
                        {
                          "username": "user",
                          "userId": 1,
                          "isSetup": true
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Не авторизован"
        )
    })
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        try {
            var user = userService.getCurrentUser();
            Map<String, Object> response = Map.of(
                "username", user.getUsername(),
                "userId", user.getId(),
                "isSetup", true
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/replace-account")
    @Operation(
        summary = "Замена локального аккаунта",
        description = """
            Заменяет локальный аккаунт на восстановленный из удаленного сервера.
            
            **Процесс:**
            1. Удаляет текущего локального пользователя и все его данные
            2. Создает нового пользователя с данными из удаленного сервера
            3. Импортирует все пароли и заметки
            4. Возвращает новый JWT токен для нового пользователя
            
            **Важно**: Это необратимая операция!
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Аккаунт успешно заменен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешная замена",
                    value = """
                        {
                          "success": true,
                          "message": "Account replaced successfully",
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "username": "recovered_user",
                          "passwordsImported": 5,
                          "notesImported": 3
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса"
        )
    })
    public ResponseEntity<Map<String, Object>> replaceAccount(@RequestBody Map<String, Object> request) {
        log.info("Account replacement request received");
        
        try {
            // Извлекаем данные из запроса
            String username = (String) request.get("username");
            String email = (String) request.get("email");
            String masterPasswordHash = (String) request.get("masterPasswordHash");
            String salt = (String) request.get("salt");
            String remoteToken = (String) request.get("remoteToken");
            String remoteId = (String) request.get("remoteId");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> passwords = (List<Map<String, Object>>) request.get("passwords");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> notes = (List<Map<String, Object>>) request.get("notes");
            
            // Выполняем замену аккаунта через UserService
            Map<String, Object> result = userService.replaceAccount(
                username, email, masterPasswordHash, salt, remoteToken, remoteId, passwords, notes
            );
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Account replacement failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/connect-remote")
    @Operation(
        summary = "Подключение удаленного аккаунта",
        description = """
            Подключает удаленный аккаунт к существующему локальному пользователю.
            
            **Процесс:**
            1. Обновляет remoteId и remoteToken для текущего локального пользователя
            2. Импортирует данные из удаленного аккаунта (merge, не replace)
            3. Локальный мастер-пароль и JWT токен остаются без изменений
            
            **Отличие от replace-account**: сохраняет локального пользователя, только добавляет связь с удаленным
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Удаленный аккаунт успешно подключен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешное подключение",
                    value = """
                        {
                          "success": true,
                          "message": "Remote account connected successfully",
                          "token": "existing_jwt_token",
                          "username": "local_user",
                          "passwordsSynced": 5,
                          "notesSynced": 3
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса"
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Не авторизован"
        )
    })
    public ResponseEntity<Map<String, Object>> connectRemote(@RequestBody Map<String, Object> request) {
        log.info("Remote account connection request received");
        
        try {
            // Извлекаем данные из запроса
            String remoteToken = (String) request.get("remoteToken");
            String remoteId = (String) request.get("remoteId");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userData = (Map<String, Object>) request.get("userData");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> passwords = (List<Map<String, Object>>) request.get("passwords");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> notes = (List<Map<String, Object>>) request.get("notes");
            
            // Выполняем подключение удаленного аккаунта через UserService
            Map<String, Object> result = userService.connectRemoteAccount(
                remoteToken, remoteId, userData, passwords, notes
            );
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Remote account connection failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/jwt-login")
    @Operation(
        summary = "Вход по JWT токену удаленного сервера",
        description = """
            Создает локальный аккаунт на основе JWT токена удаленного сервера.
            
            **Процесс:**
            1. Проверяет JWT токен через удаленный сервер
            2. Получает данные пользователя с удаленного сервера
            3. Создает или обновляет локального пользователя
            4. Возвращает локальный JWT токен для дальнейшей работы
            
            **Использование:**
            - Первый вход на новом устройстве с облачным аккаунтом
            - Восстановление доступа через облачный токен
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешный вход через JWT токен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешный вход",
                    value = """
                        {
                          "success": true,
                          "message": "JWT login successful",
                          "token": "local_jwt_token",
                          "username": "cloud_user",
                          "userId": "local_user_id"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверный JWT токен или проблемы с удаленным сервером"
        ),
        @ApiResponse(
            responseCode = "401",
            description = "JWT токен недействителен"
        )
    })
    public ResponseEntity<Map<String, Object>> jwtLogin(@RequestBody Map<String, String> request) {
        log.info("JWT login request received");
        
        try {
            String jwtToken = request.get("jwtToken");
            if (jwtToken == null || jwtToken.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "JWT token is required"
                ));
            }
            
            // Используем RemoteAuthService для проверки JWT токена и получения данных пользователя
            Map<String, Object> result = userService.loginWithJwtToken(jwtToken.trim());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("JWT login failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/cloud-login")
    @Operation(
        summary = "Облачный вход через email, username и master password",
        description = """
            Инициирует облачный вход в аккаунт через email, username и master password.
            
            **Процесс:**
            1. Отправляет учетные данные на удаленный сервер
            2. Удаленный сервер отправляет OTP код на email
            3. Возвращает sessionId для последующей верификации OTP
            4. Требует вызов /auth/verify-cloud-otp для завершения входа
            
            **Использование:**
            - Подключение облачного аккаунта к локальному устройству
            - Альтернатива JWT токену - обычный логин в облако
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "OTP код отправлен, требуется верификация",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "OTP отправлен",
                    value = """
                        {
                          "requiresOTP": true,
                          "sessionId": "session_12345",
                          "username": "cloud_user",
                          "message": "OTP code sent to your email. Please verify to complete login."
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные учетные данные или проблемы с удаленным сервером"
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Неверное имя пользователя или пароль"
        )
    })
    public ResponseEntity<Map<String, Object>> cloudLogin(@RequestBody Map<String, String> request) {
        log.info("Cloud login request received");
        
        try {
            String email = request.get("email");
            String username = request.get("username");
            String masterPassword = request.get("masterPassword");
            
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Email is required"
                ));
            }
            
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Username is required"
                ));
            }
            
            if (masterPassword == null || masterPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Master password is required"
                ));
            }
            
            // Используем UserService для облачного входа
            Map<String, Object> result = userService.cloudLogin(
                email.trim(), 
                username.trim(), 
                masterPassword
            );
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Cloud login failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/verify-cloud-otp")
    @Operation(
        summary = "Верификация OTP для облачного входа",
        description = """
            Завершает облачный вход через верификацию OTP кода.
            
            **Процесс:**
            1. Верифицирует OTP код через удаленный сервер
            2. Получает полные данные пользователя из облака
            3. Создает или обновляет локального пользователя
            4. Импортирует пароли и заметки из облака
            5. Возвращает локальный JWT токен для дальнейшей работы
            
            **Результат:**
            - Новый локальный пользователь с данными из облака (если локального пользователя нет)
            - Подключение облачного аккаунта к существующему локальному пользователю
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "OTP верифицирован, облачный аккаунт подключен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешная верификация",
                    value = """
                        {
                          "success": true,
                          "message": "Cloud account successfully imported",
                          "token": "local_jwt_token",
                          "username": "cloud_user",
                          "userId": "local_user_id",
                          "passwordsImported": 5,
                          "notesImported": 3
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверный OTP код или истек срок действия"
        ),
        @ApiResponse(
            responseCode = "401",
            description = "OTP код недействителен"
        )
    })
    public ResponseEntity<Map<String, Object>> verifyCloudOTP(@RequestBody Map<String, String> request) {
        log.info("Cloud OTP verification request received");
        
        try {
            String otpCode = request.get("otpCode");
            String username = request.get("username");
            
            if (otpCode == null || otpCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "OTP code is required"
                ));
            }
            
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Username is required"
                ));
            }
            
            // Используем UserService для верификации OTP
            Map<String, Object> result = userService.verifyCloudOTP(
                otpCode.trim(), 
                username.trim()
            );
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Cloud OTP verification failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}