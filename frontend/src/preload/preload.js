const { contextBridge, ipcRenderer } = require('electron');

console.log('🔐 Preload script loaded - setting up secure API');

// Безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // События меню
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Криптографические операции (выполняются в main процессе)
  crypto: {
    unlock: (password, salt) => ipcRenderer.invoke('crypto:unlock', password, salt),
    lock: () => ipcRenderer.invoke('crypto:lock'),
    isUnlocked: () => ipcRenderer.invoke('crypto:isUnlocked')
  },

  // Безопасные операции с паролями (шифрование в main процессе)
  passwords: {
    encrypt: (passwordData) => ipcRenderer.invoke('passwords:encrypt', passwordData),
    decrypt: (encryptedData) => ipcRenderer.invoke('passwords:decrypt', encryptedData),
    encryptString: (plaintext) => ipcRenderer.invoke('passwords:encrypt-string', plaintext),
    decryptString: (encryptedData) => ipcRenderer.invoke('passwords:decrypt-string', encryptedData)
  },

  // Безопасные операции с заметками (шифрование в main процессе)
  notes: {
    encrypt: (noteData) => ipcRenderer.invoke('notes:encrypt', noteData),
    decrypt: (encryptedData) => ipcRenderer.invoke('notes:decrypt', encryptedData),
    encryptString: (plaintext) => ipcRenderer.invoke('notes:encrypt-string', plaintext),
    decryptString: (encryptedData) => ipcRenderer.invoke('notes:decrypt-string', encryptedData)
  }
});

console.log('✅ electronAPI exposed to window object'); 