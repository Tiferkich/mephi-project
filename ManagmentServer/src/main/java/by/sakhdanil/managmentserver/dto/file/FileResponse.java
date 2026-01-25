package by.sakhdanil.managmentserver.dto.file;

import by.sakhdanil.managmentserver.entity.FileEntry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO для ответа с информацией о файле
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileResponse {
    
    private Long id;
    
    /**
     * Зашифрованное имя файла (JSON)
     */
    private String encryptedName;
    
    /**
     * Зашифрованный MIME тип (JSON)
     */
    private String encryptedMimeType;
    
    /**
     * Оригинальный размер файла в байтах
     */
    private Long originalSize;
    
    /**
     * Размер зашифрованных данных в байтах
     */
    private Long encryptedSize;
    
    /**
     * SHA-256 хеш оригинального файла
     */
    private String checksum;
    
    /**
     * Статус проверки на вирусы
     */
    private String scanStatus;
    
    /**
     * Количество обнаруженных угроз
     */
    private Integer threatsFound;
    
    /**
     * Время сканирования
     */
    private LocalDateTime scannedAt;
    
    /**
     * Время создания
     */
    private LocalDateTime createdAt;
    
    /**
     * Время обновления
     */
    private LocalDateTime updatedAt;
    
    /**
     * Создание DTO из Entity
     */
    public static FileResponse fromEntity(FileEntry entity) {
        return FileResponse.builder()
                .id(entity.getId())
                .encryptedName(entity.getEncryptedName())
                .encryptedMimeType(entity.getEncryptedMimeType())
                .originalSize(entity.getOriginalSize())
                .encryptedSize(entity.getEncryptedSize())
                .checksum(entity.getChecksum())
                .scanStatus(entity.getScanStatus().name())
                .threatsFound(entity.getThreatsFound())
                .scannedAt(entity.getScannedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}




