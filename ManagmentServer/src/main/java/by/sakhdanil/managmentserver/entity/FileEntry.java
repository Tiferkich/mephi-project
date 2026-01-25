package by.sakhdanil.managmentserver.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

/**
 * Сущность для хранения зашифрованных файлов пользователя на удаленном сервере.
 * Все данные файла (имя, тип, содержимое) хранятся в зашифрованном виде.
 * Шифрование происходит на клиенте с использованием ГОСТ 34.12-2018.
 * 
 * На Remote Server дополнительно выполняется проверка на вирусы через VirusTotal API.
 */
@Entity
@Table(name = "file_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileEntry {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * ID пользователя-владельца файла (UUID как String)
     */
    @Column(nullable = false)
    private String userId;
    
    /**
     * Зашифрованное имя файла (JSON: {data, iv, algorithm})
     * Шифруется на клиенте ГОСТ 34.12-2018
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedName;
    
    /**
     * Зашифрованный MIME тип файла (JSON: {data, iv, algorithm})
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedMimeType;
    
    /**
     * Зашифрованные данные файла
     * Хранятся как BYTEA в PostgreSQL
     */
    @Column(nullable = false, columnDefinition = "BYTEA")
    @JdbcTypeCode(SqlTypes.BINARY)
    private byte[] encryptedData;
    
    /**
     * Оригинальный размер файла в байтах (до шифрования)
     */
    @Column(nullable = false)
    private Long originalSize;
    
    /**
     * Размер зашифрованных данных в байтах
     */
    @Column(nullable = false)
    private Long encryptedSize;
    
    /**
     * SHA-256 хеш оригинального файла (для проверки целостности и дедупликации)
     */
    @Column(nullable = false, length = 64)
    private String checksum;
    
    // ===== ПОЛЯ ДЛЯ СКАНИРОВАНИЯ НА ВИРУСЫ =====
    
    /**
     * Статус проверки на вирусы
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScanStatus scanStatus = ScanStatus.PENDING;
    
    /**
     * Результат сканирования (JSON с полной информацией от VirusTotal)
     */
    @Column(columnDefinition = "TEXT")
    private String scanResult;
    
    /**
     * ID анализа в VirusTotal (для polling)
     */
    @Column
    private String virusTotalAnalysisId;
    
    /**
     * Количество обнаруженных угроз (malicious + suspicious)
     */
    @Column
    @Builder.Default
    private Integer threatsFound = 0;
    
    /**
     * Время последнего сканирования
     */
    @Column
    private LocalDateTime scannedAt;
    
    /**
     * Время создания записи
     */
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    /**
     * Время последнего обновления
     */
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * Enum для статуса сканирования на вирусы
     */
    public enum ScanStatus {
        /** Файл не проверен */
        NOT_SCANNED,
        /** Проверка в процессе */
        PENDING,
        /** Файл безопасен */
        CLEAN,
        /** Обнаружены угрозы */
        INFECTED,
        /** Ошибка при проверке */
        ERROR
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

