// Криптографические утилиты для безопасности паролей
import CryptoJS from 'crypto-js';

/**
 * Генерирует криптографически стойкую соль
 * @param {number} length - длина соли в байтах (по умолчанию 32)
 * @returns {string} Base64 строка с солью
 */
export const generateSalt = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Вычисляет SHA-256 хеш от строки
 * @param {string} message - строка для хеширования
 * @returns {Promise<string>} hex строка с хешем
 */
export const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Создает master password hash для отправки на сервер
 * @param {string} masterPassword - мастер-пароль пользователя
 * @returns {Promise<string>} SHA-256 хеш мастер-пароля
 */
export const createMasterPasswordHash = async (masterPassword) => {
  return await sha256(masterPassword);
};

/**
 * Генерирует данные для регистрации пользователя
 * @param {string} username - имя пользователя
 * @param {string} masterPassword - мастер-пароль
 * @returns {Promise<Object>} объект с данными для регистрации
 */
export const generateUserRegistrationData = async (username, masterPassword) => {
  const salt = generateSalt();
  const masterPasswordHash = await createMasterPasswordHash(masterPassword);
  
  return {
    username,
    salt,
    masterPasswordHash
  };
};

/**
 * Получает ключ шифрования из мастер-пароля и соли
 * @param {string} masterPassword - мастер-пароль пользователя
 * @param {string} salt - соль пользователя
 * @returns {Promise<string>} ключ для шифрования данных
 */
export const deriveEncryptionKey = async (masterPassword, salt) => {
  // Создаем основной ключ из мастер-пароля
  const masterKey = await sha256(masterPassword + salt);
  
  // Создаем специальный ключ для шифрования данных
  const dataKey = await sha256(masterKey + salt + 'data-encryption');
  
  return dataKey;
};

/**
 * Шифрует данные с помощью AES-256-CBC
 * @param {string} plaintext - открытый текст для шифрования
 * @param {string} encryptionKey - ключ шифрования
 * @returns {string} зашифрованная строка в формате base64
 */
export const encryptData = (plaintext, encryptionKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(plaintext, encryptionKey, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Расшифровывает данные с помощью AES-256-CBC
 * @param {string} ciphertext - зашифрованная строка в формате base64
 * @param {string} encryptionKey - ключ расшифровки
 * @returns {string} расшифрованный текст
 */
export const decryptData = (ciphertext, encryptionKey) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, encryptionKey, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintext) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return plaintext;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - invalid key or corrupted data');
  }
};

/**
 * Шифрует объект с данными пароля
 * @param {Object} passwordData - объект с данными пароля
 * @param {string} encryptionKey - ключ шифрования
 * @returns {Object} объект с зашифрованными полями
 */
export const encryptPasswordData = (passwordData, encryptionKey) => {
  return {
    encryptedTitle: encryptData(passwordData.title || '', encryptionKey),
    encryptedSite: encryptData(passwordData.site || '', encryptionKey),
    encryptedLogin: encryptData(passwordData.login || '', encryptionKey),
    encryptedPassword: encryptData(passwordData.password || '', encryptionKey),
    encryptedType: encryptData(passwordData.type || 'Website', encryptionKey)
  };
};

/**
 * Расшифровывает объект с данными пароля
 * @param {Object} encryptedData - объект с зашифрованными данными
 * @param {string} encryptionKey - ключ расшифровки
 * @returns {Object} объект с расшифрованными полями
 */
export const decryptPasswordData = (encryptedData, encryptionKey) => {
  return {
    id: encryptedData.id,
    title: decryptData(encryptedData.encryptedTitle, encryptionKey),
    site: decryptData(encryptedData.encryptedSite, encryptionKey),
    login: decryptData(encryptedData.encryptedLogin, encryptionKey),
    password: decryptData(encryptedData.encryptedPassword, encryptionKey),
    type: decryptData(encryptedData.encryptedType, encryptionKey),
    createdAt: encryptedData.createdAt,
    updatedAt: encryptedData.updatedAt,
    lastSyncAt: encryptedData.lastSyncAt
  };
};

/**
 * Шифрует объект с данными заметки
 * @param {Object} noteData - объект с данными заметки
 * @param {string} encryptionKey - ключ шифрования
 * @returns {Object} объект с зашифрованными полями
 */
export const encryptNoteData = (noteData, encryptionKey) => {
  return {
    encryptedTitle: encryptData(noteData.title || '', encryptionKey),
    encryptedType: encryptData(noteData.type || 'Note', encryptionKey),
    encryptedData: encryptData(noteData.content || '', encryptionKey)
  };
};

/**
 * Расшифровывает объект с данными заметки
 * @param {Object} encryptedData - объект с зашифрованными данными
 * @param {string} encryptionKey - ключ расшифровки
 * @returns {Object} объект с расшифрованными полями
 */
export const decryptNoteData = (encryptedData, encryptionKey) => {
  return {
    id: encryptedData.id,
    title: decryptData(encryptedData.encryptedTitle, encryptionKey),
    type: decryptData(encryptedData.encryptedType, encryptionKey),
    content: decryptData(encryptedData.encryptedData, encryptionKey),
    createdAt: encryptedData.createdAt,
    updatedAt: encryptedData.updatedAt,
    lastSyncAt: encryptedData.lastSyncAt
  };
};

/**
 * Проверяет прочность пароля
 * @param {string} password - пароль для проверки
 * @returns {Object} объект с результатами проверки
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  
  return {
    requirements,
    score,
    strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong',
    isValid: score >= 3 && requirements.length
  };
};

/**
 * Генерирует надежный пароль
 * @param {number} length - длина пароля (по умолчанию 16)
 * @param {Object} options - опции генерации пароля
 * @returns {string} сгенерированный пароль
 */
export const generateSecurePassword = (length = 16, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options;

  let charset = '';
  const similar = 'il1Lo0O';

  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  if (includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}; 