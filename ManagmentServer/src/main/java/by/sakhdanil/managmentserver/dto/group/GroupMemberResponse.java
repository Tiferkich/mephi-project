package by.sakhdanil.managmentserver.dto.group;

import java.time.Instant;

public record GroupMemberResponse(
    String userId,
    String username,
    String email,
    /** X25519 public key of this member (base64). Present after the member published it. */
    String publicKey,
    String role,
    String status,
    /** "READ" or "WRITE" — set by the group admin. */
    String permission,
    Instant joinedAt
) {}
