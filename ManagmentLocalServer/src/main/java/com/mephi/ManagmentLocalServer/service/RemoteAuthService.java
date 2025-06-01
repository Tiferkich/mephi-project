package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.remote.RemoteJwtResponse;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteLoginRequest;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteRegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class RemoteAuthService {

    private final WebClient.Builder webClientBuilder;
    private final UserService userService;

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
     * @param passwordHash уже захешированный пароль (Argon2) из локальной БД
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
                    .uri("/api/auth/register")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RemoteJwtResponse.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            // Сохраняем удаленные данные локально для синхронизации
            userService.updateRemoteData(response.getUserId(), response.getToken());
            
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
                    .uri("/api/auth/login")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RemoteJwtResponse.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (response == null) {
                throw new RuntimeException("Удаленный сервер вернул пустой ответ");
            }

            // Обновляем токен локально
            userService.updateRemoteData(response.getUserId(), response.getToken());
            
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
        try {
            userService.updateRemoteData(null, null);
            log.info("Remote account disconnected locally");
        } catch (Exception e) {
            log.error("Failed to disconnect remote account", e);
            throw new RuntimeException("Failed to disconnect remote account: " + e.getMessage());
        }
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
        try {
            userService.updateRemoteData(null, null);
            log.info("Remote account disconnected locally");
        } catch (Exception e) {
            log.error("Failed to disconnect remote account", e);
            throw new RuntimeException("Failed to disconnect remote account: " + e.getMessage());
        }
    }
} 