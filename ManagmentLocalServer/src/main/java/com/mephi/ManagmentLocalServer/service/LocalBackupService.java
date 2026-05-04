package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.config.JwtService;
import com.mephi.ManagmentLocalServer.dto.auth.AuthResponse;
import com.mephi.ManagmentLocalServer.entity.FileEntry;
import com.mephi.ManagmentLocalServer.entity.PasswordEntry;
import com.mephi.ManagmentLocalServer.entity.SecureNote;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.FileEntryRepository;
import com.mephi.ManagmentLocalServer.repository.PasswordEntryRepository;
import com.mephi.ManagmentLocalServer.repository.SecureNoteRepository;
import com.mephi.ManagmentLocalServer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Полный экспорт/импорт всех сущностей для локального .vault файла.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocalBackupService {

    private final UserRepository userRepository;
    private final PasswordEntryRepository passwordEntryRepository;
    private final SecureNoteRepository secureNoteRepository;
    private final FileEntryRepository fileEntryRepository;
    private final DeviceSecurityService deviceSecurityService;
    private final JwtService jwtService;

    @Value("${file.storage.path:./data/files}")
    private String storagePath;

    public Map<String, Object> export(User user) throws IOException {
        Map<String, Object> userMap = new LinkedHashMap<>();
        userMap.put("id", user.getId());
        userMap.put("username", user.getUsername());
        userMap.put("salt", user.getSalt());
        userMap.put("passwordHash", user.getPasswordHash());

        List<Map<String, Object>> passwords = passwordEntryRepository.findByUser(user)
                .stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("encryptedTitle", p.getEncryptedTitle());
                    m.put("encryptedSite", p.getEncryptedSite());
                    m.put("encryptedLogin", p.getEncryptedLogin());
                    m.put("encryptedPassword", p.getEncryptedPassword());
                    m.put("encryptedType", p.getEncryptedType());
                    m.put("widgetId", p.getWidgetId());
                    m.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
                    m.put("updatedAt", p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null);
                    return m;
                }).toList();

        List<Map<String, Object>> notes = secureNoteRepository.findByUser(user)
                .stream()
                .map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("encryptedTitle", n.getEncryptedTitle());
                    m.put("encryptedType", n.getEncryptedType());
                    m.put("encryptedData", n.getEncryptedData());
                    m.put("widgetId", n.getWidgetId());
                    m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
                    m.put("updatedAt", n.getUpdatedAt() != null ? n.getUpdatedAt().toString() : null);
                    return m;
                }).toList();

        List<Map<String, Object>> files = fileEntryRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("encryptedName", f.getEncryptedName());
                    m.put("encryptedMimeType", f.getEncryptedMimeType());
                    m.put("originalSize", f.getOriginalSize());
                    m.put("encryptedSize", f.getEncryptedSize());
                    m.put("checksum", f.getChecksum());
                    m.put("widgetId", f.getWidgetId());
                    m.put("dataIv", f.getDataIv());
                    m.put("dataSalt", f.getDataSalt());
                    m.put("scanStatus", f.getScanStatus() != null ? f.getScanStatus().name() : "NOT_SCANNED");
                    m.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);
                    m.put("updatedAt", f.getUpdatedAt() != null ? f.getUpdatedAt().toString() : null);
                    // file bytes: read from disk if available
                    String encDataB64 = null;
                    if (StringUtils.hasText(f.getStoragePath())) {
                        Path p = Paths.get(storagePath, f.getStoragePath());
                        if (Files.exists(p)) {
                            try {
                                encDataB64 = Base64.getEncoder().encodeToString(Files.readAllBytes(p));
                            } catch (IOException e) {
                                log.warn("Cannot read file {} for backup: {}", p, e.getMessage());
                            }
                        }
                    }
                    m.put("encryptedDataBase64", encDataB64);
                    return m;
                }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("version", 1);
        result.put("exportedAt", Instant.now().toString());
        result.put("user", userMap);
        result.put("passwords", passwords);
        result.put("notes", notes);
        result.put("files", files);
        return result;
    }

    @Transactional
    public AuthResponse importBackup(Map<String, Object> body) throws IOException {
        if (body == null) {
            throw new IllegalArgumentException("empty body");
        }
        if (deviceSecurityService.isEnforce()) {
            String checkId = (String) body.get("securityCheckId");
            deviceSecurityService.requireRecentAllowedCheck(checkId);
        }

        if (userRepository.countSetupUsers() > 0) {
            throw new IllegalStateException("User already set up. Delete local account first.");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> userBlock = (Map<String, Object>) body.get("user");
        if (userBlock == null) {
            throw new IllegalArgumentException("missing user block");
        }
        String username = s(userBlock, "username");
        String salt = s(userBlock, "salt");
        String passwordHash = s(userBlock, "passwordHash");
        String originalId = s(userBlock, "id");
        if (!StringUtils.hasText(username) || !StringUtils.hasText(salt) || !StringUtils.hasText(passwordHash)) {
            throw new IllegalArgumentException("user block: username, salt, passwordHash required");
        }

        // CRITICAL: restore the original userId — it is used as the vault crypto salt
        // (userCryptoSalt = userId in the frontend). Generating a new UUID would break
        // all AES decryption of passwords and notes after restore.
        User user = new User();
        user.setId(StringUtils.hasText(originalId) ? originalId : UUID.randomUUID().toString());
        user.setUsername(username);
        user.setSalt(salt);
        user.setPasswordHash(passwordHash);
        user.setSetup(true);
        user = userRepository.save(user);
        log.info("Restored user {} from backup", username);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> passwords = (List<Map<String, Object>>) body.getOrDefault("passwords", List.of());
        for (Map<String, Object> p : passwords) {
            PasswordEntry e = new PasswordEntry();
            e.setUser(user);
            e.setEncryptedTitle(s(p, "encryptedTitle"));
            e.setEncryptedSite(s(p, "encryptedSite"));
            e.setEncryptedLogin(s(p, "encryptedLogin"));
            e.setEncryptedPassword(s(p, "encryptedPassword"));
            e.setEncryptedType(s(p, "encryptedType"));
            e.setWidgetId(s(p, "widgetId"));
            passwordEntryRepository.save(e);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> notes = (List<Map<String, Object>>) body.getOrDefault("notes", List.of());
        for (Map<String, Object> n : notes) {
            SecureNote e = new SecureNote();
            e.setUser(user);
            e.setEncryptedTitle(s(n, "encryptedTitle"));
            e.setEncryptedType(s(n, "encryptedType"));
            e.setEncryptedData(s(n, "encryptedData"));
            e.setWidgetId(s(n, "widgetId"));
            secureNoteRepository.save(e);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> files = (List<Map<String, Object>>) body.getOrDefault("files", List.of());
        Path filesDir = Paths.get(storagePath);
        if (!Files.exists(filesDir)) {
            Files.createDirectories(filesDir);
        }
        for (Map<String, Object> f : files) {
            String encB64 = s(f, "encryptedDataBase64");
            String filename = null;
            if (StringUtils.hasText(encB64)) {
                byte[] encBytes = Base64.getDecoder().decode(encB64);
                filename = UUID.randomUUID() + ".enc";
                Files.write(filesDir.resolve(filename), encBytes);
            }
            FileEntry.ScanStatus st;
            try {
                st = FileEntry.ScanStatus.valueOf(s(f, "scanStatus"));
            } catch (Exception ex) {
                st = FileEntry.ScanStatus.NOT_SCANNED;
            }
            FileEntry fe = FileEntry.builder()
                    .userId(user.getId())
                    .encryptedName(s(f, "encryptedName"))
                    .encryptedMimeType(s(f, "encryptedMimeType"))
                    .storagePath(filename)
                    .originalSize(l(f, "originalSize"))
                    .encryptedSize(l(f, "encryptedSize"))
                    .checksum(s(f, "checksum"))
                    .widgetId(s(f, "widgetId"))
                    .dataIv(s(f, "dataIv"))
                    .dataSalt(s(f, "dataSalt"))
                    .scanStatus(st)
                    .threatsFound(0)
                    .build();
            fileEntryRepository.save(fe);
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, username, true, user.getId());
    }

    private static String s(Map<String, Object> m, String key) {
        if (m == null) return null;
        Object v = m.get(key);
        if (v == null || "null".equals(String.valueOf(v))) return null;
        String s = String.valueOf(v);
        return s.isBlank() ? null : s;
    }

    private static long l(Map<String, Object> m, String k) {
        Object o = m == null ? null : m.get(k);
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(o));
        } catch (Exception e) {
            return 0L;
        }
    }
}
