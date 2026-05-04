import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getMyGroups,
  createGroup,
  initGroupKey,
  inviteByEmail,
  getMembers,
  getPendingMembers,
  deliverKeyToMember,
  removeMember,
  setMemberPermission,
  getGroupPasswords,
  createGroupPassword,
  deleteGroupPassword,
  getGroupNotes,
  createGroupNote,
  deleteGroupNote,
  deliverPendingKeys,
  publishPublicKey,
} from '../services/groupService';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const btn = (extra = {}) => ({
  border: 'none',
  borderRadius: 'var(--border-radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  padding: '6px 14px',
  transition: 'all var(--transition-fast)',
  ...extra,
});

const card = {
  background: 'var(--bg-secondary)',
  borderRadius: 'var(--border-radius-lg)',
  border: '1px solid var(--border-color)',
  boxShadow: 'var(--shadow-md)',
  padding: 'var(--spacing-lg)',
  marginBottom: 'var(--spacing-md)',
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function MembersModal({ group, myRole, onClose, onDeliverKeys }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverStatus, setDeliverStatus] = useState(''); // '' | 'ok' | 'no-key'
  const [confirmRemove, setConfirmRemove] = useState(null); // userId | null
  const [error, setError] = useState('');

  useEffect(() => {
    getMembers(group.id).then(setMembers).catch(console.error);
  }, [group.id]);

  const refreshMembers = async () => {
    const updated = await getMembers(group.id);
    setMembers(updated);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setError('');
    try {
      await inviteByEmail(group.id, inviteEmail.trim());
      setInviteEmail('');
      await refreshMembers();
      // Сразу пробуем доставить ключ (если участник уже опубликовал pubkey)
      if (onDeliverKeys) {
        setDeliverLoading(true);
        try {
          const delivered = await onDeliverKeys();
          await refreshMembers();
          setDeliverStatus(delivered ? 'ok' : 'no-key');
          setTimeout(() => setDeliverStatus(''), 4000);
        } finally {
          setDeliverLoading(false);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleManualDeliver = async () => {
    if (!onDeliverKeys) return;
    setDeliverLoading(true);
    setDeliverStatus('');
    try {
      const delivered = await onDeliverKeys();
      await refreshMembers();
      setDeliverStatus(delivered ? 'ok' : 'no-key');
      setTimeout(() => setDeliverStatus(''), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeliverLoading(false);
    }
  };

  const handleRemove = (userId) => setConfirmRemove(userId);

  const confirmDoRemove = async () => {
    try {
      await removeMember(group.id, confirmRemove);
      setMembers(m => m.filter(x => x.userId !== confirmRemove));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmRemove(null);
    }
  };

  const handleTogglePermission = async (member) => {
    const next = member.permission === 'WRITE' ? 'READ' : 'WRITE';
    try {
      await setMemberPermission(group.id, member.userId, next);
      setMembers(m => m.map(x => x.userId === member.userId ? { ...x, permission: next } : x));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          ...card, minWidth: 420, maxWidth: 560, width: '90%',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            Участники · {group.name}
          </h3>
          <button onClick={onClose} style={btn({ background: 'none', color: 'var(--text-secondary)' })}>✕</button>
        </div>

        {error && (
          <div style={{ color: 'var(--color-danger)', marginBottom: 12, fontSize: 13 }}>{error}</div>
        )}

        {/* Invite */}
        {myRole === 'ADMIN' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email участника"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)', color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleInvite}
                disabled={inviteLoading || deliverLoading}
                style={btn({ background: 'var(--color-success)', color: '#fff' })}
              >
                {inviteLoading ? '...' : 'Пригласить'}
              </button>
            </div>

            {/* Deliver keys panel */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <i className='bx bx-key' style={{ color: '#818cf8', fontSize: 16 }} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
                Если участник уже открыл приложение — доставьте ему ключ группы
              </span>
              {deliverStatus === 'ok' && (
                <span style={{ fontSize: 12, color: 'var(--color-success)' }}>✓ Ключ доставлен</span>
              )}
              {deliverStatus === 'no-key' && (
                <span style={{ fontSize: 12, color: '#f59e0b' }}>Участник ещё не открыл приложение</span>
              )}
              <button
                onClick={handleManualDeliver}
                disabled={deliverLoading}
                style={btn({ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12 })}
              >
                {deliverLoading ? '...' : '🔑 Доставить ключи'}
              </button>
            </div>
          </>
        )}

        {/* Members list */}
        {members.map(m => (
          <div key={m.userId} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0', borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.username}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{m.email}</div>
            </div>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: m.role === 'ADMIN' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
              color: m.role === 'ADMIN' ? '#f59e0b' : '#818cf8',
            }}>
              {m.role}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: m.status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
              color: m.status === 'ACTIVE' ? 'var(--color-success)' : '#f59e0b',
            }}>
              {m.status === 'ACTIVE' ? '✓ ACTIVE' : '⏳ PENDING'}
            </span>
            {myRole === 'ADMIN' && m.role !== 'ADMIN' && (
              <>
                <button
                  onClick={() => handleTogglePermission(m)}
                  title={`Права: ${m.permission}. Нажмите чтобы переключить.`}
                  style={btn({
                    background: m.permission === 'WRITE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: m.permission === 'WRITE' ? 'var(--color-success)' : 'var(--color-danger)',
                    fontSize: 11, padding: '2px 8px',
                  })}
                >
                  {m.permission}
                </button>
                <button
                  onClick={() => handleRemove(m.userId)}
                  style={btn({ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', fontSize: 11, padding: '2px 8px' })}
                >
                  Исключить
                </button>
              </>
            )}
          </div>
        ))}

        {/* Confirm remove */}
        {confirmRemove && (
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid var(--color-danger)',
          }}>
            <p style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 14 }}>
              Исключить участника из группы?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmRemove(null)}
                style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' })}>
                Отмена
              </button>
              <button onClick={confirmDoRemove}
                style={btn({ background: 'var(--color-danger)', color: '#fff' })}>
                Исключить
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim());
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ ...card, width: 360 }}
      >
        <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Создать группу</h3>
        {error && <div style={{ color: 'var(--color-danger)', marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Название группы"
          style={{
            width: '100%', padding: '10px 12px', marginBottom: 16, boxSizing: 'border-box',
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)', color: 'var(--text-primary)',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' })}>
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            style={btn({ background: 'var(--color-success)', color: '#fff' })}
          >
            {loading ? '...' : 'Создать'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main GroupVaultPanel
// ──────────────────────────────────────────────────────────────────────────────

export default function GroupVaultPanel({ masterPassword, userId }) {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupKey, setGroupKey] = useState(null); // decrypted AES-256 key (base64) for active group

  const [passwords, setPasswords] = useState([]);
  const [notes, setNotes] = useState([]);
  const [decryptedPasswords, setDecryptedPasswords] = useState([]);
  const [decryptedNotes, setDecryptedNotes] = useState([]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState('');

  // ── Add-entry modals ───────────────────────────────────────────────────────
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ title: '', site: '', login: '', password: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', data: '' });
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Confirm modal ──────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  // ── Keypair derived from masterPassword + userId ──────────────────────────
  const [myPrivKey, setMyPrivKey] = useState(null);
  const [myPubKey, setMyPubKey] = useState(null);

  useEffect(() => {
    if (!masterPassword || !userId) return;
    (async () => {
      try {
        const kp = await window.electronAPI.crypto.deriveX25519Keypair(masterPassword, userId);
        if (kp.success) {
          setMyPrivKey(kp.privKeyBase64);
          setMyPubKey(kp.pubKeyBase64);
          // Публикуем pubkey при каждом открытии Groups-панели (fire-and-forget)
          publishPublicKey(kp.pubKeyBase64).catch(() => {});
        }
      } catch (e) {
        console.error('[GroupVaultPanel] keypair derivation failed:', e);
      }
    })();
  }, [masterPassword, userId]);

  // ── Load groups ────────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const list = await getMyGroups();
      setGroups(list || []);

      // Auto-deliver pending keys (admin role)
      if (myPrivKey && myPubKey && list?.length) {
        deliverPendingKeys(myPrivKey, myPubKey, list, async (group) => {
          return await unwrapGroupKey(group, myPrivKey);
        }).catch(console.warn);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGroups(false);
    }
  }, [myPrivKey, myPubKey]);

  useEffect(() => {
    if (myPrivKey) loadGroups();
  }, [myPrivKey, loadGroups]);

  // ── Decrypt group key via ECDH ─────────────────────────────────────────────
  async function unwrapGroupKey(group, privKey = myPrivKey) {
    console.log('[unwrapGroupKey] group.name:', group.name, 'status:', group.status);
    console.log('[unwrapGroupKey] encryptedGroupKey:', group.encryptedGroupKey);
    console.log('[unwrapGroupKey] adminPubKey:', group.adminPubKey);
    console.log('[unwrapGroupKey] privKey present:', !!privKey);
    if (!group.encryptedGroupKey || !group.adminPubKey || !privKey) {
      console.warn('[unwrapGroupKey] early return: missing fields');
      return null;
    }
    try {
      // encryptedGroupKey is stored as JSON: { encryptedBase64, nonceBase64 }
      const payload = JSON.parse(group.encryptedGroupKey);
      console.log('[unwrapGroupKey] payload keys:', Object.keys(payload));
      const result = await window.electronAPI.crypto.ecdhUnwrapKey(
        privKey,
        group.adminPubKey,
        payload.encryptedBase64,
        payload.nonceBase64,
      );
      console.log('[unwrapGroupKey] ecdhUnwrapKey result.success:', result.success, result.error || '');
      return result.success ? result.groupKeyBase64 : null;
    } catch (e) {
      console.error('[GroupVaultPanel] unwrap error:', e);
      return null;
    }
  }

  // ── Select active group ────────────────────────────────────────────────────
  const selectGroup = useCallback(async (group) => {
    setActiveGroup(group);
    setPasswords([]);
    setNotes([]);
    setDecryptedPasswords([]);
    setDecryptedNotes([]);
    setGroupKey(null);

    if (group.status !== 'ACTIVE') return;

    const gk = await unwrapGroupKey(group);
    console.log('[selectGroup] groupKey derived:', gk ? gk.substring(0, 10) + '...' : 'NULL');
    setGroupKey(gk);

    if (!gk) {
      console.error('[selectGroup] groupKey is null, cannot load entries');
      return;
    }
    setLoadingEntries(true);
    try {
      const [pwds, nts] = await Promise.all([
        getGroupPasswords(group.id),
        getGroupNotes(group.id),
      ]);
      console.log('[selectGroup] pwds count:', pwds?.length, 'nts count:', nts?.length);
      setPasswords(pwds || []);
      setNotes(nts || []);

      // Decrypt all entries
      const decPwds = await Promise.all((pwds || []).map(p => decryptPassword(p, gk)));
      const decNts  = await Promise.all((nts || []).map(n => decryptNote(n, gk)));
      setDecryptedPasswords(decPwds.filter(Boolean));
      setDecryptedNotes(decNts.filter(Boolean));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [myPrivKey]); 

  // ── Field-level decrypt/encrypt helpers ───────────────────────────────────
  async function decryptField(gk, encoded) {
    if (!encoded) return '';
    try {
      const { ciphertext, iv } = JSON.parse(encoded);
      const res = await window.electronAPI.crypto.decryptWithGroupKey(gk, ciphertext, iv);
      return res.success ? res.plaintext : '[decrypt error]';
    } catch { return '[decrypt error]'; }
  }

  async function encryptField(gk, plaintext) {
    const res = await window.electronAPI.crypto.encryptWithGroupKey(gk, plaintext || '');
    if (!res.success) throw new Error('Encryption failed');
    return JSON.stringify({ ciphertext: res.ciphertext, iv: res.iv });
  }

  async function decryptPassword(p, gk) {
    return {
      id: p.id,
      title:    await decryptField(gk, p.encryptedTitle),
      site:     await decryptField(gk, p.encryptedSite),
      login:    await decryptField(gk, p.encryptedLogin),
      password: await decryptField(gk, p.encryptedPassword),
      type:     await decryptField(gk, p.encryptedType),
    };
  }

  async function decryptNote(n, gk) {
    return {
      id: n.id,
      title: await decryptField(gk, n.encryptedTitle),
      type:  await decryptField(gk, n.encryptedType),
      data:  await decryptField(gk, n.encryptedData),
    };
  }

  // ── Create group ───────────────────────────────────────────────────────────
  const handleCreateGroup = async (name) => {
    if (!myPrivKey || !myPubKey) throw new Error('Keypair not ready');

    // 1. Create group on server
    const group = await createGroup(name);

    // 2. Generate random AES-256 group key
    const gkRes = await window.electronAPI.crypto.generateGroupKey();
    if (!gkRes.success) throw new Error('Failed to generate group key');
    const gk = gkRes.groupKeyBase64;

    // 3. Wrap group key with own ECDH (self-ECDH: admin encrypts for themselves)
    const wrapped = await window.electronAPI.crypto.ecdhWrapKey(myPrivKey, myPubKey, gk);
    if (!wrapped.success) throw new Error('Failed to wrap group key');

    const encryptedGroupKey = JSON.stringify({
      encryptedBase64: wrapped.encryptedBase64,
      nonceBase64: wrapped.nonceBase64,
    });

    // 4. Upload wrapped key + adminPubKey to server
    await initGroupKey(group.id, encryptedGroupKey, myPubKey);

    await loadGroups();
  };

  // ── My role in active group ────────────────────────────────────────────────
  const myRole = activeGroup?.role || null;
  const canWrite = myRole === 'ADMIN' || activeGroup?.permission === 'WRITE';

  // ── Add password entry ─────────────────────────────────────────────────────
  const handleAddPassword = () => {
    if (!groupKey || !activeGroup) return;
    setPwdForm({ title: '', site: '', login: '', password: '' });
    setShowAddPassword(true);
  };

  const handleSubmitPassword = async () => {
    if (!pwdForm.title.trim()) return;
    setPwdSaving(true);
    try {
      const encData = {
        encryptedTitle:    await encryptField(groupKey, pwdForm.title),
        encryptedSite:     await encryptField(groupKey, pwdForm.site),
        encryptedLogin:    await encryptField(groupKey, pwdForm.login),
        encryptedPassword: await encryptField(groupKey, pwdForm.password),
        encryptedType:     await encryptField(groupKey, 'password'),
      };
      await createGroupPassword(activeGroup.id, encData);
      setShowAddPassword(false);
      await selectGroup(activeGroup);
    } catch (e) {
      setError(e.message);
    } finally {
      setPwdSaving(false);
    }
  };

  const handleDeletePassword = (id) => {
    setConfirmModal({
      message: 'Удалить запись пароля?',
      onConfirm: async () => {
        await deleteGroupPassword(activeGroup.id, id);
        setDecryptedPasswords(p => p.filter(x => x.id !== id));
      },
    });
  };

  const handleAddNote = () => {
    if (!groupKey || !activeGroup) return;
    setNoteForm({ title: '', data: '' });
    setShowAddNote(true);
  };

  const handleSubmitNote = async () => {
    if (!noteForm.title.trim()) return;
    setNoteSaving(true);
    try {
      const encData = {
        encryptedTitle: await encryptField(groupKey, noteForm.title),
        encryptedType:  await encryptField(groupKey, 'note'),
        encryptedData:  await encryptField(groupKey, noteForm.data),
      };
      await createGroupNote(activeGroup.id, encData);
      setShowAddNote(false);
      await selectGroup(activeGroup);
    } catch (e) {
      setError(e.message);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = (id) => {
    setConfirmModal({
      message: 'Удалить заметку?',
      onConfirm: async () => {
        await deleteGroupNote(activeGroup.id, id);
        setDecryptedNotes(n => n.filter(x => x.id !== id));
      },
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  if (loadingGroups) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        Загрузка групп...
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-danger)',
          color: 'var(--color-danger)', borderRadius: 'var(--border-radius-md)',
          padding: '10px 16px', marginBottom: 16, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Group selector ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        {groups.map(g => {
          const isActive = activeGroup?.id === g.id;
          return (
            <button
              key={g.id}
              onClick={() => selectGroup(g)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                border: `1px solid ${isActive ? 'var(--color-success)' : 'var(--border-color)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive ? 600 : 'var(--font-weight-medium)',
                transition: 'all 0.18s ease',
                background: isActive ? 'rgba(34,197,94,0.12)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--color-success)' : 'var(--text-primary)',
                boxShadow: isActive ? '0 0 0 1px var(--color-success)' : 'none',
              }}
            >
              <i className={`bx ${g.role === 'ADMIN' ? 'bxs-crown' : 'bx-group'}`}
                style={{ fontSize: 14, color: g.role === 'ADMIN' ? '#f59e0b' : 'inherit' }} />
              {g.name}
              {g.status === 'PENDING' && (
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 10,
                  background: 'rgba(251,191,36,0.15)', color: '#f59e0b', fontWeight: 700,
                }}>
                  PENDING
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={() => setShowCreateGroup(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            border: '1.5px dashed var(--color-success)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            background: 'transparent',
            color: 'var(--color-success)',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <i className='bx bx-plus' style={{ fontSize: 15 }} />
          Создать группу
        </button>
      </div>

      {/* ── Active group content ── */}
      {activeGroup && (
        <motion.div key={activeGroup.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Group header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              <i className='bx bx-group' style={{ marginRight: 8, color: 'var(--color-success)' }} />
              {activeGroup.name}
            </h2>
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 10,
              background: activeGroup.role === 'ADMIN' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
              color: activeGroup.role === 'ADMIN' ? '#f59e0b' : '#818cf8',
            }}>
              {activeGroup.role}
            </span>
            {activeGroup.role === 'ADMIN' && (
              <button
                onClick={() => setShowMembers(true)}
                style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' })}
              >
                <i className='bx bx-group' style={{ marginRight: 4 }} /> Участники
              </button>
            )}
          </div>

          {activeGroup.status === 'PENDING' && (
            <div style={{
              background: 'rgba(251,191,36,0.1)', border: '1px solid #f59e0b',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <i className='bx bx-time' style={{ fontSize: 20, color: '#f59e0b', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                  Ожидание ключа от администратора
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  Попросите администратора открыть "Участники" и нажать "Доставить ключи".
                  После этого нажмите Обновить.
                </div>
              </div>
              <button
                onClick={async () => {
                  await loadGroups();
                  // После перезагрузки берём свежий объект группы и переселектим
                  const fresh = await getMyGroups();
                  const updated = fresh?.find(g => g.id === activeGroup.id);
                  if (updated) await selectGroup(updated);
                }}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 7,
                  border: '1px solid #f59e0b', background: 'transparent',
                  color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                ↻ Обновить
              </button>
            </div>
          )}

          {activeGroup.status === 'ACTIVE' && (
            <>
              {loadingEntries ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
                  Загрузка записей...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                  {/* Passwords */}
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        <i className='bx bx-key' style={{ marginRight: 6, color: 'var(--color-info)' }} />
                        Пароли ({decryptedPasswords.length})
                      </h3>
                      {canWrite && (
                        <button onClick={handleAddPassword} style={btn({ background: 'var(--color-success)', color: '#fff' })}>
                          + Добавить
                        </button>
                      )}
                    </div>
                    {decryptedPasswords.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Нет записей</p>
                    )}
                    {decryptedPasswords.map(p => (
                      <div key={p.id} style={{
                        padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.site} · {p.login}</div>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => handleDeletePassword(p.id)}
                            style={btn({ background: 'none', color: 'var(--color-danger)', padding: '4px 8px' })}
                          >
                            <i className='bx bx-trash' />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        <i className='bx bx-file' style={{ marginRight: 6, color: 'var(--color-warning)' }} />
                        Заметки ({decryptedNotes.length})
                      </h3>
                      {canWrite && (
                        <button onClick={handleAddNote} style={btn({ background: 'var(--color-warning)', color: '#fff' })}>
                          + Добавить
                        </button>
                      )}
                    </div>
                    {decryptedNotes.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Нет заметок</p>
                    )}
                    {decryptedNotes.map(n => (
                      <div key={n.id} style={{
                        padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {n.data?.substring(0, 80)}{n.data?.length > 80 ? '…' : ''}
                          </div>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            style={btn({ background: 'none', color: 'var(--color-danger)', padding: '4px 8px' })}
                          >
                            <i className='bx bx-trash' />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {!activeGroup && groups.length > 0 && (
        <div style={{
          textAlign: 'center', color: 'var(--text-secondary)',
          marginTop: 40, fontSize: 14, opacity: 0.7,
        }}>
          <i className='bx bx-arrow-back' style={{ display: 'block', fontSize: 28, marginBottom: 8, opacity: 0.5 }} />
          Выберите группу выше
        </div>
      )}

      {groups.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 0', gap: 12,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34,197,94,0.08)',
            border: '1.5px solid rgba(34,197,94,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className='bx bx-group' style={{ fontSize: 36, color: 'var(--color-success)', opacity: 0.7 }} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
            У вас ещё нет групп
          </p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            Создайте первую и пригласите участников
          </p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            key="create-group"
            onClose={() => setShowCreateGroup(false)}
            onCreate={handleCreateGroup}
          />
        )}
        {showMembers && activeGroup && (
          <MembersModal
            key="members"
            group={activeGroup}
            myRole={myRole}
            onClose={() => setShowMembers(false)}
            onDeliverKeys={async () => {
              // Перезагружаем группы → deliverPendingKeys внутри loadGroups
              await loadGroups();
              // Возвращаем true если у группы теперь нет PENDING участников
              const updated = await getMembers(activeGroup.id);
              const stillPending = updated.some(m => m.status === 'PENDING' && m.role !== 'ADMIN');
              return !stillPending;
            }}
          />
        )}

        {/* Add Password Modal */}
        {showAddPassword && (
          <div key="add-pwd" style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ ...card, minWidth: 380, maxWidth: 460, width: '90%' }}
            >
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>
                <i className='bx bx-key' style={{ marginRight: 8, color: 'var(--color-info)' }} />
                Новый пароль
              </h3>
              {[
                { label: 'Название *', key: 'title', type: 'text' },
                { label: 'Сайт', key: 'site', type: 'text' },
                { label: 'Логин', key: 'login', type: 'text' },
                { label: 'Пароль', key: 'password', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={pwdForm[key]}
                    onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && key === 'password' && handleSubmitPassword()}
                    autoFocus={key === 'title'}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 10px', borderRadius: 7,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)', color: 'var(--text-primary)',
                      fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowAddPassword(false)}
                  style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' })}>
                  Отмена
                </button>
                <button onClick={handleSubmitPassword}
                  disabled={pwdSaving || !pwdForm.title.trim()}
                  style={btn({ background: 'var(--color-success)', color: '#fff' })}>
                  {pwdSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Note Modal */}
        {showAddNote && (
          <div key="add-note" style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ ...card, minWidth: 380, maxWidth: 460, width: '90%' }}
            >
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>
                <i className='bx bx-file' style={{ marginRight: 8, color: 'var(--color-warning)' }} />
                Новая заметка
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Название *
                </label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 10px', borderRadius: 7,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Текст
                </label>
                <textarea
                  value={noteForm.data}
                  onChange={e => setNoteForm(f => ({ ...f, data: e.target.value }))}
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 10px', borderRadius: 7,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                    fontSize: 14, outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowAddNote(false)}
                  style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' })}>
                  Отмена
                </button>
                <button onClick={handleSubmitNote}
                  disabled={noteSaving || !noteForm.title.trim()}
                  style={btn({ background: 'var(--color-warning)', color: '#fff' })}>
                  {noteSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Confirm Modal */}
        {confirmModal && (
          <div key="confirm" style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ ...card, minWidth: 300, maxWidth: 380, width: '90%' }}
            >
              <p style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 15 }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmModal(null)}
                  style={btn({ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' })}>
                  Отмена
                </button>
                <button
                  onClick={async () => {
                    try { await confirmModal.onConfirm(); } catch (e) { setError(e.message); }
                    setConfirmModal(null);
                  }}
                  style={btn({ background: 'var(--color-danger)', color: '#fff' })}>
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
