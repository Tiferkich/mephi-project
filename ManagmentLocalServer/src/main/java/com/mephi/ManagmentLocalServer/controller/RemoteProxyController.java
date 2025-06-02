package com.mephi.ManagmentLocalServer.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mephi.ManagmentLocalServer.service.RemoteProxyService;
import com.mephi.ManagmentLocalServer.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Map;

@RestController
@RequestMapping("/remote-proxy")
@RequiredArgsConstructor
public class RemoteProxyController {

    @Value("${remote.server.url:http://localhost:8080}")
    private String remoteServerUrl;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RemoteProxyService remoteProxyService;
    private final UserService userService;

    /**
     * Прокси для всех запросов к удаленному серверу
     */
    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.OPTIONS})
    public ResponseEntity<?> proxyToRemoteServer(
            HttpServletRequest request,
            @RequestBody(required = false) String body,
            @RequestHeader Map<String, String> headers) {
        
        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String path = request.getRequestURI().substring("/remote-proxy".length());
        String userAgent = headers.getOrDefault("user-agent", "Unknown");
        
        System.out.println("🔄 ========== PROXY REQUEST START ==========");
        System.out.println("🔄 Method: " + method);
        System.out.println("🔄 Path: " + path);
        System.out.println("🔄 Full URI: " + request.getRequestURI());
        System.out.println("🔄 Query String: " + request.getQueryString());
        System.out.println("🔄 Body: " + (body != null ? body.substring(0, Math.min(body.length(), 200)) + "..." : "null"));
        
        // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ SYNC-SETUP
        if (path.contains("sync-setup")) {
            System.out.println("🔄 ======= SYNC-SETUP DETAILED LOGGING =======");
            System.out.println("🔄 Full Request Body: " + (body != null ? body : "null"));
            if (body != null) {
                try {
                    JsonNode json = objectMapper.readTree(body);
                    System.out.println("🔄 Parsed JSON:");
                    System.out.println("🔄   username: " + (json.has("username") ? json.get("username").asText() : "MISSING"));
                    System.out.println("🔄   email: " + (json.has("email") ? json.get("email").asText() : "MISSING"));
                    System.out.println("🔄   passwordHash: " + (json.has("passwordHash") ? (json.get("passwordHash").asText().isEmpty() ? "EMPTY" : "Present (" + json.get("passwordHash").asText().length() + " chars)") : "MISSING"));
                    System.out.println("🔄   salt: " + (json.has("salt") ? (json.get("salt").asText().isEmpty() ? "EMPTY" : "Present (" + json.get("salt").asText().length() + " chars)") : "MISSING"));
                    System.out.println("🔄   localUserId: " + (json.has("localUserId") ? (json.get("localUserId").asText().isEmpty() ? "EMPTY" : json.get("localUserId").asText()) : "MISSING"));
                } catch (Exception e) {
                    System.out.println("🔄 Failed to parse JSON: " + e.getMessage());
                }
            }
            System.out.println("🔄 =======================================");
        }
        
        // ✅ АВТОМАТИЧЕСКОЕ ДОПОЛНЕНИЕ ЗАПРОСА SYNC-SETUP
        if (path.equals("/auth/sync-setup") && "POST".equals(method) && body != null) {
            try {
                System.out.println("🔄 🔧 ДОПОЛНЯЕМ ЗАПРОС SYNC-SETUP 🔧");
                
                // Получаем JWT токен из заголовка Authorization
                String authHeader = headers.get("authorization");
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    System.out.println("🔄 ❌ Нет JWT токена для дополнения запроса");
                    // Продолжаем без дополнения
                } else {
                    String jwtToken = authHeader.substring(7); // Убираем "Bearer "
                    
                    // Получаем пользователя по JWT токену
                    var currentUser = userService.getUserByJwtToken(jwtToken);
                    if (currentUser != null) {
                        System.out.println("🔄 Получили пользователя из JWT: " + currentUser.getUsername() + ", ID: " + currentUser.getId());
                        
                        // Парсим существующий JSON
                        ObjectNode jsonNode = (ObjectNode) objectMapper.readTree(body);
                        
                        // Дополняем недостающими полями из локальной БД
                        jsonNode.put("passwordHash", currentUser.getPasswordHash());
                        jsonNode.put("salt", currentUser.getSalt());
                        jsonNode.put("localUserId", currentUser.getId().toString());
                        
                        // Обновляем тело запроса
                        body = objectMapper.writeValueAsString(jsonNode);
                        
                        System.out.println("🔄 ✅ Запрос дополнен данными из локальной БД:");
                        System.out.println("🔄   passwordHash: Present (" + currentUser.getPasswordHash().length() + " chars)");
                        System.out.println("🔄   salt: Present (" + currentUser.getSalt().length() + " chars)");
                        System.out.println("🔄   localUserId: " + currentUser.getId());
                        System.out.println("🔄 🔧 ГОТОВО К ОТПРАВКЕ 🔧");
                    } else {
                        System.out.println("🔄 ❌ Не удалось найти пользователя по JWT токену");
                    }
                }
                
            } catch (Exception e) {
                System.out.println("🔄 ❌ Ошибка дополнения запроса: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        // Логируем входящий запрос
        remoteProxyService.logProxyRequest(method, path, userAgent);
        
        try {
            String targetUrl = remoteServerUrl + path;
            
            // Добавляем query parameters если есть
            String queryString = request.getQueryString();
            if (queryString != null) {
                targetUrl += "?" + queryString;
            }
            
            // Подготавливаем заголовки
            HttpHeaders httpHeaders = new HttpHeaders();
            
            // Определяем нужна ли аутентификация для удаленного сервера
            boolean isPublicEndpoint = path.startsWith("/auth/");
            boolean needsRemoteAuth = path.startsWith("/sync/") || path.startsWith("/api/");
            
            System.out.println("🔄 Is Public Endpoint: " + isPublicEndpoint);
            System.out.println("🔄 Needs Remote Auth: " + needsRemoteAuth);
            
            System.out.println("🔄 Incoming Headers:");
            for (Map.Entry<String, String> header : headers.entrySet()) {
                System.out.println("🔄   " + header.getKey() + ": " + 
                    (header.getKey().toLowerCase().equals("authorization") ? "Bearer ****" : header.getValue()));
            }
            
            // Копируем все важные заголовки КРОМЕ Authorization для публичных эндпоинтов
            for (Map.Entry<String, String> header : headers.entrySet()) {
                String headerName = header.getKey().toLowerCase();
                
                // Пропускаем Authorization для публичных эндпоинтов удаленного сервера
                if (headerName.equals("authorization") && isPublicEndpoint) {
                    System.out.println("🔄 Пропускаем локальный токен для публичного эндпоинта: " + path);
                    continue;
                }
                
                // Передаем остальные важные заголовки
                if (headerName.equals("authorization") || 
                    headerName.equals("content-type") || 
                    headerName.equals("accept") ||
                    headerName.equals("user-agent") ||
                    headerName.equals("accept-language") ||
                    headerName.equals("accept-encoding")) {
                    httpHeaders.set(header.getKey(), header.getValue());
                    System.out.println("🔄 Передаем заголовок: " + header.getKey() + " = " + 
                        (headerName.equals("authorization") ? "Bearer ****" : header.getValue()));
                }
            }
            
            // Проверяем наличие X-Remote-Token для удаленной аутентификации
            String remoteToken = headers.get("x-remote-token");
            if (remoteToken != null && !remoteToken.isEmpty() && needsRemoteAuth) {
                // Используем удаленный токен для защищенных эндпоинтов
                httpHeaders.set("Authorization", "Bearer " + remoteToken);
                System.out.println("🔄 Устанавливаем удаленный токен для защищенного эндпоинта: " + path);
            }
            
            // Подготавливаем тело запроса
            HttpEntity<String> entity = new HttpEntity<>(body, httpHeaders);
            
            // Определяем HTTP метод
            HttpMethod httpMethod = HttpMethod.valueOf(method);
            
            System.out.println("🔄 Final Headers to Remote Server:");
            for (String headerName : httpHeaders.keySet()) {
                System.out.println("🔄   " + headerName + ": " + 
                    (headerName.toLowerCase().equals("authorization") ? "Bearer ****" : httpHeaders.getFirst(headerName)));
            }
            
            System.out.println("🔄 Отправляем запрос на: " + targetUrl);
            System.out.println("🔄 С заголовками: " + httpHeaders.keySet());
            
            // Выполняем запрос к удаленному серверу
            ResponseEntity<String> response = restTemplate.exchange(
                targetUrl, 
                httpMethod, 
                entity, 
                String.class
            );
            
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("🔄 Response Status: " + response.getStatusCode());
            System.out.println("🔄 Response Body: " + (response.getBody() != null ? response.getBody().substring(0, Math.min(response.getBody().length(), 200)) + "..." : "null"));
            System.out.println("🔄 Response Headers: " + response.getHeaders().keySet());
            System.out.println("🔄 ========== PROXY REQUEST SUCCESS ==========");
            
            remoteProxyService.logProxyResponse(method, path, response.getStatusCode().value(), duration);
            
            // ✅ АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ РЕЗУЛЬТАТОВ VERIFY-OTP
            if (path.equals("/auth/verify-otp") && "POST".equals(method) && response.getStatusCode().is2xxSuccessful()) {
                try {
                    System.out.println("🔄 🔧 ОБРАБАТЫВАЕМ УСПЕШНУЮ ВЕРИФИКАЦИЮ OTP 🔧");
                    
                    String responseBody = response.getBody();
                    if (responseBody != null) {
                        JsonNode responseJson = objectMapper.readTree(responseBody);
                        
                        if (responseJson.has("token") && responseJson.has("userId")) {
                            String remoteAuthToken = responseJson.get("token").asText();
                            String remoteUserId = responseJson.get("userId").asText();
                            
                            System.out.println("🔄 Извлекли из ответа:");
                            System.out.println("🔄   remoteToken: Present (" + remoteAuthToken.length() + " chars)");
                            System.out.println("🔄   remoteUserId: " + remoteUserId);
                            
                            // Сохраняем в локальной базе
                            userService.updateRemoteData(remoteUserId, remoteAuthToken);
                            
                            System.out.println("🔄 ✅ Удаленные данные сохранены в локальной БД");
                        } else {
                            System.out.println("🔄 ℹ️ Ответ не содержит token/userId - пропускаем сохранение");
                        }
                    }
                } catch (Exception e) {
                    System.out.println("🔄 ❌ Ошибка сохранения удаленных данных: " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            // ✅ ВОЗВРАЩАЕМ ОТВЕТ УДАЛЕННОГО СЕРВЕРА КАК ЕСТЬ (CORS заголовки уже есть)
            System.out.println("🔄 ✅ ВОЗВРАЩАЕМ ОТВЕТ ФРОНТЕНДУ:");
            System.out.println("🔄   Status: " + response.getStatusCode());
            System.out.println("🔄   Headers from remote: " + response.getHeaders().keySet());
            System.out.println("🔄   Body: " + (response.getBody() != null ? response.getBody().substring(0, Math.min(response.getBody().length(), 100)) + "..." : "null"));
            
            return response;
                
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            long duration = System.currentTimeMillis() - startTime;
            String errorMsg = e.getStatusCode() + " - " + e.getResponseBodyAsString();
            System.out.println("🔄 ========== PROXY REQUEST ERROR ==========");
            System.out.println("🔄 Error Status: " + e.getStatusCode());
            System.out.println("🔄 Error Body: " + e.getResponseBodyAsString());
            System.out.println("🔄 ========== PROXY REQUEST ERROR END ==========");
            
            remoteProxyService.logProxyError(method, path, errorMsg);
            
            return ResponseEntity
                .status(e.getStatusCode())
                .body(e.getResponseBodyAsString());
                
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("🔄 ========== PROXY REQUEST EXCEPTION ==========");
            System.out.println("🔄 Exception: " + e.getMessage());
            e.printStackTrace();
            System.out.println("🔄 ========== PROXY REQUEST EXCEPTION END ==========");
            
            remoteProxyService.logProxyError(method, path, e.getMessage());
            
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", "Failed to connect to remote server: " + e.getMessage()));
        }
    }
    
    /**
     * Проверка доступности удаленного сервера
     */
    @GetMapping("/health-check")
    public ResponseEntity<?> checkRemoteHealth() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                remoteServerUrl + "/actuator/health", 
                String.class
            );
            
            return ResponseEntity.ok(Map.of(
                "remoteServerAvailable", true,
                "remoteServerUrl", remoteServerUrl,
                "status", response.getStatusCode()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "remoteServerAvailable", false,
                "remoteServerUrl", remoteServerUrl,
                "error", e.getMessage()
            ));
        }
    }
    
    /**
     * Получение статистики прокси
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getProxyStats() {
        return ResponseEntity.ok(remoteProxyService.getStats());
    }
} 