const { contextBridge, ipcRenderer } = require('electron');

console.log('🔐 Preload script loaded - setting up secure API');

// URL локального сервера — можно переопределить через --local-server-url при запуске Electron
const _localServerUrlArg = process.argv.find(a => a.startsWith('--local-server-url='));
const _localServerUrl = _localServerUrlArg
  ? _localServerUrlArg.split('=').slice(1).join('=')
  : 'http://localhost:3001';

// Безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // URL локального сервера (для поддержки нескольких инстансов)
  localServerUrl: _localServerUrl,

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
    isUnlocked: () => ipcRenderer.invoke('crypto:isUnlocked'),

    // ── Group Vault — X25519 / ECDH ─────────────────────────────────────────
    deriveX25519Keypair: (masterPassword, userId) =>
      ipcRenderer.invoke('crypto:derive-x25519-keypair', masterPassword, userId),
    ecdhWrapKey: (myPrivKeyBase64, theirPubKeyBase64, groupKeyBase64) =>
      ipcRenderer.invoke('crypto:ecdh-wrap-key', myPrivKeyBase64, theirPubKeyBase64, groupKeyBase64),
    ecdhUnwrapKey: (myPrivKeyBase64, theirPubKeyBase64, encryptedBase64, nonceBase64) =>
      ipcRenderer.invoke('crypto:ecdh-unwrap-key', myPrivKeyBase64, theirPubKeyBase64, encryptedBase64, nonceBase64),
    encryptWithGroupKey: (groupKeyBase64, plaintext) =>
      ipcRenderer.invoke('crypto:encrypt-with-group-key', groupKeyBase64, plaintext),
    decryptWithGroupKey: (groupKeyBase64, ciphertext, iv) =>
      ipcRenderer.invoke('crypto:decrypt-with-group-key', groupKeyBase64, ciphertext, iv),
    generateGroupKey: () =>
      ipcRenderer.invoke('crypto:generate-group-key'),
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
  },

  security: {
    getStatus: (force) => ipcRenderer.invoke('security:get-status', force),
    refresh: () => ipcRenderer.invoke('security:refresh'),
    openDefender: () => ipcRenderer.invoke('security:open-defender')
  },

  backup: {
    create: (masterPassword, jsonString, filename) =>
      ipcRenderer.invoke('backup:create', masterPassword, jsonString, filename),
    import: (masterPassword) => ipcRenderer.invoke('backup:import', masterPassword)
  },

  shell: {
    showItem: (filePath) => ipcRenderer.invoke('shell:show-item', filePath)
  }
});

console.log('✅ electronAPI exposed to window object'); 