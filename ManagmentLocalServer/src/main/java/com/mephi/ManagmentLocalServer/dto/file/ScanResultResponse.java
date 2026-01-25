package com.mephi.ManagmentLocalServer.dto.file;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO для результатов сканирования файла на вирусы
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResultResponse {
    
    /**
     * ID файла
     */
    private Long fileId;
    
    /**
     * Статус сканирования: PENDING, CLEAN, INFECTED, ERROR
     */
    private String status;
    
    /**
     * Количество обнаруженных угроз
     */
    private Integer threatsFound;
    
    /**
     * Общее количество антивирусных движков
     */
    private Integer totalEngines;
    
    /**
     * Детали угроз (если есть)
     */
    private List<ThreatInfo> threats;
    
    /**
     * Время сканирования
     */
    private LocalDateTime scannedAt;
    
    /**
     * Сообщение для пользователя
     */
    private String message;
    
    /**
     * Флаг успешности операции
     */
    private boolean success;
    
    /**
     * Информация об угрозе
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThreatInfo {
        /**
         * Название антивирусного движка
         */
        private String engineName;
        
        /**
         * Категория угрозы (malware, trojan, ransomware и т.д.)
         */
        private String category;
        
        /**
         * Название обнаруженной угрозы
         */
        private String result;
    }
    
    /**
     * Создание успешного ответа
     */
    public static ScanResultResponse success(Long fileId, String status, String message) {
        return ScanResultResponse.builder()
                .fileId(fileId)
                .status(status)
                .message(message)
                .success(true)
                .build();
    }
    
    /**
     * Создание ответа с ошибкой
     */
    public static ScanResultResponse error(Long fileId, String message) {
        return ScanResultResponse.builder()
                .fileId(fileId)
                .status("ERROR")
                .message(message)
                .success(false)
                .build();
    }
    
    /**
     * Ответ для offline режима
     */
    public static ScanResultResponse offlineMode(Long fileId) {
        return ScanResultResponse.builder()
                .fileId(fileId)
                .status("NOT_SCANNED")
                .message("Проверка на вирусы доступна только в online режиме. " +
                         "Подключитесь к интернету и настройте синхронизацию.")
                .success(false)
                .build();
    }
}




