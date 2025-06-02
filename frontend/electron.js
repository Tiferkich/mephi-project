const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const CryptoManager = require('./src/main/crypto-manager');

const cryptoManager = new CryptoManager();
let mainWindow;

// Безопасные обработчики IPC
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

// Обработчики для паролей (шифрование в main процессе)
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

// ✅ НОВЫЕ handlers для шифрования отдельных строк
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

// Обработчики для заметок (шифрование в main процессе)
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

// ✅ НОВЫЕ handlers для шифрования отдельных строк заметок
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

// Создание окна с безопасными настройками
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
      webSecurity: true             // Включаем веб-безопасность
    },
    icon: path.join(__dirname, 'build/favicon.ico'),
    show: false,
    titleBarStyle: 'default'
  });

  // Загружаем React приложение
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  // Показываем окно после загрузки
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Открываем DevTools только в development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Создаем меню приложения
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

  // macOS меню
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

// События приложения
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Очищаем криптографические ключи при закрытии
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

// Безопасность: предотвращение открытия новых окон
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Предотвращение навигации к внешним ресурсам
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
}); 