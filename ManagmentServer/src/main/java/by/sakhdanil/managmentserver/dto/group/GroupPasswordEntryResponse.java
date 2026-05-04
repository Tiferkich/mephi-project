package by.sakhdanil.managmentserver.dto.group;

import java.time.Instant;

public record GroupPasswordEntryResponse(
    Long id,
    String groupId,
    String createdById,
    String encryptedTitle,
    String encryptedSite,
    String encryptedLogin,
    String encryptedPassword,
    String encryptedType,
    Instant createdAt,
    Instant updatedAt
) {}
