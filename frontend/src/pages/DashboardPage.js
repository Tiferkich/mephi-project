import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import 'boxicons/css/boxicons.min.css';
import { remoteService, syncService, authService, passwordService, noteService } from '../services/authService';
import { secureService } from '../services/secureService';
import widgetService from '../services/widgetService';
import PasswordForm from '../components/PasswordForm';
import NoteForm from '../components/NoteForm';
import PasswordList from '../components/PasswordList';
import NoteList from '../components/NoteList';
import ToastContainer from '../components/ToastContainer';
import PasswordPromptModal from '../components/PasswordPromptModal';
import SyncManager from '../components/SyncManager';
import FileManager from '../components/FileManager';
import Widget from '../components/Widget';
import WidgetGrid from '../components/WidgetGrid';
import CreateWidgetModal from '../components/CreateWidgetModal';
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

  // File Manager state
  const [showFileManager, setShowFileManager] = useState(false);
  const [masterPassword, setMasterPassword] = useState(null);

  // Widget system state
  const [widgets, setWidgets] = useState([]);
  const [showCreateWidgetModal, setShowCreateWidgetModal] = useState(false);

  // Toast system
  const { toasts, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
    // Load widgets configuration
    setWidgets(widgetService.getWidgets());
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

  // Current widget for adding items
  const [currentWidgetId, setCurrentWidgetId] = useState(null);

  // Password handlers
  const handleAddPassword = () => {
    if (isLocked) return;
    setEditingPassword(null);
    setCurrentWidgetId(null);
    setShowPasswordForm(true);
  };

  const handleAddPasswordToWidget = (widgetId) => {
    if (isLocked) return;
    setEditingPassword(null);
    setCurrentWidgetId(widgetId);
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
    setCurrentWidgetId(null);
    setShowNoteForm(true);
  };

  const handleAddNoteToWidget = (widgetId) => {
    if (isLocked) return;
    setEditingNote(null);
    setCurrentWidgetId(widgetId);
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
        setMasterPassword(null); // Очищаем мастер-пароль
        setIsLocked(true);
        
        // Закрываем открытые модальные окна
        setShowPasswordForm(false);
        setShowNoteForm(false);
        setShowFileManager(false);
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
      
      // Сохраняем мастер-пароль для FileManager (используется для ГОСТ шифрования файлов)
      setMasterPassword(password);
      
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

  // Widget handlers
  const handleCreateWidget = (widgetData) => {
    const newWidget = widgetService.createWidget(widgetData.type, widgetData.title);
    setWidgets(widgetService.getWidgets());
    showSuccess(`Widget "${widgetData.title}" created!`);
  };

  const handleDeleteWidget = (widgetId) => {
    if (!window.confirm('Are you sure you want to delete this widget?')) return;
    widgetService.deleteWidget(widgetId);
    setWidgets(widgetService.getWidgets());
    showInfo('Widget deleted');
  };

  const handleWidgetTitleChange = (widgetId, newTitle) => {
    widgetService.updateWidget(widgetId, { title: newTitle });
    setWidgets(widgetService.getWidgets());
  };

  const handleReorderWidgets = (newOrder) => {
    widgetService.reorderWidgets(newOrder);
    setWidgets(newOrder);
  };

  const handleToggleWidgetCollapse = (widgetId) => {
    widgetService.toggleWidgetCollapse(widgetId);
    setWidgets(widgetService.getWidgets());
  };

  const handleWidgetResize = (widgetId, width, height) => {
    widgetService.updateWidgetSize(widgetId, width, height);
    setWidgets(widgetService.getWidgets());
  };

  // Render widget content based on type
  const renderWidgetContent = (widget) => {
    switch (widget.type) {
      case 'passwords':
        return (
          <>
            <PasswordList
              passwords={passwords.filter(p => !p.widgetId || p.widgetId === widget.id)}
              onEdit={handleEditPassword}
              onDelete={handleDeletePassword}
              loading={passwordsLoading}
              compact
            />
            <button 
              className="widget__add-btn"
              onClick={() => handleAddPasswordToWidget(widget.id)}
              disabled={isLocked}
            >
              <i className='bx bx-plus'></i>
              Add Password
            </button>
          </>
        );
      case 'notes':
        return (
          <>
            <NoteList
              notes={notes.filter(n => !n.widgetId || n.widgetId === widget.id)}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              loading={notesLoading}
              compact
            />
            <button 
              className="widget__add-btn"
              onClick={() => handleAddNoteToWidget(widget.id)}
              disabled={isLocked}
            >
              <i className='bx bx-plus'></i>
              Add Note
            </button>
          </>
        );
      case 'files':
        return (
          <FileManager 
            widgetId={widget.id}
            isUnlocked={!isLocked}
            masterPassword={masterPassword}
            isOnline={remoteStatus.hasRemoteAccount && remoteStatus.tokenValid}
            compact
          />
        );
      default:
        return <div className="widget__empty">Unknown widget type</div>;
    }
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

  const getSyncIconClass = () => {
    if (!remoteStatus.remoteServerAvailable) return 'bx-cloud-off';
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) return 'bx-cloud';
    return 'bx-refresh';
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
          <i className='bx bxs-shield-alt-2' style={{ 
            fontSize: '32px',
            color: 'var(--color-success)',
            filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.3))'
          }}></i>
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
            <i className={`bx ${isLocked ? 'bx-lock-alt' : 'bx-lock-open-alt'}`} style={{ fontSize: '16px' }}></i>
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
            <i className='bx bx-cog' style={{ fontSize: '16px' }}></i>
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
            <i className='bx bx-log-out' style={{ fontSize: '16px' }}></i>
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
            <i className='bx bx-key' style={{ color: 'var(--color-info)', marginRight: 'var(--spacing-sm)', fontSize: '24px' }}></i>
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
            <i className='bx bx-file' style={{ color: 'var(--color-warning)', marginRight: 'var(--spacing-sm)', fontSize: '24px' }}></i>
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
            <i className={`bx ${getSyncIconClass()}`} style={{ 
              color: remoteStatus.remoteServerAvailable ? 'var(--color-success)' : 'var(--text-secondary)', 
              marginRight: 'var(--spacing-sm)',
              fontSize: '24px'
            }}></i>
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
                      <i className='bx bx-check-circle' style={{ color: 'var(--color-success)', fontSize: '14px' }}></i>
                      <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <i className='bx bx-error-circle' style={{ color: 'var(--color-warning)', fontSize: '14px' }}></i>
                      <span style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
                        Disconnected
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <i className='bx bx-devices' style={{ color: 'var(--color-info)', fontSize: '14px' }}></i>
                    <span style={{ color: 'var(--color-info)', fontSize: 'var(--font-size-sm)' }}>
                      Ready to connect
                    </span>
                  </>
                )
              ) : (
                <>
                  <i className='bx bx-wifi-off' style={{ color: 'var(--color-danger)', fontSize: '14px' }}></i>
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
                    <i className='bx bx-error-circle' style={{ color: 'var(--color-warning)', fontSize: '12px' }}></i>
                    <span>
                      {remoteStatus.unsyncedNotes || 0} notes, {remoteStatus.unsyncedPasswords || 0} passwords unsynced
                    </span>
                  </>
                ) : (
                  <>
                    <i className='bx bx-check-circle' style={{ color: 'var(--color-success)', fontSize: '12px' }}></i>
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
              <motion.i
                className='bx bx-refresh'
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}
              />
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
              <i className='bx bx-bolt' style={{ fontSize: '12px' }}></i>
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
            <i className='bx bx-cloud' style={{ fontSize: '14px' }}></i>
            Cloud Sync Manager
          </button>
        </motion.div>
      </div>

      {/* Widgets Section */}
      {!isLocked && (
        <WidgetGrid
          widgets={widgets}
          onReorder={handleReorderWidgets}
          onCreateWidget={() => setShowCreateWidgetModal(true)}
        >
          {widgets.map((widget) => (
            <Widget
              key={widget.id}
              id={widget.id}
              title={widget.title}
              type={widget.type}
              collapsed={widget.collapsed}
              width={widget.width}
              height={widget.height}
              onTitleChange={handleWidgetTitleChange}
              onDelete={handleDeleteWidget}
              onToggleCollapse={() => handleToggleWidgetCollapse(widget.id)}
              onResize={handleWidgetResize}
            >
              {renderWidgetContent(widget)}
            </Widget>
          ))}
        </WidgetGrid>
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
          <i className='bx bx-lock-alt' style={{ fontSize: '48px', color: 'var(--color-warning)', marginBottom: 'var(--spacing-md)', display: 'block' }}></i>
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

      {/* Create Widget Modal */}
      <CreateWidgetModal
        isOpen={showCreateWidgetModal}
        onClose={() => setShowCreateWidgetModal(false)}
        onCreate={handleCreateWidget}
      />

      {/* Toast Container */}
      <ToastContainer 
        toasts={toasts} 
        onHideToast={hideToast} 
      />
    </div>
  );
};

export default DashboardPage;