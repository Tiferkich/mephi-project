import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Key, 
  FileText, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Settings,
  LogOut,
  Plus,
  Lock,
  Unlock
} from 'lucide-react';
import { remoteService, syncService, authService, passwordService, noteService } from '../services/authService';
import { secureService } from '../services/secureService';
import PasswordForm from '../components/PasswordForm';
import NoteForm from '../components/NoteForm';
import PasswordList from '../components/PasswordList';
import NoteList from '../components/NoteList';
import ToastContainer from '../components/ToastContainer';
import PasswordPromptModal from '../components/PasswordPromptModal';
import SyncManager from '../components/SyncManager';
import { useToast } from '../hooks/useToast';

const DashboardPage = ({ user, onLogout }) => {
  const [remoteStatus, setRemoteStatus] = useState({
    hasRemoteAccount: false,
    remoteServerAvailable: false,
    tokenValid: false,
    canSync: false,
    message: 'Use Cloud Sync Manager to setup cloud synchronization'
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State for passwords
  const [passwords, setPasswords] = useState([]);
  const [passwordsLoading, setPasswordsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  
  // State for notes
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  
  // Lock/Unlock state
  const [isLocked, setIsLocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // Cloud Sync Manager state
  const [showSyncManager, setShowSyncManager] = useState(false);

  // Toast system
  const { toasts, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // ✅ Проверяем статус разблокировки Electron хранилища
      const isUnlocked = await secureService.isUnlocked();
      
      if (!isUnlocked) {
        console.error('Vault is not unlocked');
        setIsLocked(true);
        return;
      }
      
      await Promise.all([
        loadPasswords(),
        loadNotes()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setIsLocked(true);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Безопасная загрузка паролей - расшифровка в main процессе
  const loadPasswords = async () => {
    setPasswordsLoading(true);
    try {
      const encryptedPasswords = await passwordService.getAll();
      let decryptionFailures = 0;
      
      const decryptedPasswords = [];
      
      for (const encryptedPassword of encryptedPasswords) {
        try {
          const decrypted = await secureService.decryptPassword(encryptedPassword);
          decryptedPasswords.push({ id: encryptedPassword.id, ...decrypted });
        } catch (error) {
          console.error('Failed to decrypt password:', encryptedPassword.id, error);
          decryptionFailures++;
        }
      }
      
      if (encryptedPasswords.length > 0 && decryptedPasswords.length === 0 && decryptionFailures > 0) {
        console.warn(`⚠️ Failed to decrypt ${decryptionFailures} passwords. Vault might be locked.`);
      }
      
      setPasswords(decryptedPasswords);
    } catch (error) {
      console.error('Failed to load passwords:', error);
    } finally {
      setPasswordsLoading(false);
    }
  };

  // ✅ Безопасная загрузка заметок - расшифровка в main процессе
  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const encryptedNotes = await noteService.getAll();
      let decryptionFailures = 0;
      
      const decryptedNotes = [];
      
      for (const encryptedNote of encryptedNotes) {
        try {
          const decrypted = await secureService.decryptNote(encryptedNote);
          decryptedNotes.push({ id: encryptedNote.id, ...decrypted });
        } catch (error) {
          console.error('Failed to decrypt note:', encryptedNote.id, error);
          decryptionFailures++;
        }
      }
      
      if (encryptedNotes.length > 0 && decryptedNotes.length === 0 && decryptionFailures > 0) {
        console.warn(`⚠️ Failed to decrypt ${decryptionFailures} notes. Vault might be locked.`);
      }
      
      setNotes(decryptedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSync = async () => {
    // ✅ Кнопка синхронизации работает только если пользователь подключен к облаку
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) {
      showWarning('Please setup cloud sync first using Cloud Sync Manager');
      return;
    }

    setSyncLoading(true);
    try {
      showInfo('Syncing data with cloud...');
      
      // Здесь будут вызовы к реальным методам синхронизации когда они будут готовы
      await syncService.pushToRemote();
      await syncService.pullFromRemote();
      
      showSuccess('Sync completed successfully!');
      
      // Reload data after sync
      await Promise.all([loadPasswords(), loadNotes()]);
      
    } catch (error) {
      console.error('Sync failed:', error);
      showError(`Sync failed: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLogout = async () => {
    // Блокируем хранилище перед выходом
    await secureService.lock();
    authService.logout();
    onLogout();
  };

  // Password handlers
  const handleAddPassword = () => {
    if (isLocked) return;
    setEditingPassword(null);
    setShowPasswordForm(true);
  };

  const handleEditPassword = (password) => {
    if (isLocked) return;
    setEditingPassword(password);
    setShowPasswordForm(true);
  };

  // ✅ Безопасное сохранение пароля - шифрование в main процессе
  const handleSavePassword = async (passwordData) => {
    try {
      // Шифруем данные в main процессе
      const encryptedData = await secureService.encryptPassword(passwordData);
      
      let savedPassword;
      if (editingPassword) {
        savedPassword = await passwordService.update(editingPassword.id, encryptedData);
      } else {
        savedPassword = await passwordService.create(encryptedData);
      }
      
      setShowPasswordForm(false);
      setEditingPassword(null);
      await loadPasswords();
    } catch (error) {
      console.error('Failed to save password:', error);
      throw error;
    }
  };

  const handleDeletePassword = async (passwordId) => {
    if (!confirm('Are you sure you want to delete this password?')) {
      return;
    }
    
    try {
      await passwordService.delete(passwordId);
      await loadPasswords();
    } catch (error) {
      console.error('Failed to delete password:', error);
    }
  };

  // Note handlers
  const handleAddNote = () => {
    if (isLocked) return;
    setEditingNote(null);
    setShowNoteForm(true);
  };

  const handleEditNote = (note) => {
    if (isLocked) return;
    setEditingNote(note);
    setShowNoteForm(true);
  };

  // ✅ Безопасное сохранение заметки - шифрование в main процессе
  const handleSaveNote = async (noteData) => {
    try {
      // Шифруем данные в main процессе
      const encryptedData = await secureService.encryptNote(noteData);
      
      let savedNote;
      if (editingNote) {
        savedNote = await noteService.update(editingNote.id, encryptedData);
      } else {
        savedNote = await noteService.create(encryptedData);
      }
      
      setShowNoteForm(false);
      setEditingNote(null);
      await loadNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      await noteService.delete(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // ✅ Безопасная блокировка/разблокировка
  const handleLockUnlock = async () => {
    if (isLocked) {
      // Показываем модальное окно вместо prompt()
      setShowPasswordPrompt(true);
    } else {
      // Lock: блокируем хранилище и очищаем UI данные
      try {
        await secureService.lock();
        
        // Очищаем только UI данные
        setPasswords([]);
        setNotes([]);
        setIsLocked(true);
        
        // Закрываем открытые модальные окна
        setShowPasswordForm(false);
        setShowNoteForm(false);
        setEditingPassword(null);
        setEditingNote(null);
        
        showWarning('Vault locked. Data cleared from memory.');
      } catch (error) {
        console.error('Failed to lock vault:', error);
        showError('Failed to lock vault.');
      }
    }
  };

  // Обработчик подтверждения пароля из модального окна
  const handlePasswordConfirm = async (password) => {
    setShowPasswordPrompt(false);
    
    try {
      // Разблокируем хранилище в main процессе
      await secureService.unlock(password, user.username || 'default-salt');
      
      // Загружаем и расшифровываем данные в main процессе
      await Promise.all([loadPasswords(), loadNotes()]);
      
      setIsLocked(false);
      showSuccess('Vault unlocked successfully!');
      
    } catch (error) {
      console.error('Failed to unlock with master password:', error);
      showError('Failed to unlock. Check your master password.');
    }
  };

  // Обработчик отмены ввода пароля
  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
  };

  const handleSyncSuccess = (result) => {
    switch (result.type) {
      case 'sync_setup':
        // Обновляем статус после успешной настройки облачной синхронизации
        setRemoteStatus({
          hasRemoteAccount: true,
          remoteServerAvailable: true,
          tokenValid: true,
          canSync: true,
          message: 'Connected to cloud sync'
        });
        showSuccess('Cloud sync setup completed successfully!');
        break;
        
      case 'account_recovery':
        // Полное восстановление аккаунта
        setRemoteStatus({
          hasRemoteAccount: true,
          remoteServerAvailable: true,
          tokenValid: true,
          canSync: true,
          message: 'Connected to cloud sync'
        });
        showSuccess('Account recovered successfully! All your data has been restored.');
        // Перезагружаем данные
        loadPasswords();
        loadNotes();
        break;
        
      case 'account_replaced':
        // Аккаунт был полностью заменен - нужно перезагрузить приложение
        showSuccess(result.message || 'Account replaced successfully!');
        
        // Обновляем токен авторизации
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // Перезагружаем страницу для полного обновления состояния
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        break;
        
      case 'remote_connected':
        // Удаленный аккаунт подключен к локальному
        setRemoteStatus({
          hasRemoteAccount: true,
          remoteServerAvailable: true,
          tokenValid: true,
          canSync: true,
          message: 'Connected to cloud sync - ready to synchronize'
        });
        showSuccess(result.message || 'Remote account connected! Click "Sync Now" to synchronize your data.');
        
        // Обновляем токен авторизации если он изменился
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // НЕ перезагружаем данные - они будут синхронизированы через Sync Now
        break;
        
      case 'device_transfer':
        // Импорт данных с другого устройства
        showSuccess('Data transfer completed successfully!');
        // Перезагружаем данные
        loadPasswords();
        loadNotes();
        break;
    }
    setShowSyncManager(false);
  };

  const getSyncButtonText = () => {
    if (syncLoading) return 'Syncing...';
    return 'Sync Now';
  };

  const getSyncButtonIcon = () => {
    if (!remoteStatus.remoteServerAvailable) return CloudOff;
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) return Cloud;
    return RefreshCw;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        color: 'var(--text-secondary)'
      }}>
        Loading your vault...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
      padding: 'var(--spacing-lg)'
    }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <Shield 
            size={32} 
            style={{ 
              color: 'var(--color-success)',
              filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.3))'
            }}
          />
          <div>
            <h1 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Password Vault
            </h1>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Welcome back, {user.username}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={handleLockUnlock}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'none',
              border: `1px solid ${isLocked ? 'var(--color-danger)' : 'var(--color-success)'}`,
              borderRadius: 'var(--border-radius-md)',
              color: isLocked ? 'var(--color-danger)' : 'var(--color-success)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = isLocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
            }}
            title={isLocked ? "Unlock vault to decrypt data" : "Lock vault and clear data from memory"}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            {isLocked ? 'Unlock Vault' : 'Lock Vault'}
          </button>
          
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--color-success)';
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            <Settings size={16} />
            Settings
          </button>
          
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'none',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--color-danger)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--color-danger)';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </motion.header>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        {/* Passwords Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            padding: 'var(--spacing-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <Key style={{ color: 'var(--color-info)', marginRight: 'var(--spacing-sm)' }} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Passwords</h3>
          </div>
          <p style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-info)',
            margin: 0
          }}>
            {passwords.length}
          </p>
          <p style={{ 
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Stored securely
          </p>
        </motion.div>

        {/* Notes Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: 'var(--spacing-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <FileText style={{ color: 'var(--color-warning)', marginRight: 'var(--spacing-sm)' }} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Notes</h3>
          </div>
          <p style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-warning)',
            margin: 0
          }}>
            {notes.length}
          </p>
          <p style={{ 
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Personal notes
          </p>
        </motion.div>

        {/* Sync Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: 'var(--spacing-lg)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            {React.createElement(getSyncButtonIcon(), { 
              style: { 
                color: remoteStatus.remoteServerAvailable ? 'var(--color-success)' : 'var(--text-secondary)', 
                marginRight: 'var(--spacing-sm)' 
              } 
            })}
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Remote Sync</h3>
          </div>
          
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: remoteStatus.remoteServerAvailable ? 'var(--color-success)' : 'var(--text-secondary)',
              margin: '0 0 var(--spacing-xs) 0',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Status: {remoteStatus.remoteServerAvailable ? 
                (remoteStatus.hasRemoteAccount ? 
                  (remoteStatus.tokenValid ? '🟢 Connected' : '🟡 Disconnected') 
                  : '📱 Ready to connect') 
                : '🔴 Server offline'
              }
            </p>
            {remoteStatus.message && (
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                margin: 0,
                fontStyle: 'italic'
              }}>
                {remoteStatus.message}
              </p>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={syncLoading || !remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid}
            style={{
              width: '100%',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: (remoteStatus.hasRemoteAccount && remoteStatus.tokenValid) ? 
                'var(--color-success)' : 'var(--bg-tertiary)',
              color: (remoteStatus.hasRemoteAccount && remoteStatus.tokenValid) ? 
                'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: (remoteStatus.hasRemoteAccount && remoteStatus.tokenValid) ? 
                'pointer' : 'not-allowed',
              opacity: syncLoading ? 0.7 : 1,
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-xs)',
              marginBottom: 'var(--spacing-sm)'
            }}
          >
            {syncLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} />
              </motion.div>
            )}
            {getSyncButtonText()}
          </button>

          <button
            onClick={() => setShowSyncManager(true)}
            style={{
              width: '100%',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-xs)'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--border-color-hover)';
              e.target.style.background = 'var(--base-light)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.background = 'var(--bg-tertiary)';
            }}
          >
            <Cloud size={14} />
            Cloud Sync Manager
          </button>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          padding: 'var(--spacing-lg)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 'var(--spacing-xl)'
        }}
      >
        <h3 style={{ 
          margin: '0 0 var(--spacing-md) 0', 
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <Plus size={20} />
          Quick Actions
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)'
        }}>
          <button
            onClick={handleAddPassword}
            disabled={isLocked}
            style={{
              padding: 'var(--spacing-md)',
              background: isLocked ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--color-info) 0%, var(--color-info-hover) 100%)',
              color: isLocked ? 'var(--text-secondary)' : 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)',
              opacity: isLocked ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLocked) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <Key size={16} />
            Add Password
          </button>
          
          <button
            onClick={handleAddNote}
            disabled={isLocked}
            style={{
              padding: 'var(--spacing-md)',
              background: isLocked ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-hover) 100%)',
              color: isLocked ? 'var(--text-secondary)' : 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)',
              opacity: isLocked ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLocked) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            <FileText size={16} />
            Add Note
          </button>
        </div>
      </motion.div>

      {/* Data Lists */}
      {!isLocked && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-xl)'
        }}>
          {/* Password List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <PasswordList
              passwords={passwords}
              onEdit={handleEditPassword}
              onDelete={handleDeletePassword}
              loading={passwordsLoading}
            />
          </motion.div>

          {/* Note List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <NoteList
              notes={notes}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              loading={notesLoading}
            />
          </motion.div>
        </div>
      )}

      {/* Locked State Message */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 'var(--spacing-2xl)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center'
          }}
        >
          <Lock size={48} style={{ color: 'var(--color-warning)', marginBottom: 'var(--spacing-md)' }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 var(--spacing-sm) 0' }}>
            Vault is Locked
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            All sensitive data has been cleared from memory. Click "Unlock Vault" to access your passwords and notes.
          </p>
        </motion.div>
      )}

      {/* Modals */}
      {showPasswordForm && !isLocked && (
        <PasswordForm
          initialData={editingPassword}
          onSave={handleSavePassword}
          onCancel={() => {
            setShowPasswordForm(false);
            setEditingPassword(null);
          }}
          isEditing={!!editingPassword}
        />
      )}

      {showNoteForm && !isLocked && (
        <NoteForm
          initialData={editingNote}
          onSave={handleSaveNote}
          onCancel={() => {
            setShowNoteForm(false);
            setEditingNote(null);
          }}
          isEditing={!!editingNote}
        />
      )}

      {/* Password Prompt Modal */}
      <PasswordPromptModal
        isOpen={showPasswordPrompt}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
        title="Unlock Vault"
      />

      {/* Cloud Sync Manager */}
      {showSyncManager && (
        <SyncManager
          userData={user}
          onSuccess={handleSyncSuccess}
          onCancel={() => setShowSyncManager(false)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer 
        toasts={toasts} 
        onHideToast={hideToast} 
      />
    </div>
  );
};

export default DashboardPage;