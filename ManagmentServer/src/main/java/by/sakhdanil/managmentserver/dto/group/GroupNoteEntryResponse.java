package by.sakhdanil.managmentserver.dto.group;

import java.time.Instant;

public record GroupNoteEntryResponse(
    Long id,
    String groupId,
    String createdById,
    String encryptedTitle,
    String encryptedType,
    String encryptedData,
    Instant createdAt,
    Instant updatedAt
) {}
