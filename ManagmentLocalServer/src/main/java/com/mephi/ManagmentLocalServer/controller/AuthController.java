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
} 