package com.mephi.ManagmentLocalServer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Сущность для хранения зашифрованных файлов пользователя.
 * Все данные файла (имя, тип, содержимое) хранятся в зашифрованном виде.
 * Шифрование происходит на клиенте с использованием ГОСТ 34.12-2018.
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
     * ID пользователя-владельца файла (String UUID)
     */
    @Column(nullable = false)
    private String userId;
    
    /**
     * ID виджета к которому привязан файл
     */
    @Column
    private String widgetId;
    
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
     * Путь к зашифрованному файлу на диске
     * Файлы хранятся в uploads/ директории
     * Для облачных файлов может быть null
     */
    @Column(nullable = true)
    private String storagePath;
    
    /**
     * IV (вектор инициализации) для дешифрования данных файла (Base64)
     * Для облачных файлов может быть null (хранится на remote сервере)
     */
    @Column(nullable = true)
    private String dataIv;
    
    /**
     * Salt для дешифрования данных файла (Base64)
     * Для облачных файлов может быть null (хранится на remote сервере)
     */
    @Column(nullable = true)
    private String dataSalt;
    
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
     * SHA-256 хеш оригинального файла (для проверки целостности)
     */
    @Column(nullable = false, length = 64)
    private String checksum;
    
    /**
     * Статус проверки на вирусы
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScanStatus scanStatus = ScanStatus.NOT_SCANNED;
    
    /**
     * Результат сканирования (JSON с деталями)
     */
    @Column(columnDefinition = "TEXT")
    private String scanResult;
    
    /**
     * Количество обнаруженных угроз
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
     * ID файла на удаленном сервере (для синхронизации)
     */
    @Column
    private Long remoteId;
    
    /**
     * Время последней синхронизации с удаленным сервером
     */
    @Column
    private LocalDateTime lastSyncedAt;
    
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
        /** Файл не проверен (offline режим) */
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

