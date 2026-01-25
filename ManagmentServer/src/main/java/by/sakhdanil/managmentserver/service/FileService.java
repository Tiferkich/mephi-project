package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.file.FileResponse;
import by.sakhdanil.managmentserver.dto.file.FileUploadRequest;
import by.sakhdanil.managmentserver.dto.file.ScanResultResponse;
import by.sakhdanil.managmentserver.entity.FileEntry;
import by.sakhdanil.managmentserver.entity.FileEntry.ScanStatus;
import by.sakhdanil.managmentserver.repository.FileEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис для работы с файлами на Remote Server.
 * При загрузке файла автоматически запускается проверка на вирусы через VirusTotal API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {
    
    private final FileEntryRepository fileEntryRepository;
    private final MalwareScanService malwareScanService;
    
    // Максимальный размер файла: 50 MB
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
    
    /**
     * Загрузка зашифрованного файла с автоматическим сканированием
     */
    @Transactional
    public FileResponse uploadFile(String userId, MultipartFile file, FileUploadRequest request) throws IOException {
        log.info("Uploading file for user {}, size: {} bytes", userId, file.getSize());
        
        // Валидация размера
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 50 MB");
        }
        
        // Проверяем, есть ли уже файл с таким checksum (для использования кеша VirusTotal)
        FileEntry existingFile = fileEntryRepository.findFirstByChecksum(request.getChecksum())
                .orElse(null);
        
        // Создаем запись о файле
        FileEntry fileEntry = FileEntry.builder()
                .userId(userId)
                .encryptedName(request.getEncryptedName())
                .encryptedMimeType(request.getEncryptedMimeType())
                .encryptedData(file.getBytes())
                .originalSize(request.getOriginalSize())
                .encryptedSize(file.getSize())
                .checksum(request.getChecksum())
                .scanStatus(ScanStatus.PENDING)
                .threatsFound(0)
                .build();
        
        // Если файл с таким checksum уже был проверен, копируем результат
        if (existingFile != null && existingFile.getScanStatus() != ScanStatus.PENDING) {
            log.info("Using cached scan result for checksum: {}", request.getChecksum());
            fileEntry.setScanStatus(existingFile.getScanStatus());
            fileEntry.setThreatsFound(existingFile.getThreatsFound());
            fileEntry.setScanResult(existingFile.getScanResult());
            fileEntry.setScannedAt(LocalDateTime.now());
        }
        
        FileEntry savedEntry = fileEntryRepository.save(fileEntry);
        log.info("File saved with ID: {}", savedEntry.getId());
        
        // Запускаем сканирование если нет кешированного результата
        if (existingFile == null || existingFile.getScanStatus() == ScanStatus.PENDING) {
            malwareScanService.initiateFileScan(savedEntry);
        }
        
        return FileResponse.fromEntity(savedEntry);
    }
    
    /**
     * Получение списка всех файлов пользователя
     */
    public List<FileResponse> getAllFiles(String userId) {
        return fileEntryRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(FileResponse::fromEntity)
                .collect(Collectors.toList());
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
     * Удаление файла
     */
    @Transactional
    public void deleteFile(String userId, Long fileId) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        fileEntryRepository.delete(fileEntry);
        log.info("File {} deleted for user {}", fileId, userId);
    }
    
    /**
     * Повторное сканирование файла
     */
    public ScanResultResponse rescanFile(String userId, Long fileId) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        // Обновляем статус
        fileEntry.setScanStatus(ScanStatus.PENDING);
        fileEntryRepository.save(fileEntry);
        
        // Запускаем новое сканирование
        malwareScanService.initiateFileScan(fileEntry);
        
        return ScanResultResponse.builder()
                .fileId(fileId)
                .status("PENDING")
                .message("Scan initiated")
                .success(true)
                .build();
    }
    
    /**
     * Получение статуса сканирования
     */
    public ScanResultResponse getScanStatus(String userId, Long fileId) {
        FileEntry fileEntry = fileEntryRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        
        return ScanResultResponse.builder()
                .fileId(fileId)
                .status(fileEntry.getScanStatus().name())
                .threatsFound(fileEntry.getThreatsFound())
                .scannedAt(fileEntry.getScannedAt())
                .success(true)
                .message(getScanStatusMessage(fileEntry))
                .build();
    }
    
    private String getScanStatusMessage(FileEntry fileEntry) {
        return switch (fileEntry.getScanStatus()) {
            case NOT_SCANNED -> "File has not been scanned";
            case PENDING -> "Scan in progress...";
            case CLEAN -> "File is safe";
            case INFECTED -> "Threats detected: " + fileEntry.getThreatsFound();
            case ERROR -> "Scan failed";
        };
    }
    
    /**
     * Получение статистики файлов
     */
    public FileStats getFileStats(String userId) {
        long count = fileEntryRepository.countByUserId(userId);
        Long totalSize = fileEntryRepository.getTotalSizeByUserId(userId);
        
        return new FileStats(count, totalSize != null ? totalSize : 0L);
    }
    
    public record FileStats(long fileCount, long totalSize) {}
}

