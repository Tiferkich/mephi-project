-- V10: Group Vault tables + public keys for E2E key exchange

-- X25519 public key for each user (base64-encoded, 32 bytes)
-- Used by group admins to encrypt the group key for new members via ECDH
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Groups
-- id: VARCHAR(36) to match users.id type (not UUID, because users.id is VARCHAR(36))
CREATE TABLE vault_groups (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        TEXT        NOT NULL,
    created_by  VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_groups_created_by ON vault_groups(created_by);

-- Group membership
-- encrypted_group_key : AES-GCM(ECDH_shared_secret, groupKey) — base64 JSON {ct, nonce}
-- admin_pub_key       : X25519 public key of the admin who wrapped the key (base64)
--                       needed by the member to reproduce the ECDH shared secret
-- status              : PENDING — invite accepted by server but key not yet delivered
--                       ACTIVE  — encrypted_group_key is available; member can decrypt
-- permission          : READ — can read entries only; WRITE — can also create/update/delete
CREATE TABLE group_members (
    group_id            VARCHAR(36) NOT NULL REFERENCES vault_groups(id) ON DELETE CASCADE,
    user_id             VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                TEXT        NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
    status              TEXT        NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'ACTIVE')),
    permission          TEXT        NOT NULL DEFAULT 'WRITE'
                                    CHECK (permission IN ('READ', 'WRITE')),
    encrypted_group_key TEXT,
    admin_pub_key       TEXT,
    joined_at           TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Group password entries (encrypted with groupKey, same format as personal vault)
CREATE TABLE group_password_entries (
    id                  BIGSERIAL   PRIMARY KEY,
    group_id            VARCHAR(36) NOT NULL REFERENCES vault_groups(id) ON DELETE CASCADE,
    created_by          VARCHAR(36) NOT NULL REFERENCES users(id),
    encrypted_title     TEXT,
    encrypted_site      TEXT,
    encrypted_login     TEXT,
    encrypted_password  TEXT,
    encrypted_type      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_password_entries_group ON group_password_entries(group_id);

-- Group note entries
CREATE TABLE group_note_entries (
    id              BIGSERIAL   PRIMARY KEY,
    group_id        VARCHAR(36) NOT NULL REFERENCES vault_groups(id) ON DELETE CASCADE,
    created_by      VARCHAR(36) NOT NULL REFERENCES users(id),
    encrypted_title TEXT,
    encrypted_type  TEXT,
    encrypted_data  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_note_entries_group ON group_note_entries(group_id);
