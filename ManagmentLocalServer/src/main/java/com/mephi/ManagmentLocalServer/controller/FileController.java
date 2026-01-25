package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.file.FileResponse;
import com.mephi.ManagmentLocalServer.dto.file.FileUploadRequest;
import com.mephi.ManagmentLocalServer.dto.file.ScanResultResponse;
import com.mephi.ManagmentLocalServer.entity.FileEntry;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.service.FileService;
import com.mephi.ManagmentLocalServer.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * REST API для управления зашифрованными файлами пользователя.
 * Все файлы шифруются на клиенте с использованием ГОСТ 34.12-2018.
 */
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Files", description = "API для управления зашифрованными файлами")
public class FileController {
    
    private final FileService fileService;
    private final UserService userService;
    
    /**
     * Загрузка зашифрованного файла
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Загрузка зашифрованного файла")
    public ResponseEntity<FileResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("encryptedName") String encryptedName,
            @RequestParam("encryptedMimeType") String encryptedMimeType,
            @RequestParam("checksum") String checksum,
            @RequestParam("originalSize") Long originalSize,
            @RequestParam("dataIv") String dataIv,
            @RequestParam("dataSalt") String dataSalt,
            @RequestParam(value = "widgetId", required = false) String widgetId,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser();
            
            FileUploadRequest request = FileUploadRequest.builder()
                    .encryptedName(encryptedName)
                    .encryptedMimeType(encryptedMimeType)
                    .checksum(checksum)
                    .originalSize(originalSize)
                    .dataIv(dataIv)
                    .dataSalt(dataSalt)
                    .widgetId(widgetId)
                    .build();
            
            FileResponse response = fileService.uploadFile(user.getId(), file, request);
            
            log.info("File uploaded successfully for user {}: {}", user.getUsername(), response.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (IllegalArgumentException e) {
            log.warn("Invalid file upload request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получение списка файлов пользователя (с опциональной фильтрацией по виджету)
     */
    @GetMapping
    @Operation(summary = "Получить список файлов")
    public ResponseEntity<List<FileResponse>> getAllFiles(
            @RequestParam(value = "widgetId", required = false) String widgetId,
            Authentication authentication) {
        User user = getCurrentUser();
        List<FileResponse> files = fileService.getAllFiles(user.getId(), widgetId);
        return ResponseEntity.ok(files);
    }
    
    /**
     * Получение информации о файле
     */
    @GetMapping("/{id}")
    @Operation(summary = "Получить информацию о файле")
    public ResponseEntity<FileResponse> getFile(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser();
            FileResponse response = fileService.getFile(user.getId(), id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Скачивание зашифрованного файла
     */
    @GetMapping("/{id}/download")
    @Operation(summary = "Скачать зашифрованный файл")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser();
            FileEntry fileEntry = fileService.getFileForDownload(user.getId(), id);
            
            // Читаем файл с диска
            byte[] fileBytes = fileService.getFileBytes(fileEntry);
            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            
            // Передаем метаданные в заголовках
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=encrypted_file");
            headers.add("X-Encrypted-Name", fileEntry.getEncryptedName());
            headers.add("X-Encrypted-MimeType", fileEntry.getEncryptedMimeType());
            headers.add("X-Original-Size", String.valueOf(fileEntry.getOriginalSize()));
            headers.add("X-Checksum", fileEntry.getChecksum());
            // IV и Salt для дешифрования данных файла
            headers.add("X-Data-Iv", fileEntry.getDataIv());
            headers.add("X-Data-Salt", fileEntry.getDataSalt());
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(fileEntry.getEncryptedSize())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Error reading file from disk: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Удаление файла
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить файл")
    public ResponseEntity<Void> deleteFile(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser();
            fileService.deleteFile(user.getId(), id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Error deleting file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Запрос на проверку файла на вирусы
     * Работает только в online режиме (через Remote Server)
     */
    @PostMapping("/{id}/scan")
    @Operation(summary = "Проверить файл на вирусы (только online режим)")
    public ResponseEntity<ScanResultResponse> scanFile(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser();
            ScanResultResponse result = fileService.scanFile(user.getId(), id);
            
            if (!result.isSuccess() && "NOT_SCANNED".equals(result.getStatus())) {
                // Offline режим
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(result);
            }
            
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Получение статистики файлов
     */
    @GetMapping("/stats")
    @Operation(summary = "Получить статистику файлов")
    public ResponseEntity<Map<String, Object>> getFileStats(Authentication authentication) {
        User user = getCurrentUser();
        FileService.FileStats stats = fileService.getFileStats(user.getId());
        
        return ResponseEntity.ok(Map.of(
                "fileCount", stats.fileCount(),
                "totalSize", stats.totalSize(),
                "totalSizeFormatted", formatFileSize(stats.totalSize())
        ));
    }
    
    /**
     * Получение текущего пользователя
     */
    private User getCurrentUser() {
        return userService.getCurrentUser();
    }
    
    /**
     * Форматирование размера файла
     */
    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }
}
