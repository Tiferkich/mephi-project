package com.mephi.ManagmentLocalServer.repository;

import com.mephi.ManagmentLocalServer.entity.FileEntry;
import com.mephi.ManagmentLocalServer.entity.FileEntry.ScanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с файлами пользователей
 */
@Repository
public interface FileEntryRepository extends JpaRepository<FileEntry, Long> {
    
    /**
     * Найти все файлы пользователя
     */
    List<FileEntry> findByUserIdOrderByCreatedAtDesc(String userId);
    
    /**
     * Найти файлы пользователя в конкретном виджете
     */
    List<FileEntry> findByUserIdAndWidgetIdOrderByCreatedAtDesc(String userId, String widgetId);
    
    /**
     * Найти файл по ID и пользователю
     */
    Optional<FileEntry> findByIdAndUserId(Long id, String userId);
    
    /**
     * Найти файлы по статусу сканирования
     */
    List<FileEntry> findByUserIdAndScanStatus(String userId, ScanStatus scanStatus);
    
    /**
     * Найти несинхронизированные файлы
     */
    @Query("SELECT f FROM FileEntry f WHERE f.userId = :userId AND f.remoteId IS NULL")
    List<FileEntry> findUnsyncedFiles(@Param("userId") String userId);
    
    /**
     * Найти файл по remote ID
     */
    Optional<FileEntry> findByRemoteIdAndUserId(Long remoteId, String userId);
    
    /**
     * Подсчитать количество файлов пользователя
     */
    long countByUserId(String userId);
    
    /**
     * Подсчитать общий размер файлов пользователя
     */
    @Query("SELECT COALESCE(SUM(f.encryptedSize), 0) FROM FileEntry f WHERE f.userId = :userId")
    Long getTotalSizeByUserId(@Param("userId") String userId);
    
    /**
     * Удалить все файлы пользователя
     */
    void deleteAllByUserId(String userId);
    
    /**
     * Найти файлы со статусом PENDING (для polling)
     */
    List<FileEntry> findByScanStatus(ScanStatus scanStatus);
    
    /**
     * Найти облачные файлы с определённым статусом сканирования
     * (для синхронизации статусов с remote сервером)
     */
    List<FileEntry> findByRemoteIdNotNullAndScanStatus(ScanStatus scanStatus);
}

