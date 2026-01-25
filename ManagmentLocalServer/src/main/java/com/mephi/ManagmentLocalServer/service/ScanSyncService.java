package com.mephi.ManagmentLocalServer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mephi.ManagmentLocalServer.entity.FileEntry;
import com.mephi.ManagmentLocalServer.entity.FileEntry.ScanStatus;
import com.mephi.ManagmentLocalServer.repository.FileEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Сервис для синхронизации статусов сканирования облачных файлов.
 * Периодически запрашивает актуальные статусы с remote сервера.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScanSyncService {

    private final FileEntryRepository fileEntryRepository;
    private final UserService userService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${remote.server.url:http://localhost:8080}")
    private String remoteServerUrl;

    /**
     * Синхронизация статусов сканирования каждые 10 секунд
     */
    @Scheduled(fixedDelay = 10000, initialDelay = 5000)
    public void syncPendingScanStatuses() {
        try {
            // Получаем все облачные файлы со статусом PENDING
            List<FileEntry> pendingFiles = fileEntryRepository.findByRemoteIdNotNullAndScanStatus(ScanStatus.PENDING);
            
            if (pendingFiles.isEmpty()) {
                return; // Нет файлов для синхронизации
            }
            
            log.debug("🔄 SCAN SYNC: Found {} cloud files with PENDING status", pendingFiles.size());
            
            // Получаем remote token
            String remoteToken = null;
            try {
                var user = userService.getCurrentUser();
                if (user != null) {
                    remoteToken = user.getRemoteToken();
                }
            } catch (Exception e) {
                log.debug("🔄 SCAN SYNC: No setup user found, skipping sync");
                return;
            }
            
            if (remoteToken == null || remoteToken.isEmpty()) {
                log.debug("🔄 SCAN SYNC: No remote token, skipping sync");
                return;
            }
            
            // Синхронизируем каждый файл
            for (FileEntry file : pendingFiles) {
                syncFileStatus(file, remoteToken);
            }
            
        } catch (Exception e) {
            log.error("🔄 SCAN SYNC ERROR: {}", e.getMessage());
        }
    }

    @Transactional
    protected void syncFileStatus(FileEntry file, String remoteToken) {
        try {
            String url = remoteServerUrl + "/api/files/" + file.getRemoteId();
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + remoteToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());
                
                String scanStatus = json.has("scanStatus") ? json.get("scanStatus").asText() : null;
                int threatsFound = json.has("threatsFound") ? json.get("threatsFound").asInt() : 0;
                
                if (scanStatus != null && !scanStatus.equals("PENDING")) {
                    // Обновляем статус
                    file.setScanStatus(parseScanStatus(scanStatus));
                    file.setThreatsFound(threatsFound);
                    file.setScannedAt(java.time.LocalDateTime.now());
                    fileEntryRepository.save(file);
                    
                    log.info("🔄 SCAN SYNC: Updated file {} (remoteId={}): {} -> {}", 
                            file.getId(), file.getRemoteId(), "PENDING", scanStatus);
                }
            }
        } catch (Exception e) {
            log.debug("🔄 SCAN SYNC: Failed to sync file {} (remoteId={}): {}", 
                    file.getId(), file.getRemoteId(), e.getMessage());
        }
    }
    
    private ScanStatus parseScanStatus(String status) {
        if (status == null) return ScanStatus.PENDING;
        try {
            return ScanStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return ScanStatus.PENDING;
        }
    }
}

