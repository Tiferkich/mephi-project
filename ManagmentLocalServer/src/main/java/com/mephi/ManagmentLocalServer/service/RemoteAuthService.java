package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.remote.RemoteJwtResponse;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteLoginRequest;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteRegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/**
 * Сервис для работы с удаленным сервером аутентификации
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RemoteAuthService {
    
    private final WebClient.Builder webClientBuilder;

    @Value("${remote.server.url}")
    private String remoteServerUrl;
    
    @Value("${remote.server.enabled}")
    private boolean remoteEnabled;
    
    @Value("${remote.server.timeout}")
    private int timeout;

    /**
     * Регистрирует пользователя на удаленном сервере
     * 
     * @param username имя пользователя
     * @param salt соль для хеширования
     * @param passwordHash уже захешированный пароль (Argon2)
     * @return ответ с JWT токеном от удаленного сервера
     */
    public RemoteJwtResponse registerOnRemote(String username, String salt, String passwordHash) {
        log.info("Registering user {} on remote server", username);
        
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username не может быть пустым");
        }
        if (salt == null || salt.isEmpty()) {
            throw new IllegalArgumentException("Salt не может быть пустым");
        }
        if (passwordHash == null || passwordHash.isEmpty()) {
            throw new IllegalArgumentException("PasswordHash не может быть пустым");  
        }

        try {
            RemoteRegisterRequest request = new RemoteRegisterRequest(username, salt, passwordHash);
            
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            RemoteJwtResponse response = webClient.post()
                    .uri("/auth/register")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RemoteJwtResponse.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("Successfully registered user {} on remote server with ID: {}", username, response.getUserId());
            return response;
            
        } catch (Exception e) {
            log.error("Failed to register user {} on remote server: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось зарегистрироваться на удаленном сервере: " + e.getMessage(), e);
        }
    }

    /**
     * Авторизует пользователя на удаленном сервере
     * 
     * @param username имя пользователя  
     * @param passwordHash уже захешированный пароль (Argon2) из локальной БД
     * @return ответ с JWT токеном от удаленного сервера
     */
    public RemoteJwtResponse loginOnRemote(String username, String passwordHash) {
        log.info("Logging in user {} on remote server", username);
        
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username не может быть пустым");
        }
        if (passwordHash == null || passwordHash.isEmpty()) {
            throw new IllegalArgumentException("PasswordHash не может быть пустым");
        }

        try {
            RemoteLoginRequest request = new RemoteLoginRequest(username, passwordHash);
            
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            RemoteJwtResponse response = webClient.post()
                    .uri("/auth/login")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RemoteJwtResponse.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("Successfully logged in user {} on remote server", username);
            return response;
            
        } catch (Exception e) {
            log.error("Failed to login user {} on remote server: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось войти на удаленном сервере: " + e.getMessage(), e);
        }
    }

    /**
     * Проверяет токен удаленного пользователя
     */
    public boolean validateRemoteToken(String token) {
        if (!remoteEnabled || token == null) {
            return false;
        }

        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            String response = webClient.get()
                    .uri("/api/notes") // Любой защищенный endpoint для проверки токена
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .onErrorReturn("invalid") // При ошибке возвращаем "invalid"
                    .block();

            return response != null && !response.equals("invalid");

        } catch (Exception e) {
            log.warn("Failed to validate remote token", e);
            return false;
        }
    }

    /**
     * Проверяет доступность удаленного сервера
     */
    public boolean checkRemoteConnection() {
        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            webClient.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            return true;
            
        } catch (Exception e) {
            log.warn("Remote server not available: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Синхронизирует данные пользователя с удаленным сервером
     */
    public void syncWithRemote() {
        // Логика синхронизации может быть добавлена здесь
        log.info("Starting synchronization with remote server");
    }

    /**
     * Получает статус подключения к удаленному серверу
     */
    public String getConnectionStatus() {
        return checkRemoteConnection() ? "CONNECTED" : "DISCONNECTED";
    }

    /**
     * Отключает удаленный аккаунт локально
     */
    public void disconnectRemoteAccount() {
        // Логика отключения удаленного аккаунта может быть добавлена здесь
        log.info("Remote account disconnected locally");
    }

    /**
     * Проверяет JWT токен удаленного сервера и получает данные пользователя
     * 
     * @param jwtToken JWT токен от удаленного сервера
     * @return данные пользователя если токен валиден
     */
    public Map<String, Object> validateJwtToken(String jwtToken) {
        log.info("Validating JWT token on remote server");
        
        if (jwtToken == null || jwtToken.isEmpty()) {
            throw new IllegalArgumentException("JWT token не может быть пустым");
        }

        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            // Проверяем токен через endpoint /auth/login удаленного сервера
            Map<String, Object> response = webClient.post()
                    .uri("/auth/login")
                    .header("Authorization", "Bearer " + jwtToken)
                    .bodyValue(Map.of()) // Пустой body для проверки токена
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("JWT token validation successful");
            return response;
            
        } catch (Exception e) {
            log.error("Failed to validate JWT token: {}", e.getMessage());
            throw new RuntimeException("Не удалось проверить JWT токен: " + e.getMessage(), e);
        }
    }

    /**
     * Использует transfer токен для получения данных пользователя
     * 
     * @param transferToken transfer токен от другого устройства
     * @return данные пользователя и все его пароли/заметки
     */
    public Map<String, Object> useTransferToken(String transferToken) {
        log.info("Using transfer token on remote server");
        
        if (transferToken == null || transferToken.isEmpty()) {
            throw new IllegalArgumentException("Transfer token не может быть пустым");
        }

        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            // Используем токен через endpoint удаленного сервера
            Map<String, Object> response = webClient.post()
                    .uri("/auth/use-transfer-token")
                    .bodyValue(Map.of(
                        "transferToken", transferToken,
                        "deviceInfo", "Local Server Device",
                        "ipAddress", "auto"
                    ))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("Transfer token usage successful");
            return response;
            
        } catch (Exception e) {
            log.error("Failed to use transfer token: {}", e.getMessage());
            throw new RuntimeException("Не удалось использовать transfer token: " + e.getMessage(), e);
        }
    }

    /**
     * Облачный вход через email, username, и master password
     * 
     * @param email email пользователя
     * @param username имя пользователя  
     * @param masterPassword мастер-пароль
     * @return данные для OTP верификации
     */
    public Map<String, Object> cloudLogin(String email, String username, String masterPassword) {
        log.info("Starting cloud login for user {} with email {}", username, email);
        
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email не может быть пустым");
        }
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username не может быть пустым");
        }
        if (masterPassword == null || masterPassword.isEmpty()) {
            throw new IllegalArgumentException("Master password не может быть пустым");
        }

        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            // Отправляем данные на удаленный сервер для инициации входа
            Map<String, Object> response = webClient.post()
                    .uri("/auth/cloud-login")
                    .bodyValue(Map.of(
                        "email", email,
                        "username", username,
                        "masterPassword", masterPassword
                    ))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("Cloud login initiated for user {}, OTP required", username);
            return response;
            
        } catch (Exception e) {
            log.error("Failed to initiate cloud login for user {}: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось инициировать облачный вход: " + e.getMessage(), e);
        }
    }

    /**
     * Верифицирует OTP код для облачного входа
     * 
     * @param otpCode OTP код из email
     * @param username имя пользователя
     * @return полные данные пользователя после успешной верификации
     */
    public Map<String, Object> verifyCloudOTP(String otpCode, String username) {
        log.info("Verifying OTP code for cloud login, user: {}", username);
        
        if (otpCode == null || otpCode.isEmpty()) {
            throw new IllegalArgumentException("OTP код не может быть пустым");
        }
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username не может быть пустым");
        }

        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(remoteServerUrl)
                    .build();

            // Отправляем OTP код на удаленный сервер для верификации
            Map<String, Object> response = webClient.post()
                    .uri("/auth/verify-cloud-otp")
                    .bodyValue(Map.of(
                        "otpCode", otpCode,
                        "username", username
                    ))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            log.info("OTP verification successful for user {}", username);
            return response;
            
        } catch (Exception e) {
            log.error("Failed to verify OTP for user {}: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось верифицировать OTP код: " + e.getMessage(), e);
        }
    }
} 