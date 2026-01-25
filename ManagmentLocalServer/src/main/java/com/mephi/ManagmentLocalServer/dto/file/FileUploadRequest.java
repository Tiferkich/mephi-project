package com.mephi.ManagmentLocalServer.dto.file;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для загрузки файла
 * Файл уже зашифрован на клиенте с использованием ГОСТ 34.12-2018
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadRequest {
    
    /**
     * Зашифрованное имя файла (JSON: {data, iv, algorithm})
     */
    @NotBlank(message = "Encrypted name is required")
    private String encryptedName;
    
    /**
     * Зашифрованный MIME тип (JSON: {data, iv, algorithm})
     */
    @NotBlank(message = "Encrypted MIME type is required")
    private String encryptedMimeType;
    
    /**
     * SHA-256 хеш оригинального файла
     */
    @NotBlank(message = "Checksum is required")
    private String checksum;
    
    /**
     * Оригинальный размер файла в байтах
     */
    @NotNull(message = "Original size is required")
    @Positive(message = "Original size must be positive")
    private Long originalSize;
    
    /**
     * IV для дешифрования данных файла (Base64)
     */
    @NotBlank(message = "Data IV is required")
    private String dataIv;
    
    /**
     * Salt для дешифрования данных файла (Base64)
     */
    @NotBlank(message = "Data salt is required")
    private String dataSalt;
    
    /**
     * ID виджета к которому привязан файл (опционально)
     */
    private String widgetId;
}

