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
  Unlock,
  CheckCircle,
  AlertCircle,
  Smartphone,
  WifiOff,
  Zap
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
  
  // ✅ ДОБАВЛЯЕМ: Состояние для расширенных опций синхронизации
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);

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
        loadNotes(),
        loadRemoteStatus()
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

  // ✅ НОВАЯ ФУНКЦИЯ: Загрузка статуса синхронизации
  const loadRemoteStatus = async () => {
    try {
      console.log('🔄 Loading remote sync status...');
      const status = await remoteService.getStatus();
      console.log('✅ Remote status loaded:', status);
      setRemoteStatus(status);
    } catch (error) {
      console.error('❌ Failed to load remote status:', error);
      // Оставляем значения по умолчанию при ошибке
      setRemoteStatus({
        hasRemoteAccount: false,
        remoteServerAvailable: false,
        tokenValid: false,
        canSync: false,
        message: 'Failed to check remote status'
      });
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
      showInfo('Starting data synchronization...');
      
      // ✅ REAL SYNC: Push local changes to remote server
      showInfo('📤 Pushing local changes to cloud...');
      const pushResult = await syncService.pushToRemote({
        syncNotes: true,
        syncPasswords: true,
        forceSync: false
      });
      
      console.log('Push result:', pushResult);
      
      if (pushResult.success) {
        const pushedItems = [];
        if (pushResult.notesPushed > 0) pushedItems.push(`${pushResult.notesPushed} notes`);
        if (pushResult.passwordsPushed > 0) pushedItems.push(`${pushResult.passwordsPushed} passwords`);
        
        if (pushedItems.length > 0) {
          showInfo(`✅ Pushed ${pushedItems.join(' and ')} to cloud`);
        }
      }
      
      // ✅ REAL SYNC: Pull remote changes to local storage
      showInfo('📥 Pulling cloud changes to local storage...');
      const pullResult = await syncService.pullFromRemote();
      
      console.log('Pull result:', pullResult);
      
      if (pullResult.success) {
        const pulledItems = [];
        if (pullResult.notesPulled > 0) pulledItems.push(`${pullResult.notesPulled} notes`);
        if (pullResult.passwordsPulled > 0) pulledItems.push(`${pullResult.passwordsPulled} passwords`);
        
        if (pulledItems.length > 0) {
          showInfo(`📥 Pulled ${pulledItems.join(' and ')} from cloud`);
        }
      }
      
      // ✅ Show final success message
      const totalPushed = (pushResult.notesPushed || 0) + (pushResult.passwordsPushed || 0);
      const totalPulled = (pullResult.notesPulled || 0) + (pullResult.passwordsPulled || 0);
      
      if (totalPushed === 0 && totalPulled === 0) {
        showSuccess('✅ Sync completed - Everything is already up to date!');
      } else {
        const changes = [];
        if (totalPushed > 0) changes.push(`${totalPushed} items uploaded`);
        if (totalPulled > 0) changes.push(`${totalPulled} items downloaded`);
        showSuccess(`✅ Sync completed successfully! ${changes.join(', ')}`);
      }
      
      // ✅ Reload data after sync to show any changes
      await Promise.all([loadPasswords(), loadNotes()]);
      
      // ✅ Update sync status to reflect any changes
      await loadRemoteStatus();
      
    } catch (error) {
      console.error('Sync failed:', error);
      showError(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Force Sync - принудительная синхронизация
  const handleForceSync = async () => {
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) {
      showWarning('Please setup cloud sync first using Cloud Sync Manager');
      return;
    }

    // Подтверждение принудительной синхронизации
    if (!confirm('⚠️ Force sync will overwrite any conflicting data with cloud version. Continue?')) {
      return;
    }

    setSyncLoading(true);
    try {
      showWarning('⚡ Starting force synchronization...');
      
      // Force push with conflict resolution
      showInfo('📤 Force pushing all local data to cloud...');
      const pushResult = await syncService.pushToRemote({
        syncNotes: true,
        syncPasswords: true,
        forceSync: true // This will overwrite remote conflicts
      });
      
      console.log('Force push result:', pushResult);
      
      // Force pull all remote data
      showInfo('📥 Force pulling all cloud data to local...');
      const pullResult = await syncService.pullFromRemote();
      
      console.log('Force pull result:', pullResult);
      
      // Show comprehensive results
      const totalPushed = (pushResult.notesPushed || 0) + (pushResult.passwordsPushed || 0);
      const totalPulled = (pullResult.notesPulled || 0) + (pullResult.passwordsPulled || 0);
      
      showSuccess(`⚡ Force sync completed! Pushed: ${totalPushed}, Pulled: ${totalPulled} items`);
      
      // ✅ Reload data after force sync
      await Promise.all([loadPasswords(), loadNotes()]);
      
      // ✅ Update sync status
      await loadRemoteStatus();
      
    } catch (error) {
      console.error('Force sync failed:', error);
      showError(`❌ Force sync failed: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // ✅ НОВЫЕ ФУНКЦИИ: Селективная синхронизация
  const handleSyncPasswords = async () => {
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) {
      showWarning('Please setup cloud sync first');
      return;
    }

    setSyncLoading(true);
    try {
      showInfo('🔑 Syncing passwords only...');
      
      const pushResult = await syncService.pushToRemote({
        syncNotes: false,
        syncPasswords: true,
        forceSync: false
      });
      
      const pullResult = await syncService.pullFromRemote();
      
      showSuccess(`🔑 Password sync completed! Pushed: ${pushResult.passwordsPushed || 0}, Pulled: ${pullResult.passwordsPulled || 0}`);
      
      await Promise.all([loadPasswords(), loadRemoteStatus()]);
      
    } catch (error) {
      showError(`❌ Password sync failed: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncNotes = async () => {
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) {
      showWarning('Please setup cloud sync first');
      return;
    }

    setSyncLoading(true);
    try {
      showInfo('📝 Syncing notes only...');
      
      const pushResult = await syncService.pushToRemote({
        syncNotes: true,
        syncPasswords: false,
        forceSync: false
      });
      
      const pullResult = await syncService.pullFromRemote();
      
      showSuccess(`📝 Notes sync completed! Pushed: ${pushResult.notesPushed || 0}, Pulled: ${pullResult.notesPulled || 0}`);
      
      await Promise.all([loadNotes(), loadRemoteStatus()]);
      
    } catch (error) {
      showError(`❌ Notes sync failed: ${error.message}`);
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
        showSuccess('Cloud sync setup completed successfully!');
        
        // ✅ ОБНОВЛЯЕМ: Загружаем актуальный статус из API
        loadRemoteStatus();
        
        // ✅ НОВОЕ: Показываем предупреждение если было передано
        if (result.warning) {
          setTimeout(() => {
            showWarning(result.warning);
          }, 2000); // Показываем через 2 секунды после успешного сообщения
        }
        break;
        
      case 'account_recovery':
        // Полное восстановление аккаунта
        showSuccess('Account recovered successfully! All your data has been restored.');
        
        // ✅ ОБНОВЛЯЕМ: Загружаем актуальный статус из API
        loadRemoteStatus();
        
        // Перезагружаем данные
        loadPasswords();
        loadNotes();
        break;
        
      case 'account_replaced':
        // ✅ ИСПРАВЛЕНИЕ: Аккаунт был полностью заменен - нужно перезагрузить приложение
        showSuccess(result.message || 'Account replaced successfully! Your local account has been replaced with the cloud account.');
        
        // Обновляем токен авторизации
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // Перезагружаем страницу для полного обновления состояния
        setTimeout(() => {
          window.location.reload();
        }, 3000); // Даем пользователю время прочитать сообщение
        break;
        
      case 'account_imported':
        // ✅ НОВОЕ: Новый аккаунт был импортирован из облака (первый раз)
        showSuccess(result.message || 'Cloud account imported successfully!');
        
        // ✅ ОБНОВЛЯЕМ: Загружаем актуальный статус из API
        loadRemoteStatus();
        
        // Обновляем токен авторизации
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // Перезагружаем данные
        loadPasswords();
        loadNotes();
        break;
        
      case 'remote_connected':
        // Удаленный аккаунт подключен к локальному
        showSuccess(result.message || 'Remote account connected! Click "Sync Now" to synchronize your data.');
        
        // ✅ ОБНОВЛЯЕМ: Загружаем актуальный статус из API
        loadRemoteStatus();
        
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
        
      default:
        // Обработка устаревших или неизвестных типов ответов
        showSuccess(result.message || 'Operation completed successfully!');
        
        // Если есть токен, обновляем его
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // ✅ ОБНОВЛЯЕМ: Загружаем актуальный статус из API
        loadRemoteStatus();
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-primary)',
                margin: 0,
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Status:
              </p>
              {remoteStatus.remoteServerAvailable ? (
                remoteStatus.hasRemoteAccount ? (
                  remoteStatus.tokenValid ? (
                    <>
                      <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />
                      <span style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
                        Disconnected
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <Smartphone size={14} style={{ color: 'var(--color-info)' }} />
                    <span style={{ color: 'var(--color-info)', fontSize: 'var(--font-size-sm)' }}>
                      Ready to connect
                    </span>
                  </>
                )
              ) : (
                <>
                  <WifiOff size={14} style={{ color: 'var(--color-danger)' }} />
                  <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                    Server offline
                  </span>
                </>
              )}
            </div>
            
            {/* Show unsynced count only if connected */}
            {remoteStatus.hasRemoteAccount && remoteStatus.tokenValid && (
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                {remoteStatus.unsyncedNotes > 0 || remoteStatus.unsyncedPasswords > 0 ? (
                  <>
                    <AlertCircle size={12} style={{ color: 'var(--color-warning)' }} />
                    <span>
                      {remoteStatus.unsyncedNotes || 0} notes, {remoteStatus.unsyncedPasswords || 0} passwords unsynced
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                    <span style={{ color: 'var(--color-success)' }}>
                      All data synchronized
                    </span>
                  </>
                )}
              </div>
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
              marginBottom: 'var(--spacing-xs)'
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

          {/* Force Sync - only show if connected */}
          {remoteStatus.hasRemoteAccount && remoteStatus.tokenValid && (
            <button
              onClick={() => handleForceSync()}
              disabled={syncLoading}
              style={{
                width: '100%',
                padding: 'var(--spacing-xs) var(--spacing-md)',
                background: 'none',
                color: 'var(--color-warning)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-xs)',
                marginBottom: 'var(--spacing-sm)',
                opacity: syncLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!syncLoading) {
                  e.target.style.background = 'var(--color-warning)';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!syncLoading) {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--color-warning)';
                }
              }}
              title="Force sync will overwrite conflicts with cloud data"
            >
              <Zap size={12} />
              Force Sync
            </button>
          )}

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
          
          {/* Advanced Sync - collapsed by default, cleaner design */}
          {remoteStatus.hasRemoteAccount && remoteStatus.tokenValid && (
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              <button
                onClick={() => setShowAdvancedSync(!showAdvancedSync)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: showAdvancedSync ? 'var(--spacing-xs)' : 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = 'var(--border-color-hover)';
                  e.target.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.color = 'var(--text-secondary)';
                }}
              >
                <Settings size={12} />
                {showAdvancedSync ? 'Hide Advanced' : 'Advanced Sync'}
              </button>
              
              {showAdvancedSync && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-xs)',
                    marginTop: 'var(--spacing-xs)'
                  }}
                >
                  <button
                    onClick={handleSyncPasswords}
                    disabled={syncLoading}
                    style={{
                      padding: 'var(--spacing-xs)',
                      background: 'var(--color-info)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      cursor: syncLoading ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      opacity: syncLoading ? 0.5 : 1,
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (!syncLoading) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!syncLoading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <Key size={10} />
                    Passwords
                  </button>
                  
                  <button
                    onClick={handleSyncNotes}
                    disabled={syncLoading}
                    style={{
                      padding: 'var(--spacing-xs)',
                      background: 'var(--color-warning)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      cursor: syncLoading ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      opacity: syncLoading ? 0.5 : 1,
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (!syncLoading) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!syncLoading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <FileText size={10} />
                    Notes
                  </button>
                </motion.div>
              )}
            </div>
          )}
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