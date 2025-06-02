package com.mephi.ManagmentLocalServer.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/remote")
@CrossOrigin(origins = "http://localhost:3000")
public class RemoteStatusController {

    @Value("${remote.server.url:http://localhost:8080}")
    private String remoteServerUrl;
    
    private final RestTemplate restTemplate;

    public RemoteStatusController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Публичный эндпоинт для проверки доступности удаленного сервера
     */
    @GetMapping("/status")
    public ResponseEntity<?> checkRemoteStatus() {
        try {
            System.out.println("🔄 Проверяем статус удаленного сервера: " + remoteServerUrl);
            
            // Пробуем подключиться к удаленному серверу
            ResponseEntity<String> response = restTemplate.getForEntity(
                remoteServerUrl + "/actuator/health", 
                String.class
            );
            
            System.out.println("🔄 ✅ Удаленный сервер доступен, статус: " + response.getStatusCode());
            
            return ResponseEntity.ok(Map.of(
                "status", "online",
                "message", "Remote server is available",
                "remoteServerUrl", remoteServerUrl,
                "httpStatus", response.getStatusCode().value()
            ));
            
        } catch (Exception e) {
            System.out.println("🔄 ❌ Удаленный сервер недоступен: " + e.getMessage());
            
            return ResponseEntity.ok(Map.of(
                "status", "offline",
                "message", "Remote server is not available",
                "remoteServerUrl", remoteServerUrl,
                "error", e.getMessage()
            ));
        }
    }
} 