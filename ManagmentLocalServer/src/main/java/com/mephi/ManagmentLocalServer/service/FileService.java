package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.file.FileResponse;
import com.mephi.ManagmentLocalServer.dto.file.FileUploadRequest;
import com.mephi.ManagmentLocalServer.dto.file.ScanResultResponse;
import com.mephi.ManagmentLocalServer.entity.FileEntry;
import com.mephi.ManagmentLocalServer.entity.FileEntry.ScanStatus;
import com.mephi.ManagmentLocalServer.repository.FileEntryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Сервис для работы с файлами на локальном сервере.
 * Все файлы хранятся в зашифрованном виде (шифрование на клиенте ГОСТ 34.12-2018).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {
    
    private final FileEntryRepository fileEntryRepository;
    
    @Value("${file.storage.path:./data/files}")
    private String storagePath;
    
    // Максимальный размер файла: 50 MB
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
    
    @PostConstruct
    public void init() throws IOException {
        Path uploadDir = Paths.get(storagePath);
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
            log.info("Created file storage directory: {}", uploadDir.toAbsolutePath());
        }
    }
    
    /**
     * Загрузка зашифрованного файла
     */
    @Transactional
    public FileResponse uploadFile(String userId, MultipartFile file, FileUploadRequest request) throws IOException {
        log.info("Uploading file for user {}, size: {} bytes", userId, file.getSize());
        
        // Валидация размера
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 50 MB");
        }
        
        // Генерируем уникальное имя файла для хранения
        String filename = UUID.randomUUID().toString() + ".enc";
        Path filePath = Paths.get(storagePath, filename);
        
        // Сохраняем файл на диск
        Files.write(filePath, file.getBytes());
        log.info("File saved to disk: {}", filePath);
        
        // Создаем запись о файле в БД
        log.info("Creating file entry with widgetId={}", request.getWidgetId());
        FileEntry fileEntry = FileEntry.builder()
                .userId(userId)
                .widgetId(request.getWidgetId())
                .encryptedName(request.getEncryptedName())
                .encryptedMimeType(request.getEncryptedMimeType())
                .storagePath(filename) // Храним только имя файла
                .originalSize(request.getOriginalSize())
                .encryptedSize(file.getSize())
                .checksum(request.getChecksum())
                .dataIv(request.getDataIv())
                .dataSalt(request.getDataSalt())
                .scanStatus(ScanStatus.NOT_SCANNED)
                .threatsFound(0)
                .build();
        
        FileEntry savedEntry = fileEntryRepository.save(fileEntry);
        log.info("File saved with ID: {}", savedEntry.getId());
        
        return FileResponse.fromEntity(savedEntry);
    }
    
    /**
     * Создание локальной записи для файла, загруженного в облако
     * Файл физически хранится на remote сервере, здесь только метаданные
     */
    @Transactional
    public FileResponse createCloudFileEntry(
            String userId,
            String encryptedName,
            String encryptedMimeType,
            String checksum,
            Long originalSize,
            Long encryptedSize,
            Long remoteId,
            String scanStatus,
            String widgetId) {
        
        log.info("Creating local entry for cloud file, userId={}, remoteId={}", userId, remoteId);
        
        FileEntry fileEntry = FileEntry.builder()
                .userId(userId)
                .widgetId(widgetId)
                .encryptedName(encryptedName)
                .encryptedMimeType(encryptedMimeType)
                .storagePath(null) // Нет локального файла - он в облаке
                .originalSize(originalSize)
                .encryptedSize(encryptedSize)
                .checksum(checksum)
                .remoteId(remoteId)
                .scanStatus(parseScanStatus(scanStatus))
                .threatsFound(0)
                .build();
        
        FileEntry savedEntry = fileEntryRepository.save(fileEntry);
        log.info("Cloud file entry created with ID: {}, remoteId: {}", savedEntry.getId(), remoteId);
        
        return FileResponse.fromEntity(savedEntry);
    }
    
    private ScanStatus parseScanStatus(String status) {
        if (status == null) return ScanStatus.NOT_SCANNED;
        try {
            return ScanStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return ScanStatus.NOT_SCANNED;
        }
    }
    
    /**
     * Получение списка файлов пользователя (с опциональной фильтрацией по виджету)
     */
    public List<FileResponse> getAllFiles(String userId, String widgetId) {
        log.info("Getting files for userId={}, widgetId={}", userId, widgetId);
        List<FileEntry> entries;
        if (widgetId != null && !widgetId.isEmpty()) {
            entries = fileEntryRepository.findByUserIdAndWidgetIdOrderByCreatedAtDesc(userId, widgetId);
            log.info("Found {} files with widgetId={}", entries.size(), widgetId);
        } else {
            entries = fileEntryRepository.findByUserIdOrderByCreatedAtDesc(userId);
            log.info("Found {} files (no widgetId filter)", entries.size());
        }
        return entries.stream()
                .map(FileResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Получение списка всех файлов пользователя (без фильтра)
     */
    public List<FileResponse> getAllFiles(String userId) {
        return getAllFiles(userId, null);
    }
    
    /**
     * Получение информации о файле
     */
    public FileResponse getFile(String userId, Long fileId) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        return FileResponse.fromEntity(fileEntry);
    }
    
    /**
     * Получение данных файла для скачивания
     */
    public FileEntry getFileForDownload(String userId, Long fileId) {
        return fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
    }
    
    /**
     * Получение байтов файла с диска
     */
    public byte[] getFileBytes(FileEntry fileEntry) throws IOException {
        Path filePath = Paths.get(storagePath, fileEntry.getStoragePath());
        log.info("Attempting to read file from: {} (storagePath={}, filename={})", 
                filePath.toAbsolutePath(), storagePath, fileEntry.getStoragePath());
        
        if (!Files.exists(filePath)) {
            log.error("File not found on disk: {}", filePath.toAbsolutePath());
            throw new IOException("File not found on disk: " + filePath.toAbsolutePath());
        }
        
        byte[] bytes = Files.readAllBytes(filePath);
        log.info("Successfully read {} bytes from file", bytes.length);
        return bytes;
    }
    
    /**
     * Удаление файла
     */
    @Transactional
    public void deleteFile(String userId, Long fileId) throws IOException {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        // Удаляем файл с диска
        Path filePath = Paths.get(storagePath, fileEntry.getStoragePath());
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            log.info("Deleted file from disk: {}", filePath);
        }
        
        fileEntryRepository.delete(fileEntry);
        log.info("File {} deleted for user {}", fileId, userId);
    }
    
    /**
     * Запрос на сканирование файла
     * В offline режиме сканирование недоступно
     */
    public ScanResultResponse scanFile(String userId, Long fileId) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        // В локальном сервере сканирование недоступно напрямую
        // Нужно загрузить файл на remote server для сканирования
        log.warn("Scan requested for file {} but remote scanning not implemented yet", fileId);
        return ScanResultResponse.offlineMode(fileId);
    }
    
    /**
     * Обновление статуса сканирования (вызывается при синхронизации)
     */
    @Transactional
    public void updateScanStatus(Long fileId, String userId, ScanStatus status, Integer threatsFound, String scanResult) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        fileEntry.setScanStatus(status);
        fileEntry.setThreatsFound(threatsFound);
        fileEntry.setScanResult(scanResult);
        fileEntry.setScannedAt(java.time.LocalDateTime.now());
        
        fileEntryRepository.save(fileEntry);
        log.info("Updated scan status for file {}: {}", fileId, status);
    }
    
    /**
     * Получение статистики файлов пользователя
     */
    public FileStats getFileStats(String userId) {
        long count = fileEntryRepository.countByUserId(userId);
        Long totalSize = fileEntryRepository.getTotalSizeByUserId(userId);
        
        return new FileStats(count, totalSize != null ? totalSize : 0L);
    }

    /**
     * Удаляет с диска и из БД все файлы, привязанные к пользователю.
     */
    @Transactional
    public void deleteAllFilesForUser(String userId) throws IOException {
        List<FileEntry> entries = fileEntryRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (FileEntry fe : entries) {
            String sp = fe.getStoragePath();
            if (sp != null && !sp.isBlank()) {
                Path filePath = Paths.get(storagePath, sp);
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    log.info("Deleted file on disk: {}", filePath);
                }
            }
        }
        fileEntryRepository.deleteAllByUserId(userId);
        log.info("Removed all file records for user {}", userId);
    }
    
    /**
     * Статистика файлов
     */
    public record FileStats(long fileCount, long totalSize) {}
}
