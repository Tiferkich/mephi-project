package by.sakhdanil.managmentserver.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "group_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(GroupMember.GroupMemberId.class)
public class GroupMember {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupMemberId implements Serializable {
        private String group;
        private String user;
    }

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private VaultGroup group;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String role; // "ADMIN" | "MEMBER"

    @Column(nullable = false)
    private String status; // "PENDING" | "ACTIVE"

    /** "READ" — read-only access; "WRITE" — can create/update/delete entries. */
    @Column(nullable = false)
    private String permission = "WRITE"; // "READ" | "WRITE"

    /** AES-GCM(ECDH_shared, groupKey) stored as JSON base64 {ct, nonce}.
     *  Null while status=PENDING (admin has not yet delivered the wrapped key). */
    @Column(columnDefinition = "TEXT")
    private String encryptedGroupKey;

    /** X25519 public key of the admin who wrapped encryptedGroupKey.
     *  The member needs it to reproduce the same ECDH shared secret. */
    @Column(columnDefinition = "TEXT")
    private String adminPubKey;

    private Instant joinedAt;
}
