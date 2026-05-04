/**
 * backupService.js — создание и восстановление локального vault-файла.
 *
 * createBackup(masterPassword, filename)
 *   1. GET /local-backup/export (с JWT) — полный снимок
 *   2. IPC backup:create — шифрует + dialog.showSaveDialog (defaultPath = filename)
 *
 * restoreFromBackup(masterPassword)
 *   1. IPC backup:import — dialog.showOpenDialog + расшифровка → JSON
 *   2. POST /local-backup/import — создаёт пользователя, возвращает AuthResponse
 */

import * as securityService from './securityService';

const LOCAL_API =
  window.electronAPI?.localServerUrl ||
  process.env.REACT_APP_LOCAL_SERVER_URL ||
  'http://localhost:3001';

function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Создаёт зашифрованный *.vault файл на диске пользователя.
 * @param {string} masterPassword — plaintext мастер-пароль (только в памяти renderer на время вызова)
 * @param {string} [filename] — имя файла по умолчанию в диалоге (например vault-backup-2026-04-26.vault)
 * @returns {{ success: boolean, filePath?: string, filename?: string, canceled?: boolean, error?: string }}
 */
export async function createBackup(masterPassword, filename) {
  if (!window.electronAPI?.backup) {
    throw new Error('Backup API not available (not running in Electron)');
  }
  // 1. Получаем полный дамп с локального сервера
  const resp = await fetch(`${LOCAL_API}/local-backup/export`, {
    headers: { ...getAuthHeader() }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Export failed (${resp.status}): ${text}`);
  }
  const jsonData = await resp.json();
  try {
    const widgetsRaw = localStorage.getItem('widgets_config');
    if (widgetsRaw) {
      jsonData.widgets = JSON.parse(widgetsRaw);
    }
  } catch (e) {
    console.warn('[BackupService] cannot include widgets in backup:', e);
  }
  const jsonString = JSON.stringify(jsonData);

  // 2. Шифруем и сохраняем через main process
  const result = await window.electronAPI.backup.create(masterPassword, jsonString, filename);
  return result;
}

/**
 * Восстанавливает vault из *.vault файла.
 * @param {string} masterPassword — plaintext мастер-пароль из файла
 * @returns {AuthResponse} — токен + username
 */
export async function restoreFromBackup(masterPassword) {
  if (!window.electronAPI?.backup) {
    throw new Error('Backup API not available (not running in Electron)');
  }
  // 1. Расшифровываем через main process
  const result = await window.electronAPI.backup.import(masterPassword);
  if (!result.success) {
    if (result.canceled) {
      return null;
    }
    throw new Error(result.error || 'Decryption failed');
  }

  // 2. Получаем securityCheckId (политика безопасности устройства)
  let securityCheckId = null;
  try {
    const check = await securityService.runFullCheck();
    securityService.storeCheckResult(check);
    if (check.allowed === false) {
      const e = new Error(check.denyReason || 'Устройство не соответствует политике безопасности');
      e.code = 'ANTIVIRUS_DISABLED';
      throw e;
    }
    securityCheckId = check.checkId;
  } catch (err) {
    if (err.code === 'ANTIVIRUS_DISABLED') throw err;
    // Если security check недоступен — продолжаем без него
    console.warn('[BackupService] security check unavailable:', err.message);
  }

  // 3. Парсим JSON и добавляем securityCheckId
  let backupData;
  try {
    backupData = JSON.parse(result.json);
  } catch {
    throw new Error('Decrypted backup is not valid JSON');
  }
  backupData.securityCheckId = securityCheckId;

  // 4. Постим на локальный сервер
  const importResp = await fetch(`${LOCAL_API}/local-backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  });
  if (!importResp.ok) {
    const text = await importResp.text();
    throw new Error(`Import failed (${importResp.status}): ${text}`);
  }
  const authData = await importResp.json();
  if (authData.token) {
    localStorage.setItem('authToken', authData.token);
  }
  if (Array.isArray(backupData.widgets) && backupData.widgets.length > 0) {
    try {
      localStorage.setItem('widgets_config', JSON.stringify(backupData.widgets));
    } catch (e) {
      console.warn('[BackupService] cannot restore widgets:', e);
    }
  }
  // Return the master password so the caller can immediately unlock the vault
  // (the same password decrypts the .vault file AND derives the vault crypto key)
  return { ...authData, restoredMasterPassword: masterPassword };
}
