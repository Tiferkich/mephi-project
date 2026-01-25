package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.FileEntry;
import by.sakhdanil.managmentserver.entity.FileEntry.ScanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с файлами пользователей на удаленном сервере
 */
@Repository
public interface FileEntryRepository extends JpaRepository<FileEntry, Long> {
    
    /**
     * Найти все файлы пользователя
     */
    List<FileEntry> findByUserIdOrderByCreatedAtDesc(String userId);
    
    /**
     * Найти файл по ID и пользователю
     */
    Optional<FileEntry> findByIdAndUserId(Long id, String userId);
    
    /**
     * Найти файлы по статусу сканирования
     */
    List<FileEntry> findByUserIdAndScanStatus(String userId, ScanStatus scanStatus);
    
    /**
     * Найти все файлы со статусом PENDING (для polling результатов VirusTotal)
     */
    List<FileEntry> findByScanStatus(ScanStatus scanStatus);
    
    /**
     * Найти файл по checksum (для дедупликации и проверки по кешу VirusTotal)
     */
    Optional<FileEntry> findByChecksumAndUserId(String checksum, String userId);
    
    /**
     * Проверить существует ли файл с таким checksum (глобально)
     */
    Optional<FileEntry> findFirstByChecksum(String checksum);
    
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
     * Найти файлы с угрозами
     */
    List<FileEntry> findByUserIdAndScanStatusAndThreatsFoundGreaterThan(
        String userId, ScanStatus scanStatus, Integer minThreats);
}

