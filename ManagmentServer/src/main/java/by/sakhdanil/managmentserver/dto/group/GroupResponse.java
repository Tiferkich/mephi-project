package by.sakhdanil.managmentserver.dto.group;

import java.time.Instant;

/** Returned to the member: includes their encrypted copy of the group key. */
public record GroupResponse(
    String id,
    String name,
    String createdById,
    Instant createdAt,
    String role,
    String status,
    /** AES-GCM wrapped groupKey (JSON: {ct, nonce}, base64). Null until admin delivers it. */
    String encryptedGroupKey,
    /** X25519 public key of the admin who wrapped encryptedGroupKey. */
    String adminPubKey
) {}
