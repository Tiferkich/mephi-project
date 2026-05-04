package by.sakhdanil.managmentserver.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3-совместимое хранилище (MinIO) для плановых снимков vault на remote-сервере.
 */
@Data
@ConfigurationProperties(prefix = "backup.s3")
public class BackupS3Properties {
    private boolean enabled = false;
    private String endpoint = "http://127.0.0.1:9000";
    private String accessKey = "";
    private String secretKey = "";
    private String bucket = "vault-backups";
    /** Spring @Scheduled 6-field cron: sec min hour day month weekday */
    private String schedule = "0 0 3 * * *";
    private int retentionDays = 30;
    private String region = "us-east-1";
}
