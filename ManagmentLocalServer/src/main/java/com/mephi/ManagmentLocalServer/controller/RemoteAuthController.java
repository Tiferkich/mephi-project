package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.remote.RemoteJwtResponse;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteAuthRequest;
import com.mephi.ManagmentLocalServer.service.RemoteAuthService;
import com.mephi.ManagmentLocalServer.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/remote")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "🌐 Remote Auth", description = "Управление аутентификацией с удаленным сервером")
@SecurityRequirement(name = "Bearer Authentication")
public class RemoteAuthController {

    private final RemoteAuthService remoteAuthService;
    private final UserService userService;

    @PostMapping("/register")
    @Operation(
        summary = "Регистрация на удаленном сервере",
        description = """
            Регистрирует текущего локального пользователя на удаленном сервере.
            
            **Процесс:**
            1. Использует данные текущего локального пользователя (username, salt, passwordHash)
            2. Отправляет запрос регистрации на удаленный сервер с Argon2 хешем
            3. Получает remoteId и remoteToken
            4. Сохраняет эти данные локально для синхронизации
            
            **Требования:**
            - Пользователь должен быть авторизован локально
            - Удаленный сервер должен быть доступен  
            - У пользователя еще не должно быть удаленного аккаунта
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешная регистрация на удаленном сервере",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RemoteJwtResponse.class),
                examples = @ExampleObject(
                    name = "Успешная регистрация",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "type": "Bearer",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован локально"),
        @ApiResponse(responseCode = "400", description = "Удаленный сервер недоступен или пользователь уже зарегистрирован"),
        @ApiResponse(responseCode = "409", description = "Пользователь уже существует на удаленном сервере")
    })
    public ResponseEntity<RemoteJwtResponse> registerOnRemote() {
        try {
            // Проверяем, есть ли уже удаленный аккаунт
            if (userService.hasRemoteAccount()) {
                return ResponseEntity.badRequest().build();
            }

            // Получаем данные текущего пользователя
            var user = userService.getCurrentUser();
            
            // Отправляем уже захешированные данные из локальной БД
            RemoteJwtResponse response = remoteAuthService.registerOnRemote(
                user.getUsername(), 
                user.getSalt(), 
                user.getPasswordHash()  // Argon2 хеш из локальной БД
            );

            // Сохраняем удаленные данные локально для синхронизации
            userService.updateRemoteData(response.getUserId(), response.getToken());

            log.info("User {} successfully registered on remote server", user.getUsername());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to register on remote server", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    @Operation(
        summary = "Вход на удаленном сервере",
        description = """
            Авторизует текущего локального пользователя на удаленном сервере.
            
            **Процесс:**
            1. Использует данные текущего локального пользователя
            2. Отправляет запрос авторизации на удаленный сервер с Argon2 хешем
            3. Получает новый remoteToken
            4. Обновляет токен локально
            
            **Применение:**
            - Восстановление доступа к удаленному серверу
            - Обновление истекшего remoteToken
            - Первый вход после регистрации через другое устройство
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешный вход на удаленном сервере",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RemoteJwtResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован локально или неверные данные для удаленного сервера"),
        @ApiResponse(responseCode = "400", description = "Удаленный сервер недоступен")
    })
    public ResponseEntity<RemoteJwtResponse> loginOnRemote() {
        try {
            // Получаем данные текущего пользователя
            var user = userService.getCurrentUser();
            
            // Отправляем уже захешированные данные из локальной БД
            RemoteJwtResponse response = remoteAuthService.loginOnRemote(
                user.getUsername(), 
                user.getPasswordHash()  // Argon2 хеш из локальной БД
            );

            // Обновляем токен локально
            userService.updateRemoteData(response.getUserId(), response.getToken());

            log.info("User {} successfully logged in on remote server", user.getUsername());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to login on remote server", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/disconnect")
    @Operation(
        summary = "Отключить удаленный аккаунт",
        description = """
            Отключает связь с удаленным аккаунтом локально.
            
            **Что происходит:**
            - Удаляет remoteId и remoteToken из локальной базы
            - Отключает синхронизацию с удаленным сервером
            - НЕ удаляет данные с удаленного сервера
            
            **Использование:**
            - Работа только в локальном режиме
            - Смена удаленного аккаунта
            - Решение проблем с синхронизацией
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Удаленный аккаунт отключен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешное отключение",
                    value = """
                        {
                          "success": true,
                          "message": "Remote account disconnected successfully"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<Map<String, Object>> disconnectRemote() {
        try {
            // Очищаем удаленные данные локально
            userService.clearRemoteData();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Remote account disconnected successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to disconnect remote account", e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Failed to disconnect: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/status")
    @Operation(
        summary = "Статус удаленного аккаунта",
        description = """
            Возвращает информацию о состоянии связи с удаленным сервером.
            
            **Проверяет:**
            - Включена ли синхронизация
            - Есть ли связанный удаленный аккаунт
            - Доступен ли удаленный сервер
            - Валиден ли remoteToken
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Статус получен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Статус удаленного аккаунта",
                    value = """
                        {
                          "hasRemoteAccount": true,
                          "remoteServerAvailable": true,
                          "tokenValid": true,
                          "remoteUserId": "123e4567-e89b-12d3-a456-426614174000",
                          "canSync": true
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<Map<String, Object>> getRemoteStatus() {
        boolean hasRemoteAccount = userService.hasRemoteAccount();
        boolean serverAvailable = remoteAuthService.checkRemoteConnection();
        boolean tokenValid = false;
        
        if (hasRemoteAccount) {
            String remoteToken = userService.getRemoteToken();
            tokenValid = remoteAuthService.validateRemoteToken(remoteToken);
        }

        Map<String, Object> status = Map.of(
            "hasRemoteAccount", hasRemoteAccount,
            "remoteServerAvailable", serverAvailable,
            "tokenValid", tokenValid,
            "remoteUserId", userService.getRemoteId() != null ? userService.getRemoteId() : "",
            "canSync", hasRemoteAccount && serverAvailable && tokenValid
        );

        return ResponseEntity.ok(status);
    }
} 