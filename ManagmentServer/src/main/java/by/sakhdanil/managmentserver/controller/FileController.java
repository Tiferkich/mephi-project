package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.file.FileResponse;
import by.sakhdanil.managmentserver.dto.file.FileUploadRequest;
import by.sakhdanil.managmentserver.dto.file.ScanResultResponse;
import by.sakhdanil.managmentserver.entity.FileEntry;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.FileService;
import by.sakhdanil.managmentserver.service.UserService;
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
 * REST API для управления зашифрованными файлами на Remote Server.
 * При загрузке файлов автоматически запускается проверка на вирусы через VirusTotal API.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Files", description = "API для управления зашифрованными файлами с проверкой на вирусы")
public class FileController {
    
    private final FileService fileService;
    private final UserService userService;
    
    /**
     * Загрузка зашифрованного файла с автоматической проверкой на вирусы
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Загрузка файла с автоматической проверкой на вирусы")
    public ResponseEntity<FileResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("encryptedName") String encryptedName,
            @RequestParam("encryptedMimeType") String encryptedMimeType,
            @RequestParam("checksum") String checksum,
            @RequestParam("originalSize") Long originalSize,
            Authentication authentication) {
        
        log.info("📁 File upload request received: encryptedName={}, size={}", encryptedName, originalSize);
        log.info("📁 Authentication: {}", authentication != null ? authentication.getName() : "NULL");
        
        if (authentication == null) {
            log.error("📁 Upload rejected: Authentication is null");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        try {
            User user = getCurrentUser(authentication);
            
            FileUploadRequest request = FileUploadRequest.builder()
                    .encryptedName(encryptedName)
                    .encryptedMimeType(encryptedMimeType)
                    .checksum(checksum)
                    .originalSize(originalSize)
                    .build();
            
            FileResponse response = fileService.uploadFile(user.getId(), file, request);
            
            log.info("File uploaded for user {}: ID={}, scanStatus={}",
                    user.getUsername(), response.getId(), response.getScanStatus());
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
     * Получение списка всех файлов пользователя
     */
    @GetMapping
    @Operation(summary = "Получить список всех файлов")
    public ResponseEntity<List<FileResponse>> getAllFiles(Authentication authentication) {
        User user = getCurrentUser(authentication);
        List<FileResponse> files = fileService.getAllFiles(user.getId());
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
            User user = getCurrentUser(authentication);
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
            User user = getCurrentUser(authentication);
            FileEntry fileEntry = fileService.getFileForDownload(user.getId(), id);
            
            ByteArrayResource resource = new ByteArrayResource(fileEntry.getEncryptedData());
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=encrypted_file");
            headers.add("X-Encrypted-Name", fileEntry.getEncryptedName());
            headers.add("X-Encrypted-MimeType", fileEntry.getEncryptedMimeType());
            headers.add("X-Original-Size", String.valueOf(fileEntry.getOriginalSize()));
            headers.add("X-Checksum", fileEntry.getChecksum());
            headers.add("X-Scan-Status", fileEntry.getScanStatus().name());
            headers.add("X-Threats-Found", String.valueOf(fileEntry.getThreatsFound()));
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(fileEntry.getEncryptedSize())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
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
            User user = getCurrentUser(authentication);
            fileService.deleteFile(user.getId(), id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Получение статуса сканирования файла
     */
    @GetMapping("/{id}/scan-status")
    @Operation(summary = "Получить статус проверки на вирусы")
    public ResponseEntity<ScanResultResponse> getScanStatus(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser(authentication);
            ScanResultResponse result = fileService.getScanStatus(user.getId(), id);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Повторное сканирование файла
     */
    @PostMapping("/{id}/rescan")
    @Operation(summary = "Повторно проверить файл на вирусы")
    public ResponseEntity<ScanResultResponse> rescanFile(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            User user = getCurrentUser(authentication);
            ScanResultResponse result = fileService.rescanFile(user.getId(), id);
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
        User user = getCurrentUser(authentication);
        FileService.FileStats stats = fileService.getFileStats(user.getId());
        
        return ResponseEntity.ok(Map.of(
                "fileCount", stats.fileCount(),
                "totalSize", stats.totalSize(),
                "totalSizeFormatted", formatFileSize(stats.totalSize())
        ));
    }
    
    private User getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        return (User) userService.loadUserByUsername(username);
    }
    
    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }
}

