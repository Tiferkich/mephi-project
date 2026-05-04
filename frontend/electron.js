require('dotenv').config();

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const CryptoManager = require('./src/main/crypto-manager');
const { createSecurityProvider } = require('./src/main/security');

const isDev = !app.isPackaged;

// Поддержка второго инстанса: electron . --local-server-url=http://localhost:3002
const localServerUrlArg = process.argv.find(a => a.startsWith('--local-server-url='));
const LOCAL_SERVER_URL = localServerUrlArg
  ? localServerUrlArg.split('=').slice(1).join('=')
  : (process.env.LOCAL_SERVER_URL || 'http://localhost:3001');

const REACT_DEV_URL = process.env.REACT_DEV_URL || 'http://localhost:3000';

const cryptoManager = new CryptoManager();
const securityProvider = createSecurityProvider();
let mainWindow;

ipcMain.handle('crypto:unlock', async (event, password, salt) => {
  return await cryptoManager.setMasterPassword(password, salt);
});

ipcMain.handle('crypto:lock', async (event) => {
  cryptoManager.lock();
  return { success: true };
});

ipcMain.handle('crypto:isUnlocked', async (event) => {
  return cryptoManager.isVaultUnlocked();
});

ipcMain.handle('passwords:encrypt', async (event, passwordData) => {
  try {
    const encrypted = await cryptoManager.encryptData(passwordData);
    return { success: true, data: encrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('passwords:decrypt', async (event, encryptedData) => {
  try {
    const decrypted = await cryptoManager.decryptData(encryptedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('passwords:encrypt-string', async (event, plaintext) => {
  try {
    const encrypted = await cryptoManager.encryptData(plaintext);
    return { success: true, data: encrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('passwords:decrypt-string', async (event, encryptedData) => {
  try {
    const decrypted = await cryptoManager.decryptData(encryptedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notes:encrypt', async (event, noteData) => {
  try {
    const encrypted = await cryptoManager.encryptData(noteData);
    return { success: true, data: encrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notes:decrypt', async (event, encryptedData) => {
  try {
    const decrypted = await cryptoManager.decryptData(encryptedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notes:encrypt-string', async (event, plaintext) => {
  try {
    const encrypted = await cryptoManager.encryptData(plaintext);
    return { success: true, data: encrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notes:decrypt-string', async (event, encryptedData) => {
  try {
    const decrypted = await cryptoManager.decryptData(encryptedData);
    return { success: true, data: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Backup IPC ─────────────────────────────────────────────────────────────

/**
 * Нормализует имя файла бэкапа: безопасные символы + расширение .vault
 */
function normalizeVaultFileName(name) {
  const raw = (name || '').trim() || `vault-backup-${new Date().toISOString().slice(0, 10)}`;
  const noIllegal = raw.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-');
  return noIllegal.toLowerCase().endsWith('.vault') ? noIllegal : `${noIllegal}.vault`;
}

/**
 * backup:create — шифрует JSON-строку бэкапа и сохраняет в *.vault файл.
 * filename — имя по умолчанию в диалоге (из UI stepper)
 */
ipcMain.handle('backup:create', async (_event, masterPassword, jsonString, filename) => {
  try {
    const buf = await cryptoManager.encryptBackup(masterPassword, jsonString);
    const defaultPath = normalizeVaultFileName(filename);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить резервную копию',
      defaultPath,
      filters: [{ name: 'Vault Backup', extensions: ['vault'] }]
    });
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    fs.writeFileSync(filePath, buf);
    return { success: true, filePath, filename: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * backup:import — открывает *.vault файл, расшифровывает, возвращает JSON.
 * Вызов: ipcRenderer.invoke('backup:import', masterPassword)
 */
ipcMain.handle('backup:import', async (_event, masterPassword) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Открыть резервную копию',
      filters: [{ name: 'Vault Backup', extensions: ['vault'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const buf = fs.readFileSync(filePaths[0]);
    const json = await cryptoManager.decryptBackup(masterPassword, buf);
    return { success: true, json };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Shell (открытие папки с файлом) ───────────────────────────────────────

ipcMain.handle('shell:show-item', async (_event, filePath) => {
  if (!filePath) return { success: false, error: 'no path' };
  try {
    const resolved = path.resolve(String(filePath));
    if (fs.existsSync(resolved) && !fs.statSync(resolved).isDirectory()) {
      shell.showItemInFolder(resolved);
    } else if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      await shell.openPath(resolved);
    } else {
      return { success: false, error: 'path not found' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Group Vault — X25519 / ECDH / Group-Key crypto ─────────────────────────
//
// All operations run in the main process (Node.js crypto) so the private key
// material never touches the renderer sandbox.

const nodeCrypto = require('crypto');

// DER prefixes for raw X25519 keys (RFC 8410)
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');
const X25519_SPKI_PREFIX  = Buffer.from('302a300506032b656e032100', 'hex');

function rawPrivToKeyObject(raw32) {
  return nodeCrypto.createPrivateKey({
    key: Buffer.concat([X25519_PKCS8_PREFIX, raw32]),
    format: 'der',
    type: 'pkcs8',
  });
}

function rawPubToKeyObject(raw32) {
  return nodeCrypto.createPublicKey({
    key: Buffer.concat([X25519_SPKI_PREFIX, raw32]),
    format: 'der',
    type: 'spki',
  });
}

function keyObjectToRawPub(pubKeyObj) {
  const der = pubKeyObj.export({ format: 'der', type: 'spki' });
  return der.slice(X25519_SPKI_PREFIX.length); // last 32 bytes
}

/**
 * crypto:derive-x25519-keypair(masterPassword, userId)
 * Returns { privKeyBase64, pubKeyBase64 } — raw 32-byte keys in base64.
 * Deterministic: same inputs always produce the same keypair.
 */
ipcMain.handle('crypto:derive-x25519-keypair', async (_event, masterPassword, userId) => {
  try {
    // Derive 32-byte seed: PBKDF2-SHA256(masterPassword, "x25519:" + userId, 200000)
    const seed = nodeCrypto.pbkdf2Sync(
      masterPassword,
      `x25519:${userId}`,
      200000,
      32,
      'sha256',
    );
    const privKeyObj = rawPrivToKeyObject(seed);
    const pubKeyObj  = nodeCrypto.createPublicKey(privKeyObj);
    const rawPub     = keyObjectToRawPub(pubKeyObj);

    return {
      success: true,
      privKeyBase64: seed.toString('base64'),
      pubKeyBase64:  rawPub.toString('base64'),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * crypto:ecdh-wrap-key(myPrivKeyBase64, theirPubKeyBase64, groupKeyBase64)
 * ECDH → 32-byte shared secret → AES-256-GCM encrypt groupKey
 * Returns { encryptedBase64, nonceBase64 }
 */
ipcMain.handle('crypto:ecdh-wrap-key',
  async (_event, myPrivKeyBase64, theirPubKeyBase64, groupKeyBase64) => {
    try {
      const myPriv   = rawPrivToKeyObject(Buffer.from(myPrivKeyBase64, 'base64'));
      const theirPub = rawPubToKeyObject(Buffer.from(theirPubKeyBase64, 'base64'));
      const shared   = nodeCrypto.diffieHellman({ privateKey: myPriv, publicKey: theirPub });

      const nonce = nodeCrypto.randomBytes(12);
      const cipher = nodeCrypto.createCipheriv('aes-256-gcm', shared, nonce);
      const groupKeyBuf = Buffer.from(groupKeyBase64, 'base64');
      const encrypted   = Buffer.concat([cipher.update(groupKeyBuf), cipher.final()]);
      const authTag     = cipher.getAuthTag();

      // Pack: encrypted || authTag (16 bytes)
      const payload = Buffer.concat([encrypted, authTag]);

      return {
        success: true,
        encryptedBase64: payload.toString('base64'),
        nonceBase64: nonce.toString('base64'),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
);

/**
 * crypto:ecdh-unwrap-key(myPrivKeyBase64, theirPubKeyBase64, encryptedBase64, nonceBase64)
 * Reverse of wrap: ECDH → shared → AES-256-GCM decrypt
 * Returns { groupKeyBase64 }
 */
ipcMain.handle('crypto:ecdh-unwrap-key',
  async (_event, myPrivKeyBase64, theirPubKeyBase64, encryptedBase64, nonceBase64) => {
    try {
      const myPriv   = rawPrivToKeyObject(Buffer.from(myPrivKeyBase64, 'base64'));
      const theirPub = rawPubToKeyObject(Buffer.from(theirPubKeyBase64, 'base64'));
      const shared   = nodeCrypto.diffieHellman({ privateKey: myPriv, publicKey: theirPub });

      const nonce   = Buffer.from(nonceBase64, 'base64');
      const payload = Buffer.from(encryptedBase64, 'base64');
      // Last 16 bytes are the GCM auth tag
      const authTag    = payload.slice(payload.length - 16);
      const ciphertext = payload.slice(0, payload.length - 16);

      const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', shared, nonce);
      decipher.setAuthTag(authTag);
      const groupKeyBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      return { success: true, groupKeyBase64: groupKeyBuf.toString('base64') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
);

/**
 * crypto:encrypt-with-group-key(groupKeyBase64, plaintext)
 * AES-256-CBC (same format as personal vault entries)
 * Returns { ciphertext, iv } — both base64
 */
ipcMain.handle('crypto:encrypt-with-group-key', async (_event, groupKeyBase64, plaintext) => {
  try {
    const key = Buffer.from(groupKeyBase64, 'base64');
    const iv  = nodeCrypto.randomBytes(16);
    const cipher = nodeCrypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf8')),
      cipher.final(),
    ]);
    return {
      success: true,
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * crypto:decrypt-with-group-key(groupKeyBase64, ciphertext, iv)
 * AES-256-CBC decrypt
 * Returns { plaintext }
 */
ipcMain.handle('crypto:decrypt-with-group-key', async (_event, groupKeyBase64, ciphertext, iv) => {
  try {
    const key      = Buffer.from(groupKeyBase64, 'base64');
    const ivBuf    = Buffer.from(iv, 'base64');
    const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', key, ivBuf);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);
    return { success: true, plaintext: decrypted.toString('utf8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * crypto:generate-group-key()
 * Generates a random 256-bit AES key for a new group.
 * Returns { groupKeyBase64 }
 */
ipcMain.handle('crypto:generate-group-key', async () => {
  try {
    const key = nodeCrypto.randomBytes(32);
    return { success: true, groupKeyBase64: key.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Security ────────────────────────────────────────────────────────────────

ipcMain.handle('security:get-status', async (_event, force = false) => {
  return await securityProvider.detect(!!force);
});

ipcMain.handle('security:refresh', async () => {
  return await securityProvider.detect(true);
});

ipcMain.handle('security:open-defender', async () => {
  if (process.platform === 'win32') {
    await shell.openExternal('windowsdefender:');
  }
  return { success: true };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,        // Отключаем Node.js в renderer
      contextIsolation: true,        // Включаем изоляцию контекста
      enableRemoteModule: false,     // Отключаем remote модуль
      preload: path.join(__dirname, 'src/preload/preload.js'),
      webSecurity: true,             // Включаем веб-безопасность
      additionalArguments: [`--local-server-url=${LOCAL_SERVER_URL}`]
    },
    icon: path.join(__dirname, 'build/favicon.ico'),
    show: false,
    titleBarStyle: 'default'
  });

  const startUrl = isDev
    ? REACT_DEV_URL
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Entry',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'menu-new-entry');
          }
        },
        {
          label: 'Lock Vault',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('menu-action', 'menu-lock');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Sync',
      submenu: [
        {
          label: 'Push to Remote',
          click: () => {
            mainWindow.webContents.send('menu-action', 'menu-sync-push');
          }
        },
        {
          label: 'Pull from Remote',
          click: () => {
            mainWindow.webContents.send('menu-action', 'menu-sync-pull');
          }
        },
        { type: 'separator' },
        {
          label: 'Remote Settings',
          click: () => {
            mainWindow.webContents.send('menu-action', 'menu-remote-settings');
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  cryptoManager.lock();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== new URL(REACT_DEV_URL).origin && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
}); 