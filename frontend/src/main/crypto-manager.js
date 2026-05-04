const crypto = require('crypto');

class CryptoManager {
  constructor() {
    this.masterKey = null;
    this.isUnlocked = false;
    this.algorithm = 'aes-256-cbc';
  }

  // Безопасное хранение мастер-ключа ТОЛЬКО в main процессе
  async setMasterPassword(password, salt) {
    try {
      // Деривация ключа в main процессе
      this.masterKey = await this.deriveKey(password, salt);
      this.isUnlocked = true;
      
      // Очищаем пароль из памяти
      password = null;
      
      console.log('✅ Master key set successfully in main process');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to set master password:', error);
      return { success: false, error: error.message };
    }
  }

  // Шифрование происходит ТОЛЬКО в main процессе
  async encryptData(data) {
    if (!this.isUnlocked || !this.masterKey) {
      throw new Error('Vault is locked');
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      console.log('✅ Data encrypted successfully in main process');
      return {
        data: encrypted,
        iv: iv.toString('hex'),
        version: 2 // Маркер новой версии
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Расшифровка происходит ТОЛЬКО в main процессе
  async decryptData(encryptedData) {
    if (!this.isUnlocked || !this.masterKey) {
      throw new Error('Vault is locked');
    }

    try {
      // Проверяем формат данных (новый или старый)
      if (encryptedData.version === 2 && encryptedData.iv) {
        // Новый формат с IV
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const result = JSON.parse(decrypted);
        console.log('✅ Data decrypted successfully (new format)');
        return result;
      } else if (typeof encryptedData === 'string' || (!encryptedData.version && !encryptedData.iv)) {
        // Старый формат без IV (legacy support)
        console.log('🔄 Attempting to decrypt legacy data format');
        
        // Пробуем старый метод для обратной совместимости
        try {
          const dataString = typeof encryptedData === 'string' ? encryptedData : encryptedData.data;
          
          // Используем старые методы для старых данных
          const crypto = require('crypto');
          const decipher = crypto.createDecipher('aes-256-cbc', this.masterKey);
          
          let decrypted = decipher.update(dataString, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          const result = JSON.parse(decrypted);
          console.log('✅ Legacy data decrypted successfully');
          return result;
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

  // Безопасная блокировка - полная очистка памяти
  lock() {
    this.masterKey = null;
    this.isUnlocked = false;
    
    console.log('🔒 Vault locked, keys cleared from memory');
    
    // Принудительная сборка мусора
    if (global.gc) {
      global.gc();
    }
  }

  // Проверка статуса разблокировки
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
   * Формат буфера:
   *   VAULTBKP\x01  — 9 байт magic (8 ASCII + версия 0x01)
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
    return Buffer.concat([
      magic,
      Buffer.from([16]), salt,
      Buffer.from([16]), iv,
      enc
    ]);
  }

  /**
   * Дешифрует буфер созданный encryptBackup.
   * @returns {string} JSON-строка
   */
  async decryptBackup(password, buffer) {
    if (!Buffer.isBuffer(buffer)) {
      buffer = Buffer.from(buffer);
    }
    const MAGIC = 'VAULTBKP\x01';
    const magicBuf = buffer.slice(0, 9);
    if (magicBuf.toString('binary') !== MAGIC) {
      throw new Error('Invalid backup file: wrong magic header');
    }
    let off = 9;
    const saltLen = buffer[off++];
    const salt = buffer.slice(off, off + saltLen);
    off += saltLen;
    const ivLen = buffer[off++];
    const iv = buffer.slice(off, off + ivLen);
    off += ivLen;
    const ciphertext = buffer.slice(off);
    const key = await this._deriveBackupKey(password, salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
  }

  _deriveBackupKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 200000, 32, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }
}

module.exports = CryptoManager; 