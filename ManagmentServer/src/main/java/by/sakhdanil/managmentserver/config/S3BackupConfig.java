package by.sakhdanil.managmentserver.config;

import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO (S3 API) клиент для плановых снимков и list/download.
 */
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "backup.s3", name = "enabled", havingValue = "true")
public class S3BackupConfig {

    private final BackupS3Properties props;

    @Bean
    public MinioClient backupMinioClient() {
        if (props.getAccessKey() == null || props.getAccessKey().isBlank()
                || props.getSecretKey() == null || props.getSecretKey().isBlank()) {
            throw new IllegalStateException("backup.s3.access-key and backup.s3.secret-key are required when backup.s3.enabled=true");
        }
        return MinioClient.builder()
                .endpoint(props.getEndpoint())
                .credentials(props.getAccessKey(), props.getSecretKey())
                .region(props.getRegion() != null ? props.getRegion() : "us-east-1")
                .build();
    }
}
