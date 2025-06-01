// Криптографические утилиты для безопасности паролей

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