const crypto = require('crypto');

class CryptoManager {
  constructor() {
    this.masterKey = null;
    this.isUnlocked = false;
  }

  async setMasterPassword(password, salt) {
    try {
      this.masterKey = await this.deriveKey(password, salt);
      this.isUnlocked = true;
      password = null;
      console.log('✅ Master key set successfully in main process');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to set master password:', error);
      return { success: false, error: error.message };
    }
  }

  // Шифрование AES-256-GCM (version 3).
  // Формат: { data, iv, authTag, version: 3 }
  async encryptData(data) {
    if (!this.isUnlocked || !this.masterKey) {
      throw new Error('Vault is locked');
    }
    try {
      const iv = crypto.randomBytes(12); // 96-bit nonce — рекомендован для GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv, { authTagLength: 16 });
      const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
      const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const authTag = cipher.getAuthTag();

      console.log('✅ Data encrypted (AES-256-GCM) in main process');
      return {
        data:    encrypted.toString('hex'),
        iv:      iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: 3,
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Расшифровка: поддерживает version 3 (GCM), version 2 (CBC) и legacy.
  async decryptData(encryptedData) {
    if (!this.isUnlocked || !this.masterKey) {
      throw new Error('Vault is locked');
    }
    try {
      if (encryptedData.version === 3 && encryptedData.iv && encryptedData.authTag) {
        // Актуальный формат — AES-256-GCM
        const iv      = Buffer.from(encryptedData.iv,      'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv, { authTagLength: 16 });
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(encryptedData.data, 'hex')),
          decipher.final(),
        ]);
        console.log('✅ Data decrypted (AES-256-GCM)');
        return JSON.parse(decrypted.toString('utf8'));

      } else if (encryptedData.version === 2 && encryptedData.iv) {
        // Обратная совместимость — AES-256-CBC (version 2)
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('✅ Data decrypted (AES-256-CBC legacy v2)');
        return JSON.parse(decrypted);

      } else if (typeof encryptedData === 'string' || (!encryptedData.version && !encryptedData.iv)) {
        // Legacy — без IV (очень старые данные)
        console.log('🔄 Attempting to decrypt legacy data format');
        try {
          const dataString = typeof encryptedData === 'string' ? encryptedData : encryptedData.data;
          const decipher = crypto.createDecipher('aes-256-cbc', this.masterKey); // eslint-disable-line node/no-deprecated-api
          let decrypted = decipher.update(dataString, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          console.log('✅ Legacy data decrypted');
          return JSON.parse(decrypted);
        } catch (legacyError) {
          console.error('❌ Legacy decryption failed:', legacyError);
          throw new Error('Failed to decrypt legacy data format');
        }
      } else {
        throw new Error('Invalid encrypted data format');
      }
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  lock() {
    this.masterKey = null;
    this.isUnlocked = false;
    console.log('🔒 Vault locked, keys cleared from memory');
    if (global.gc) global.gc();
  }

  isVaultUnlocked() {
    return this.isUnlocked && this.masterKey !== null;
  }

  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
        if (err) {
          console.error('❌ Key derivation failed:', err);
          reject(err);
        } else {
          console.log('✅ Key derived successfully');
          resolve(derivedKey);
        }
      });
    });
  }

  /**
   * Шифрует JSON-строку бэкапа паролем (PBKDF2 200k + AES-256-CBC).
   * Бинарный формат намеренно оставлен CBC — смена сломает существующие .vault файлы.
   * Формат буфера:
   *   VAULTBKP\x01  — 9 байт magic
   *   saltLen (1)   — всегда 16
   *   salt    (16)
   *   ivLen   (1)   — всегда 16
   *   iv      (16)
   *   ciphertext    — остальное
   */
  async encryptBackup(password, jsonString) {
    const salt = crypto.randomBytes(16);
    const iv   = crypto.randomBytes(16);
    const key  = await this._deriveBackupKey(password, salt);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const data = Buffer.from(jsonString, 'utf8');
    const enc  = Buffer.concat([cipher.update(data), cipher.final()]);
    const magic = Buffer.from('VAULTBKP\x01');
    return Buffer.concat([magic, Buffer.from([16]), salt, Buffer.from([16]), iv, enc]);
  }

  async decryptBackup(password, buffer) {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    const MAGIC = 'VAULTBKP\x01';
    if (buffer.slice(0, 9).toString('binary') !== MAGIC) {
      throw new Error('Invalid backup file: wrong magic header');
    }
    let off = 9;
    const saltLen = buffer[off++];
    const salt = buffer.slice(off, off + saltLen); off += saltLen;
    const ivLen = buffer[off++];
    const iv = buffer.slice(off, off + ivLen); off += ivLen;
    const ciphertext = buffer.slice(off);
    const key = await this._deriveBackupKey(password, salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  _deriveBackupKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 200000, 32, 'sha256', (err, key) => {
        if (err) reject(err); else resolve(key);
      });
    });
  }
}

module.exports = CryptoManager;
