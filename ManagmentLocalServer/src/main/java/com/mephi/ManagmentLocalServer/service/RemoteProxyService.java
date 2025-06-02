package com.mephi.ManagmentLocalServer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class RemoteProxyService {

    @Value("${remote.server.url:http://localhost:8080}")
    private String remoteServerUrl;

    private final AtomicLong requestCounter = new AtomicLong(0);
    private final ConcurrentHashMap<String, AtomicLong> endpointStats = new ConcurrentHashMap<>();
    private LocalDateTime lastRequestTime;

    /**
     * Логирует прокси-запрос
     */
    public void logProxyRequest(String method, String path, String userAgent) {
        long requestId = requestCounter.incrementAndGet();
        lastRequestTime = LocalDateTime.now();
        
        // Увеличиваем счетчик для эндпоинта
        String endpoint = method + " " + path;
        endpointStats.computeIfAbsent(endpoint, k -> new AtomicLong(0)).incrementAndGet();
        
        log.info("🔄 Proxy Request #{}: {} {} - UserAgent: {}", 
                requestId, method, path, userAgent);
    }

    /**
     * Логирует ответ от удаленного сервера
     */
    public void logProxyResponse(String method, String path, int statusCode, long duration) {
        log.info("✅ Proxy Response: {} {} - Status: {} - Duration: {}ms", 
                method, path, statusCode, duration);
    }

    /**
     * Логирует ошибку прокси
     */
    public void logProxyError(String method, String path, String error) {
        log.error("❌ Proxy Error: {} {} - Error: {}", method, path, error);
    }

    /**
     * Получает статистику прокси
     */
    public ProxyStats getStats() {
        return ProxyStats.builder()
                .totalRequests(requestCounter.get())
                .remoteServerUrl(remoteServerUrl)
                .lastRequestTime(lastRequestTime)
                .endpointStats(new ConcurrentHashMap<>(endpointStats))
                .build();
    }

    @lombok.Builder
    @lombok.Data
    public static class ProxyStats {
        private long totalRequests;
        private String remoteServerUrl;
        private LocalDateTime lastRequestTime;
        private ConcurrentHashMap<String, AtomicLong> endpointStats;
    }
} 