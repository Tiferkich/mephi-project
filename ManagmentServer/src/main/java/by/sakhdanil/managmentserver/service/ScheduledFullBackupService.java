package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.config.BackupS3Properties;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Плановые полные снимки vault в S3/MinIO (для всех пользователей).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "backup.s3", name = "enabled", havingValue = "true")
public class ScheduledFullBackupService {

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd-HH-mm");

    private final UserRepository userRepository;
    private final FullBackupService fullBackupService;
    private final S3BackupService s3BackupService;
    private final BackupS3Properties props;

    @Scheduled(cron = "${backup.s3.schedule:0 0 3 * * *}")
    public void runScheduledBackups() {
        if (!s3BackupService.isAvailable()) {
            return;
        }
        try {
            s3BackupService.ensureBucket();
        } catch (Exception e) {
            log.warn("S3 ensureBucket: {}", e.getMessage());
            return;
        }
        for (User user : userRepository.findAll()) {
            String prefix = user.getId() + "/";
            String key = prefix + "scheduled-" + LocalDateTime.now().format(TS) + ".zip";
            try {
                byte[] zip = fullBackupService.buildZipBytes(user);
                s3BackupService.uploadObject(key, zip, "application/zip");
                log.info("S3 scheduled backup: {} ({} bytes)", key, zip.length);
                s3BackupService.removeOlderThan(prefix, props.getRetentionDays());
            } catch (Exception e) {
                log.error("S3 scheduled backup failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
    }
}
