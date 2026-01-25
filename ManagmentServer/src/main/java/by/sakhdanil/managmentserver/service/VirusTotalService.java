package by.sakhdanil.managmentserver.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Сервис для интеграции с VirusTotal API v3.
 * 
 * API Documentation: https://developers.virustotal.com/reference/overview
 * 
 * Бесплатный план: 500 запросов/день, 4 запроса/минуту
 */
@Service
@Slf4j
public class VirusTotalService {
    
    @Value("${virustotal.api-key:}")
    private String apiKey;
    
    @Value("${virustotal.api-url:https://www.virustotal.com/api/v3}")
    private String apiUrl;
    
    @Value("${virustotal.enabled:true}")
    private boolean enabled;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public VirusTotalService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Проверяет, настроен ли VirusTotal API
     */
    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your-api-key-here");
    }
    
    /**
     * Загружает файл для анализа.
     * POST https://www.virustotal.com/api/v3/files
     * 
     * @param fileData Данные файла
     * @param fileName Имя файла
     * @return ID анализа или null при ошибке
     */
    public String uploadFileForScan(byte[] fileData, String fileName) {
        if (!isConfigured()) {
            log.warn("VirusTotal API is not configured, skipping scan");
            return null;
        }
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(fileData) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            });
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                    apiUrl + "/files",
                    requestEntity,
                    String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());
                String analysisId = json.path("data").path("id").asText();
                log.info("File uploaded to VirusTotal, analysis ID: {}", analysisId);
                return analysisId;
            }
            
        } catch (Exception e) {
            log.error("Error uploading file to VirusTotal: {}", e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Получает результаты анализа по ID.
     * GET https://www.virustotal.com/api/v3/analyses/{id}
     * 
     * @param analysisId ID анализа
     * @return JSON с результатами или null
     */
    public String getAnalysisResult(String analysisId) {
        if (!isConfigured()) {
            return null;
        }
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            
            HttpEntity<String> requestEntity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl + "/analyses/" + analysisId,
                    org.springframework.http.HttpMethod.GET,
                    requestEntity,
                    String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }
            
        } catch (Exception e) {
            log.error("Error getting analysis result from VirusTotal: {}", e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Получает отчет по SHA-256 хешу файла (кеширование).
     * GET https://www.virustotal.com/api/v3/files/{hash}
     * 
     * @param sha256Hash SHA-256 хеш файла
     * @return JSON с отчетом или null если файл не найден
     */
    public String getReportByHash(String sha256Hash) {
        if (!isConfigured()) {
            return null;
        }
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            
            HttpEntity<String> requestEntity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl + "/files/" + sha256Hash,
                    org.springframework.http.HttpMethod.GET,
                    requestEntity,
                    String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Found cached VirusTotal report for hash: {}", sha256Hash);
                return response.getBody();
            }
            
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            // Файл не найден в базе VirusTotal - это нормально
            log.debug("File not found in VirusTotal cache: {}", sha256Hash);
        } catch (Exception e) {
            log.error("Error getting report from VirusTotal: {}", e.getMessage());
        }
        
        return null;
    }
}




