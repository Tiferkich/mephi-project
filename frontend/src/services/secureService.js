/**
 * Безопасный сервис для криптографических операций
 * Все шифрование/расшифровка происходит в main процессе
 */

// Функция для проверки доступности Electron API
const checkElectronAPI = () => {
  console.log('Checking Electron API availability...');
  console.log('window.electronAPI:', window.electronAPI);
  console.log('Is Electron environment:', typeof window !== 'undefined' && window.electronAPI);
  
  if (!window.electronAPI) {
    console.error('❌ Electron API not available. Make sure you are running the Electron version, not the web version.');
    throw new Error('Electron API not available. Please run the Electron version of the app.');
  }
  
  console.log('✅ Electron API is available');
  return true;
};

export const secureService = {
  // Разблокировка хранилища
  async unlock(masterPassword, salt) {
    checkElectronAPI();
    
    try {
      const result = await window.electronAPI.crypto.unlock(masterPassword, salt);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to unlock vault: ${error.message}`);
    }
  },

  // Блокировка хранилища
  async lock() {
    checkElectronAPI();
    
    try {
      const result = await window.electronAPI.crypto.lock();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to lock vault: ${error.message}`);
    }
  },

  // Проверка статуса разблокировки
  async isUnlocked() {
    try {
      checkElectronAPI();
      return await window.electronAPI.crypto.isUnlocked();
    } catch (error) {
      console.error('Failed to check unlock status:', error);
      return false;
    }
  },

  // Шифрование пароля (в main процессе) - ИСПРАВЛЕНО для backend формата
  async encryptPassword(passwordData) {
    checkElectronAPI();
    
    try {
      // Шифруем каждое поле отдельно для совместимости с backend
      const encryptedTitle = await window.electronAPI.passwords.encryptString(passwordData.title || '');
      const encryptedSite = await window.electronAPI.passwords.encryptString(passwordData.site || '');
      const encryptedLogin = await window.electronAPI.passwords.encryptString(passwordData.login || '');
      const encryptedPassword = await window.electronAPI.passwords.encryptString(passwordData.password || '');
      const encryptedType = await window.electronAPI.passwords.encryptString(passwordData.type || 'Website');
      
      if (!encryptedTitle.success || !encryptedSite.success || !encryptedLogin.success || 
          !encryptedPassword.success || !encryptedType.success) {
        throw new Error('Failed to encrypt some password fields');
      }
      
      // ✅ ИСПРАВЛЕНИЕ: Извлекаем только строку из объекта {data, iv, version}
      return {
        encryptedTitle: JSON.stringify(encryptedTitle.data),
        encryptedSite: JSON.stringify(encryptedSite.data),
        encryptedLogin: JSON.stringify(encryptedLogin.data),
        encryptedPassword: JSON.stringify(encryptedPassword.data),
        encryptedType: JSON.stringify(encryptedType.data)
      };
    } catch (error) {
      throw new Error(`Failed to encrypt password: ${error.message}`);
    }
  },

  // Расшифровка пароля (в main процессе) - ИСПРАВЛЕНО для backend формата
  async decryptPassword(encryptedData) {
    checkElectronAPI();
    
    try {
      // ✅ ИСПРАВЛЕНИЕ: Парсим JSON обратно в объект {data, iv, version}
      const titleResult = await window.electronAPI.passwords.decryptString(JSON.parse(encryptedData.encryptedTitle));
      const siteResult = await window.electronAPI.passwords.decryptString(JSON.parse(encryptedData.encryptedSite));
      const loginResult = await window.electronAPI.passwords.decryptString(JSON.parse(encryptedData.encryptedLogin));
      const passwordResult = await window.electronAPI.passwords.decryptString(JSON.parse(encryptedData.encryptedPassword));
      const typeResult = await window.electronAPI.passwords.decryptString(JSON.parse(encryptedData.encryptedType));
      
      if (!titleResult.success || !siteResult.success || !loginResult.success || 
          !passwordResult.success || !typeResult.success) {
        throw new Error('Failed to decrypt some password fields');
      }
      
      return {
        title: titleResult.data,
        site: siteResult.data,
        login: loginResult.data,
        password: passwordResult.data,
        type: typeResult.data
      };
    } catch (error) {
      throw new Error(`Failed to decrypt password: ${error.message}`);
    }
  },

  // Шифрование заметки (в main процессе) - ИСПРАВЛЕНО для backend формата
  async encryptNote(noteData) {
    checkElectronAPI();
    
    try {
      // Шифруем каждое поле отдельно для совместимости с backend
      const encryptedTitle = await window.electronAPI.notes.encryptString(noteData.title || '');
      const encryptedType = await window.electronAPI.notes.encryptString(noteData.type || 'Note');
      const encryptedData = await window.electronAPI.notes.encryptString(noteData.content || '');
      
      if (!encryptedTitle.success || !encryptedType.success || !encryptedData.success) {
        throw new Error('Failed to encrypt some note fields');
      }
      
      // ✅ ИСПРАВЛЕНИЕ: Извлекаем только строку из объекта {data, iv, version}
      return {
        encryptedTitle: JSON.stringify(encryptedTitle.data),
        encryptedType: JSON.stringify(encryptedType.data),
        encryptedData: JSON.stringify(encryptedData.data)
      };
    } catch (error) {
      throw new Error(`Failed to encrypt note: ${error.message}`);
    }
  },

  // Расшифровка заметки (в main процессе) - ИСПРАВЛЕНО для backend формата
  async decryptNote(encryptedData) {
    checkElectronAPI();
    
    try {
      // ✅ ИСПРАВЛЕНИЕ: Парсим JSON обратно в объект {data, iv, version}
      const titleResult = await window.electronAPI.notes.decryptString(JSON.parse(encryptedData.encryptedTitle));
      const typeResult = await window.electronAPI.notes.decryptString(JSON.parse(encryptedData.encryptedType));
      const contentResult = await window.electronAPI.notes.decryptString(JSON.parse(encryptedData.encryptedData));
      
      if (!titleResult.success || !typeResult.success || !contentResult.success) {
        throw new Error('Failed to decrypt some note fields');
      }
      
      return {
        title: titleResult.data,
        type: typeResult.data,
        content: contentResult.data
      };
    } catch (error) {
      throw new Error(`Failed to decrypt note: ${error.message}`);
    }
  }
}; 