package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.password.PasswordRequest;
import by.sakhdanil.managmentserver.entity.FileEntry;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.FileEntryRepository;
import by.sakhdanil.managmentserver.repository.PasswordEntryRepository;
import by.sakhdanil.managmentserver.repository.SecureNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Импорт full-backup (version 2) в текущую учётку: заменяет пароли/заметки/файлы.
 */
@Service
@RequiredArgsConstructor
public class RemoteBackupImportService {

    private final PasswordEntryRepository passwordEntryRepository;
    private final SecureNoteRepository secureNoteRepository;
    private final FileEntryRepository fileEntryRepository;
    private final PasswordEntryService passwordEntryService;
    private final SecureNoteService secureNoteService;

    @Transactional
    public void importFromMap(User user, Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            throw new IllegalArgumentException("backup body is required");
        }
        Object v = data.get("version");
        if (v == null || (v instanceof Number n && n.intValue() < 1)) {
            throw new IllegalArgumentException("invalid backup: missing version");
        }
        if (v instanceof Number n2 && n2.intValue() != 2) {
            throw new IllegalArgumentException("unsupported backup version: " + n2);
        }
        if (data.containsKey("user") && data.get("user") instanceof Map<?, ?> userBlock) {
            Object backupUserId = userBlock.get("id");
            if (backupUserId != null && !user.getId().equals(String.valueOf(backupUserId))) {
                throw new IllegalArgumentException("backup belongs to a different user id");
            }
        }
        // wipe current data
        fileEntryRepository.deleteAllByUserId(user.getId());
        passwordEntryRepository.deleteByUser(user);
        secureNoteRepository.deleteByUser(user);

        List<?> passwords = (List<?>) data.getOrDefault("passwords", List.of());
        for (Object p : passwords) {
            if (!(p instanceof Map<?, ?> raw)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> m = (Map<String, Object>) (Map<?, ?>) raw;
            PasswordRequest req = new PasswordRequest(
                    s(m, "encryptedTitle"),
                    s(m, "encryptedSite"),
                    s(m, "encryptedLogin"),
                    s(m, "encryptedPassword"),
                    s(m, "encryptedType"));
            passwordEntryService.createPassword(req, user);
        }
        List<?> notes = (List<?>) data.getOrDefault("notes", List.of());
        for (Object p : notes) {
            if (!(p instanceof Map<?, ?> raw)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> m = (Map<String, Object>) (Map<?, ?>) raw;
            NoteRequest req = new NoteRequest(s(m, "encryptedTitle"), s(m, "encryptedType"), s(m, "encryptedData"));
            secureNoteService.createNote(req, user);
        }
        List<?> files = (List<?>) data.getOrDefault("files", List.of());
        for (Object p : files) {
            if (!(p instanceof Map<?, ?> raw)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> m = (Map<String, Object>) (Map<?, ?>) raw;
            fileEntryRepository.save(fileFromMap(user.getId(), m));
        }
    }

    private static String s(Map<String, Object> m, String key) {
        Object o = m.get(key);
        return o != null ? String.valueOf(o) : "";
    }

    private static FileEntry fileFromMap(String userId, Map<String, Object> m) {
        byte[] enc = Base64.getDecoder().decode(s(m, "encryptedDataBase64"));
        FileEntry.ScanStatus st;
        try {
            st = FileEntry.ScanStatus.valueOf(s(m, "scanStatus"));
        } catch (Exception e) {
            st = FileEntry.ScanStatus.PENDING;
        }
        LocalDateTime created = parseTs(s(m, "createdAt"));
        LocalDateTime updated = parseTs(s(m, "updatedAt"));
        if (created == null) {
            created = LocalDateTime.now();
        }
        if (updated == null) {
            updated = created;
        }
        LocalDateTime scanned = parseTs(s(m, "scannedAt"));
        return FileEntry.builder()
                .userId(userId)
                .encryptedName(s(m, "encryptedName"))
                .encryptedMimeType(s(m, "encryptedMimeType"))
                .encryptedData(enc)
                .originalSize(l(m, "originalSize"))
                .encryptedSize(l(m, "encryptedSize"))
                .checksum(s(m, "checksum"))
                .scanStatus(st)
                .scanResult("null".equals(String.valueOf(m.get("scanResult"))) ? null : s(m, "scanResult"))
                .virusTotalAnalysisId(emptyToNull(s(m, "virusTotalAnalysisId")))
                .threatsFound(m.get("threatsFound") == null ? 0 : i(m, "threatsFound"))
                .scannedAt(scanned)
                .createdAt(created)
                .updatedAt(updated)
                .build();
    }

    private static String emptyToNull(String s) {
        if (!StringUtils.hasText(s) || "null".equals(s)) {
            return null;
        }
        return s;
    }

    private static long l(Map<String, Object> m, String k) {
        Object o = m.get(k);
        if (o == null) {
            return 0L;
        }
        if (o instanceof Number n) {
            return n.longValue();
        }
        return Long.parseLong(String.valueOf(o));
    }

    private static int i(Map<String, Object> m, String k) {
        Object o = m.get(k);
        if (o == null) {
            return 0;
        }
        if (o instanceof Number n) {
            return n.intValue();
        }
        return Integer.parseInt(String.valueOf(o));
    }

    private static LocalDateTime parseTs(String s) {
        if (!StringUtils.hasText(s) || "null".equals(s)) {
            return null;
        }
        try {
            return LocalDateTime.ofInstant(java.time.Instant.parse(s), ZoneId.of("UTC"));
        } catch (Exception a) {
            try {
                return LocalDateTime.parse(s);
            } catch (Exception b) {
                return null;
            }
        }
    }
}
