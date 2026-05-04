package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.entity.FileEntry;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.FileEntryRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Полный снимок (пароли, заметки, файлы BYTEA, профиль) для S3/zip/json.
 */
@Service
@RequiredArgsConstructor
public class FullBackupService {

    private final PasswordEntryService passwordEntryService;
    private final SecureNoteService secureNoteService;
    private final FileEntryRepository fileEntryRepository;
    private final ObjectMapper objectMapper = createMapper();

    private static ObjectMapper createMapper() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        m.findAndRegisterModules();
        return m;
    }

    public ObjectMapper getObjectMapper() {
        return objectMapper;
    }

    public Map<String, Object> userToMap(User user) {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("username", user.getUsername());
        u.put("email", user.getEmail());
        u.put("salt", user.getSalt());
        u.put("passwordHash", user.getPasswordHash());
        u.put("emailVerified", user.isEmailVerified());
        return u;
    }

    private Map<String, Object> toFileMap(FileEntry f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("userId", f.getUserId());
        m.put("encryptedName", f.getEncryptedName());
        m.put("encryptedMimeType", f.getEncryptedMimeType());
        m.put("originalSize", f.getOriginalSize());
        m.put("encryptedSize", f.getEncryptedSize());
        m.put("checksum", f.getChecksum());
        m.put("scanStatus", f.getScanStatus() != null ? f.getScanStatus().name() : "PENDING");
        m.put("threatsFound", f.getThreatsFound());
        m.put("scannedAt", f.getScannedAt() != null ? f.getScannedAt().toString() : null);
        m.put("scanResult", f.getScanResult());
        m.put("virusTotalAnalysisId", f.getVirusTotalAnalysisId());
        m.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);
        m.put("updatedAt", f.getUpdatedAt() != null ? f.getUpdatedAt().toString() : null);
        m.put("encryptedDataBase64", java.util.Base64.getEncoder().encodeToString(f.getEncryptedData()));
        return m;
    }

    public Map<String, Object> toPlainMap(User user) {
        try {
            List<Object> pws = objectMapper.readValue(
                    objectMapper.writeValueAsString(passwordEntryService.getAllPasswords(user)),
                    new TypeReference<>() {
                    });
            List<Object> ns = objectMapper.readValue(
                    objectMapper.writeValueAsString(secureNoteService.getAllNotes(user)),
                    new TypeReference<>() {
                    });
            List<Map<String, Object>> fileMaps = fileEntryRepository
                    .findByUserIdOrderByCreatedAtDesc(user.getId())
                    .stream()
                    .map(this::toFileMap)
                    .toList();
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("version", 2);
            root.put("exportedAt", Instant.now().toString());
            root.put("user", userToMap(user));
            root.put("passwords", pws);
            root.put("notes", ns);
            root.put("files", fileMaps);
            return root;
        } catch (Exception e) {
            throw new RuntimeException("Failed to build backup map: " + e.getMessage(), e);
        }
    }

    public byte[] buildZipBytes(User user) throws IOException {
        Map<String, Object> data = toPlainMap(user);
        String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
            zos.putNextEntry(new ZipEntry("backup.json"));
            zos.write(json.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
            zos.finish();
            return baos.toByteArray();
        }
    }
}
