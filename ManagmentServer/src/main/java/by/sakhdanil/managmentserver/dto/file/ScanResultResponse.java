package by.sakhdanil.managmentserver.dto.file;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO для результатов сканирования файла на вирусы через VirusTotal API
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
     * Количество обнаруженных угроз (malicious + suspicious)
     */
    private Integer threatsFound;
    
    /**
     * Количество движков, определивших файл как вредоносный
     */
    private Integer malicious;
    
    /**
     * Количество движков, определивших файл как подозрительный
     */
    private Integer suspicious;
    
    /**
     * Количество движков, определивших файл как безопасный
     */
    private Integer harmless;
    
    /**
     * Количество движков, не обнаруживших угроз
     */
    private Integer undetected;
    
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
         * Категория угрозы
         */
        private String category;
        
        /**
         * Название обнаруженной угрозы
         */
        private String result;
    }
}




