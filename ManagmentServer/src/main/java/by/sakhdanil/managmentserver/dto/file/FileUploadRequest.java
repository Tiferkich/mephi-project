package by.sakhdanil.managmentserver.dto.file;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для загрузки файла на Remote Server
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
}




