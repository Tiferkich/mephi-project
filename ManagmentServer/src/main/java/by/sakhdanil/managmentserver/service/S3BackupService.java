package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.config.BackupS3Properties;
import io.minio.GetObjectArgs;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.messages.Item;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
/**
 * Минимальные операции S3/MinIO для плановых снимков и list/download.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3BackupService {

    private final BackupS3Properties props;
    private final org.springframework.beans.factory.ObjectProvider<MinioClient> minioClientProvider;

    public boolean isAvailable() {
        return props.isEnabled() && minioClientProvider.getIfAvailable() != null
                && StringUtils.hasText(props.getBucket());
    }

    public void ensureBucket() throws Exception {
        MinioClient c = minioClientProvider.getObject();
        String bucket = props.getBucket();
        if (!c.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            c.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            log.info("Created S3/MinIO bucket: {}", bucket);
        }
    }

    public void uploadObject(String key, byte[] data, String contentType) throws Exception {
        if (!isAvailable()) {
            throw new IllegalStateException("S3 backup is not available");
        }
        ensureBucket();
        MinioClient c = minioClientProvider.getObject();
        c.putObject(
                PutObjectArgs.builder()
                        .bucket(props.getBucket())
                        .object(key)
                        .stream(new ByteArrayInputStream(data), data.length, -1)
                        .contentType(contentType != null ? contentType : "application/zip")
                        .build());
    }

    public List<S3ObjectInfo> listPrefix(String prefix) {
        if (!isAvailable()) {
            return List.of();
        }
        try {
            MinioClient c = minioClientProvider.getObject();
            List<S3ObjectInfo> out = new ArrayList<>();
            for (Result<Item> r : c.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(props.getBucket())
                            .prefix(prefix)
                            .recursive(true)
                            .build())) {
                Item item = r.get();
                if (item.isDir()) {
                    continue;
                }
                Instant at = null;
                if (item.lastModified() != null) {
                    at = item.lastModified().toInstant();
                }
                out.add(
                        S3ObjectInfo.builder()
                                .key(item.objectName())
                                .size(item.size() >= 0 ? item.size() : 0L)
                                .lastModified(at)
                                .build());
            }
            return out;
        } catch (Exception e) {
            log.error("S3 list failed: {}", e.getMessage());
            return List.of();
        }
    }

    public byte[] getObject(String key) throws Exception {
        MinioClient c = minioClientProvider.getObject();
        try (InputStream in =
                c.getObject(
                        GetObjectArgs.builder()
                                .bucket(props.getBucket())
                                .object(key)
                                .build())) {
            return in.readAllBytes();
        }
    }

    /**
     * Удаляет объекты в префиксе старше, чем retention.
     */
    public void removeOlderThan(String userPrefix, int retentionDays) {
        if (!isAvailable() || retentionDays < 0) {
            return;
        }
        Instant threshold = Instant.now().minusSeconds((long) retentionDays * 86400L);
        try {
            MinioClient c = minioClientProvider.getObject();
            for (S3ObjectInfo o : listPrefix(userPrefix)) {
                if (o.getLastModified() == null) {
                    continue;
                }
                if (o.getLastModified().isBefore(threshold)) {
                    c.removeObject(
                            RemoveObjectArgs.builder()
                                    .bucket(props.getBucket())
                                    .object(o.getKey())
                                    .build());
                    log.info("S3: removed old backup: {}", o.getKey());
                }
            }
        } catch (Exception e) {
            log.warn("S3 cleanup failed: {}", e.getMessage());
        }
    }

    @Data
    @Builder
    public static class S3ObjectInfo {
        private String key;
        private long size;
        private Instant lastModified;
    }
}
