/**
 * Group Vault Service
 *
 * Все API-вызовы идут через local-server remote-proxy → ManagmentServer.
 * Шифрование/дешифрование выполняется клиентом через Electron IPC (groupKey).
 */

const LOCAL_SERVER_URL =
  window.electronAPI?.localServerUrl ||
  process.env.REACT_APP_LOCAL_SERVER_URL ||
  'http://localhost:3001';
const REMOTE_PROXY_URL = `${LOCAL_SERVER_URL}/remote-proxy`;

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  const remoteToken = localStorage.getItem('remoteToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(remoteToken ? { 'X-Remote-Token': remoteToken } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

// ─────────────────────────── public key ──────────────────────────────────────

/**
 * Publish the user's X25519 public key so other members can perform ECDH.
 * Called automatically after vault unlock.
 */
export async function publishPublicKey(pubKeyBase64) {
  const res = await fetch(`${REMOTE_PROXY_URL}/auth/public-key`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ publicKey: pubKeyBase64 }),
  });
  return handleResponse(res);
}

// ─────────────────────────────── groups ──────────────────────────────────────

/** List all groups the current user is a member of. */
export async function getMyGroups() {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/** Create a new group. Returns { id, name, ... } */
export async function createGroup(name) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

/**
 * After creating the group, upload the admin's own wrapped group key.
 * @param {string} groupId
 * @param {string} encryptedGroupKey — AES-GCM(ECDH_self, groupKey) JSON payload
 * @param {string} adminPubKey — admin's X25519 pubKey (base64)
 */
export async function initGroupKey(groupId, encryptedGroupKey, adminPubKey) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/init`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ encryptedGroupKey, adminPubKey }),
  });
  return handleResponse(res);
}

// ─────────────────────────────── invites ─────────────────────────────────────

/** Admin invites a user by email. Creates PENDING membership on server. */
export async function inviteByEmail(groupId, email) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/invites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

// ─────────────────────────────── members ─────────────────────────────────────

/** Get all members of a group. */
export async function getMembers(groupId) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/members`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/** Get PENDING members (admin delivers key to them). */
export async function getPendingMembers(groupId) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/members/pending`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Deliver the encrypted group key to a pending member → ACTIVE.
 * @param {string} groupId
 * @param {string} userId  — target member userId
 * @param {string} encryptedGroupKey — wrapped with ECDH(adminPriv, memberPub)
 * @param {string} adminPubKey — admin's pubKey so member can reproduce ECDH shared secret
 */
export async function deliverKeyToMember(groupId, userId, encryptedGroupKey, adminPubKey) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ encryptedGroupKey, adminPubKey }),
  });
  return handleResponse(res);
}

/**
 * Set permission for a member: "READ" or "WRITE".
 */
export async function setMemberPermission(groupId, userId, permission) {
  const res = await fetch(
    `${REMOTE_PROXY_URL}/api/groups/${groupId}/members/${userId}/permission`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permission }),
    },
  );
  return handleResponse(res);
}

/** Remove a member from the group (admin only). */
export async function removeMember(groupId, userId) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ─────────────────────────────── entries ─────────────────────────────────────

/** Get all password entries for a group (server-side encrypted with groupKey). */
export async function getGroupPasswords(groupId) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/passwords`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Create a password entry.
 * All fields must already be encrypted with groupKey before calling.
 */
export async function createGroupPassword(groupId, encryptedData) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/passwords`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(encryptedData),
  });
  return handleResponse(res);
}

/** Update a password entry (all fields pre-encrypted). */
export async function updateGroupPassword(groupId, entryId, encryptedData) {
  const res = await fetch(
    `${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/passwords/${entryId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(encryptedData),
    },
  );
  return handleResponse(res);
}

/** Delete a password entry. */
export async function deleteGroupPassword(groupId, entryId) {
  const res = await fetch(
    `${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/passwords/${entryId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(res);
}

/** Get all notes for a group. */
export async function getGroupNotes(groupId) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/notes`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/** Create a note entry (all fields pre-encrypted). */
export async function createGroupNote(groupId, encryptedData) {
  const res = await fetch(`${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(encryptedData),
  });
  return handleResponse(res);
}

/** Update a note entry. */
export async function updateGroupNote(groupId, entryId, encryptedData) {
  const res = await fetch(
    `${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/notes/${entryId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(encryptedData),
    },
  );
  return handleResponse(res);
}

/** Delete a note entry. */
export async function deleteGroupNote(groupId, entryId) {
  const res = await fetch(
    `${REMOTE_PROXY_URL}/api/groups/${groupId}/entries/notes/${entryId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(res);
}

// ─────────────────────── high-level helper: process pending invites ───────────

/**
 * Called by the admin at startup (vault unlocked).
 * Finds all PENDING members of all admin groups and delivers the group key to them.
 *
 * @param {string} privKeyBase64  — admin's X25519 private key (raw 32 bytes, base64)
 * @param {string} pubKeyBase64   — admin's X25519 public key (raw 32 bytes, base64)
 * @param {Array}  myGroups       — result of getMyGroups() (to avoid extra fetch)
 * @param {Function} unwrapMyKey  — async (group) => groupKeyBase64
 *        Should call ecdhUnwrapKey with admin's own wrapped key.
 */
export async function deliverPendingKeys(privKeyBase64, pubKeyBase64, myGroups, unwrapMyKey) {
  const adminGroups = myGroups.filter(g => g.role === 'ADMIN' && g.status === 'ACTIVE');

  for (const group of adminGroups) {
    try {
      const pending = await getPendingMembers(group.id);
      if (!pending || pending.length === 0) continue;

      // Decrypt the group key once per group
      const groupKeyBase64 = await unwrapMyKey(group);

      for (const member of pending) {
        if (!member.publicKey) continue; // member hasn't published their key yet
        try {
          const wrapped = await window.electronAPI.crypto.ecdhWrapKey(
            privKeyBase64,
            member.publicKey,
            groupKeyBase64,
          );
          if (!wrapped.success) continue;
          await deliverKeyToMember(
            group.id,
            member.userId,
            JSON.stringify({ encryptedBase64: wrapped.encryptedBase64, nonceBase64: wrapped.nonceBase64 }),
            pubKeyBase64,
          );
        } catch (e) {
          console.warn(`[groupService] Failed to deliver key to ${member.userId}:`, e);
        }
      }
    } catch (e) {
      console.warn(`[groupService] Failed processing pending for group ${group.id}:`, e);
    }
  }
}
