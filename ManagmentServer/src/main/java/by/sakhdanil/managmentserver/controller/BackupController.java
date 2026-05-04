package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.FullBackupService;
import by.sakhdanil.managmentserver.service.RemoteBackupImportService;
import by.sakhdanil.managmentserver.service.S3BackupService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Full backup/restore: JSON или ZIP (с backup.json) + S3-список/скачивание (MinIO).
 */
@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Tag(name = "Backup", description = "Резервные копии (полный снимок vault) и S3/MinIO")
@SecurityRequirement(name = "Bearer Authentication")
public class BackupController {

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd-HH-mm");

    private final FullBackupService fullBackupService;
    private final RemoteBackupImportService remoteBackupImportService;
    private final S3BackupService s3BackupService;
    private final ObjectMapper objectMapper;

    @GetMapping(value = "/export", produces = { MediaType.APPLICATION_JSON_VALUE, "application/zip" })
    @Operation(summary = "Экспорт: JSON (по умолчанию) или ZIP (format=zip)")
    public ResponseEntity<?> export(
            @AuthenticationPrincipal User user,
            @RequestParam(name = "format", defaultValue = "json") String format) {
        if ("zip".equalsIgnoreCase(format) || "application/zip".equalsIgnoreCase(format)) {
            try {
                byte[] zip = fullBackupService.buildZipBytes(user);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("application/zip"))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"vault-backup-" + user.getId() + ".zip\"")
                        .body(zip);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
            }
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(fullBackupService.toPlainMap(user));
    }

    @PostMapping(value = "/import", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Импорт из JSON-полнобэкапа (version: 2)")
    public ResponseEntity<Map<String, Object>> importFromJson(
            @AuthenticationPrincipal User user, @RequestBody Map<String, Object> body) {
        remoteBackupImportService.importFromMap(user, body);
        Map<String, Object> m = new HashMap<>();
        m.put("ok", true);
        m.put("message", "Import completed");
        return ResponseEntity.ok(m);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Импорт из ZIP (внутри backup.json)")
    public ResponseEntity<Map<String, Object>> importFromZip(
            @AuthenticationPrincipal User user, @RequestPart("file") MultipartFile file) {
        try {
            Map<String, Object> data = readBackupJsonFromZip(file);
            remoteBackupImportService.importFromMap(user, data);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("ok", false, "message", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("ok", true, "message", "Import from zip completed"));
    }

    @PostMapping("/s3/trigger")
    @Operation(summary = "Немедленный снимок текущего пользователя в S3/MinIO")
    public ResponseEntity<?> triggerS3Backup(@AuthenticationPrincipal User user) {
        if (!s3BackupService.isAvailable()) {
            return ResponseEntity.ok(Map.of("ok", false, "message", "S3 backup is not configured on the server"));
        }
        try {
            String key = user.getId() + "/manual-" + LocalDateTime.now().format(TS) + ".zip";
            byte[] zip = fullBackupService.buildZipBytes(user);
            s3BackupService.uploadObject(key, zip, "application/zip");
            return ResponseEntity.ok(Map.of("ok", true, "key", key, "size", zip.length));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("ok", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/s3")
    @Operation(summary = "Список S3-объектов для текущего пользователя (префикс userId/)")
    public ResponseEntity<?> listS3Backups(@AuthenticationPrincipal User user) {
        if (!s3BackupService.isAvailable()) {
            return ResponseEntity.ok(Map.of("available", false, "objects", List.of()));
        }
        String prefix = user.getId() + "/";
        List<S3BackupService.S3ObjectInfo> list = s3BackupService.listPrefix(prefix);
        return ResponseEntity.ok(
                Map.of("available", true, "prefix", prefix, "objects", list));
    }

    @GetMapping("/s3/download")
    @Operation(summary = "Скачать бэкап по ключу (должен начинаться с userId/)")
    public ResponseEntity<byte[]> downloadS3(
            @AuthenticationPrincipal User user, @RequestParam("key") String key) {
        if (!s3BackupService.isAvailable() || !StringUtils.hasText(key)) {
            return ResponseEntity.notFound().build();
        }
        if (!key.startsWith(user.getId() + "/")) {
            return ResponseEntity.status(403).build();
        }
        try {
            byte[] data = s3BackupService.getObject(key);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"backup-s3-" + key.replace('/', '-') + ".zip\"")
                    .body(data);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private Map<String, Object> readBackupJsonFromZip(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("empty file");
        }
        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry e;
            while ((e = zis.getNextEntry()) != null) {
                if (!e.isDirectory() && (e.getName().equals("backup.json") || e.getName().endsWith("/backup.json"))) {
                    byte[] raw = zis.readAllBytes();
                    return objectMapper.readValue(raw, new TypeReference<>() {
                    });
                }
            }
        }
        throw new IllegalArgumentException("backup.json not found in zip");
    }
}
