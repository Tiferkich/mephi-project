import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Key, Check, AlertTriangle } from 'lucide-react';
import 'boxicons/css/boxicons.min.css';
import './SetupPage.css';
import './SettingsPage.css';
import { createBackup } from '../services/backupService';
import { authService } from '../services/authService';

const BACKUP_STEPS = [
  { id: 1, title: 'Имя файла', icon: FileText },
  { id: 2, title: 'Мастер-пароль', icon: Key },
  { id: 3, title: 'Готово', icon: Check },
];

const HISTORY_KEY = 'vaultBackupHistory';

const MAX_HISTORY = 20;

function defaultBackupFileName() {
  return `vault-backup-${new Date().toISOString().slice(0, 10)}.vault`;
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeHistoryItem(entry) {
  const list = [entry, ...readHistory().filter(
    h => h.path !== entry.path
  )].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

const SettingsPage = ({
  user,
  remoteStatus,
  syncLoading,
  onBack,
  onSync,
  onForceSync,
  onOpenSyncManager,
  getSyncIconClass,
  getSyncButtonText,
  showSuccess,
  showError,
  onUserDataChange,
  onAccountDeleted,
  currentMasterPassword = null,
  initialSection = 'backup',
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [currentStep, setCurrentStep] = useState(1);
  const [backupFileName, setBackupFileName] = useState(() => defaultBackupFileName());
  const [masterPassword, setMasterPassword] = useState('');
  const [useSamePassword, setUseSamePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState('');
  const [history, setHistory] = useState(() => readHistory());
  const [newDisplayName, setNewDisplayName] = useState(user?.username || '');
  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const isConnected = useMemo(
    () => remoteStatus.hasRemoteAccount && remoteStatus.tokenValid,
    [remoteStatus.hasRemoteAccount, remoteStatus.tokenValid]
  );

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (user?.username) {
      setNewDisplayName(user.username);
    }
  }, [user?.username]);

  const handleStepClick = (stepId) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const goNext = () => {
    if (currentStep === 1) {
      if (!backupFileName.trim()) {
        showError?.('Введите имя файла');
        return;
      }
      setCurrentStep(2);
    }
  };

  const resetBackupFlow = useCallback(() => {
    setCurrentStep(1);
    setMasterPassword('');
    setUseSamePassword(false);
    setBackupFileName(defaultBackupFileName());
    setLastSavedPath('');
  }, []);

  const runCreateBackup = async () => {
    const effectivePassword = useSamePassword && currentMasterPassword
      ? currentMasterPassword
      : masterPassword;
    if (!effectivePassword.trim()) {
      showError?.('Введите мастер-пароль');
      return;
    }
    setBackupLoading(true);
    try {
      const result = await createBackup(effectivePassword, backupFileName);
      if (!result) {
        return;
      }
      if (result.canceled) {
        return;
      }
      if (!result.success) {
        showError?.(result.error || 'Ошибка резервного копирования');
        return;
      }
      const path = result.filePath;
      const fname = result.filename || path?.split(/[/\\]/).pop() || 'backup.vault';
      setLastSavedPath(path);
      setCurrentStep(3);
      setMasterPassword('');
      writeHistoryItem({
        path,
        filename: fname,
        date: new Date().toISOString(),
      });
      setHistory(readHistory());
      showSuccess?.('Резервная копия создана: ' + path);
    } catch (err) {
      showError?.(err.message || 'Ошибка');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleChangeUsername = async () => {
    const trimmed = (newDisplayName || '').trim();
    if (trimmed.length < 3) {
      showError?.('Имя пользователя: от 3 до 50 символов');
      return;
    }
    if (trimmed === (user?.username || '')) {
      showError?.('Введите другое имя, отличное от текущего');
      return;
    }
    if (!accountPassword.trim()) {
      showError?.('Введите мастер-пароль');
      return;
    }
    setAccountBusy(true);
    try {
      const data = await authService.updateUsername(trimmed, accountPassword);
      onUserDataChange?.({ username: data.username, userId: data.userId });
      setAccountPassword('');
      showSuccess?.('Имя пользователя обновлено. Новый токен сохранён.');
    } catch (err) {
      console.error('updateUsername', err);
      showError?.(err.message || 'Не удалось сменить имя');
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'УДАЛИТЬ') {
      showError?.('В поле подтверждения введите слово УДАЛИТЬ заглавными буквами');
      return;
    }
    if (!deletePassword.trim()) {
      showError?.('Введите мастер-пароль');
      return;
    }
    if (!window.confirm('Удалить локальный аккаунт безвозвратно? Все данные в этом сейфе будут стёрты.')) {
      return;
    }
    setDeleteBusy(true);
    try {
      await authService.deleteAccount(deletePassword);
      if (onAccountDeleted) {
        await onAccountDeleted();
      } else {
        authService.logout();
        window.location.reload();
      }
      setDeletePassword('');
      setDeleteConfirm('');
    } catch (err) {
      console.error('deleteAccount', err);
      showError?.(err.message || 'Не удалось удалить аккаунт');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleShowInFolder = async (p) => {
    if (window.electronAPI?.shell?.showItem) {
      const r = await window.electronAPI.shell.showItem(p);
      if (!r?.success) {
        showError?.(r?.error || 'Не удалось открыть');
      }
    } else {
      showError?.('Доступно только в десктопном приложении');
    }
  };

  const btnPrimary = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    background: 'var(--color-info)',
    border: 'none',
    borderRadius: 'var(--border-radius-md)',
    color: 'white',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
  };

  const btnOutline = (color = 'var(--border-color)', textColor = 'var(--text-secondary)') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    background: 'none',
    border: `1px solid ${color}`,
    borderRadius: 'var(--border-radius-md)',
    color: textColor,
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
  });

  const labelStyle = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--spacing-xs)',
    display: 'block',
  };

  const renderBackupStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div className="step-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <FileText size={40} className="step-icon" style={{ color: 'var(--color-info)' }} />
            <h2>Имя файла</h2>
            <p>Расширение .vault будет добавлено автоматически, если его нет</p>
            <input
              type="text"
              value={backupFileName}
              onChange={e => setBackupFileName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goNext()}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--text-primary)',
                marginTop: 'var(--spacing-md)',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <button className="btn-primary" type="button" onClick={goNext}>
                Далее
              </button>
            </div>
          </motion.div>
        );
      case 2: {
        const vaultUnlocked = !!currentMasterPassword;
        const passwordDisabled = useSamePassword && vaultUnlocked;
        return (
          <motion.div className="step-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Key size={40} className="step-icon" style={{ color: 'var(--color-warning)' }} />
            <h2>Мастер-пароль</h2>
            <p style={{ maxWidth: 420, margin: '0 auto var(--spacing-md)' }}>
              Этим паролем будет зашифрован файл резервной копии.
              При восстановлении нужно будет ввести <strong>тот же самый</strong> пароль.
            </p>

            {vaultUnlocked && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                maxWidth: 400, margin: '0 auto var(--spacing-md)',
                cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)',
              }}>
                <input
                  type="checkbox"
                  checked={useSamePassword}
                  onChange={e => setUseSamePassword(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                Использовать текущий мастер-пароль (не вводить повторно)
              </label>
            )}

            {!passwordDisabled && (
              <div style={{ position: 'relative', maxWidth: '400px', margin: 'var(--spacing-md) auto' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !backupLoading && runCreateBackup()}
                  placeholder="Мастер-пароль"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)', color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                  }}
                >{showPassword ? '🙈' : '👁'}</button>
              </div>
            )}

            {passwordDisabled && (
              <p style={{
                maxWidth: 400, margin: 'var(--spacing-md) auto',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'rgba(34,197,94,0.08)', border: '1px solid var(--color-success)',
                borderRadius: 'var(--border-radius-md)', color: 'var(--color-success)',
                fontSize: 'var(--font-size-sm)', textAlign: 'center',
              }}>
                Будет использован текущий мастер-пароль — перешифрование не требуется
              </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-primary" type="button" onClick={runCreateBackup} disabled={backupLoading}>
                {backupLoading ? 'Сохранение...' : 'Создать копию'}
              </button>
            </div>
          </motion.div>
        );
      }
      case 3:
        return (
          <motion.div className="step-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Check size={40} className="step-icon" style={{ color: 'var(--color-success)' }} />
            <h2>Готово</h2>
            <p style={{ wordBreak: 'break-all', textAlign: 'left', maxWidth: '480px' }}>
              Файл сохранён: <code style={{ color: 'var(--color-info)' }}>{lastSavedPath}</code>
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button className="btn-primary" type="button" onClick={resetBackupFlow}>
                Создать ещё одну
              </button>
              {lastSavedPath && (
                <button
                  type="button"
                  onClick={() => handleShowInFolder(lastSavedPath)}
                  style={btnOutline('var(--color-info)', 'var(--color-info)')}
                >
                  Показать в папке
                </button>
              )}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page__row">
        <div className="settings-page__nav-wrap">
          <nav className="settings-page__nav-card" aria-label="Разделы настроек">
            <button type="button" onClick={onBack} className="settings-page__back">
              <i className="bx bx-arrow-back" style={{ fontSize: '16px' }} />
              Назад
            </button>
            <p className="settings-page__label">Меню</p>
            <ul className="settings-page__nav-list">
              <li>
                <button
                  type="button"
                  className={`settings-page__nav-item${activeSection === 'backup' ? ' settings-page__nav-item--active' : ''}`}
                  onClick={() => setActiveSection('backup')}
                >
                  <i className="settings-page__nav-item-icon bx bx-download" />
                  <span>Резервная копия</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`settings-page__nav-item${activeSection === 'account' ? ' settings-page__nav-item--active' : ''}`}
                  onClick={() => setActiveSection('account')}
                >
                  <i className="settings-page__nav-item-icon bx bx-user" />
                  <span>Аккаунт</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`settings-page__nav-item${activeSection === 'sync' ? ' settings-page__nav-item--active' : ''}`}
                  onClick={() => setActiveSection('sync')}
                >
                  <i className="settings-page__nav-item-icon bx bx-cloud" />
                  <span>Удал. синхронизация</span>
                </button>
              </li>
            </ul>
            {user?.username && (
              <div className="settings-page__user">
                {user.username}
              </div>
            )}
          </nav>
        </div>

        <main className="settings-page__main">
        {activeSection === 'backup' && (
          <div>
            <h1 className="settings-page__title">
              <i className="bx bx-download settings-page__title-icon" />
              Резервная копия
            </h1>

            <div className="settings-page__stepper">
            <div className="setup-container">
              <div className="setup-steps" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
                {BACKUP_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const isClickable = isCompleted;
                  return (
                    <div
                      key={step.id}
                      className={`setup-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                      onClick={() => isClickable && handleStepClick(step.id)}
                      style={{ cursor: isClickable ? 'pointer' : 'default' }}
                    >
                      <div className="step-indicator">
                        <Icon size={20} />
                      </div>
                      <span className="step-title">{step.title}</span>
                      {index < BACKUP_STEPS.length - 1 && <div className="step-connector" />}
                    </div>
                  );
                })}
              </div>
              <div className="setup-content">{renderBackupStep()}</div>
            </div>
            </div>

            <h3 style={{ margin: 'var(--spacing-2xl) 0 var(--spacing-md)', fontSize: 'var(--font-size-md)' }}>Сохранённые копии</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Пока нет — после создания бэкап появится здесь</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '640px' }}>
                {history.map((h) => (
                  <li
                    key={h.path + h.date}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 'var(--spacing-sm)',
                      padding: 'var(--spacing-md)',
                      marginBottom: 'var(--spacing-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    <i className="bx bx-file" style={{ color: 'var(--color-info)' }} />
                    <span style={{ fontWeight: 600, flex: '1 1 160px' }}>{h.filename}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {new Date(h.date).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      style={btnOutline('var(--color-info)', 'var(--color-info)')}
                      onClick={() => handleShowInFolder(h.path)}
                    >
                      <i className="bx bx-folder-open" style={{ fontSize: '14px' }} />
                      Показать в папке
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeSection === 'account' && (
          <div>
            <h1 className="settings-page__title">
              <i className="bx bx-user settings-page__title-icon" style={{ fontSize: '24px' }} />
              Аккаунт
            </h1>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 'var(--spacing-xl)',
                maxWidth: '640px',
                marginBottom: 'var(--spacing-2xl)',
              }}
            >
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>Имя пользователя</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-md)' }}>
                Сейчас: <strong style={{ color: 'var(--text-primary)' }}>{user?.username || '—'}</strong>
                . ID сейфа (для ключа шифрования) не меняется.
              </p>
              <span style={labelStyle}>Новое имя</span>
              <input
                type="text"
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  boxSizing: 'border-box',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-md)',
                }}
              />
              <span style={labelStyle}>Мастер-пароль (подтверждение)</span>
              <div style={{ position: 'relative', maxWidth: '400px' }}>
                <input
                  type={showAccountPassword ? 'text' : 'password'}
                  value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !accountBusy && handleChangeUsername()}
                  autoComplete="current-password"
                  placeholder="Мастер-пароль"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-lg)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '25%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >{showAccountPassword ? '🙈' : '👁'}</button>
              </div>
              <button
                type="button"
                onClick={handleChangeUsername}
                disabled={accountBusy}
                style={btnPrimary}
              >
                {accountBusy ? 'Сохранение...' : 'Сохранить имя'}
              </button>
            </div>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 'var(--spacing-xl)',
                maxWidth: '640px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                <AlertTriangle size={22} style={{ color: 'var(--color-danger, #ef4444)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--color-danger, #b91c1c)' }}>Опасная зона</h2>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-md)' }}>
                Безвозвратно удаляются учётная запись на локальном сервере, все пароли, заметки, файлы сейфа. Эта операция не трогает копии в облаке, если вы их успели выгрузить.
              </p>
              <span style={labelStyle}>Мастер-пароль</span>
              <div style={{ position: 'relative', maxWidth: '400px' }}>
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Мастер-пароль"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-md)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '25%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >{showDeletePassword ? '🙈' : '👁'}</button>
              </div>
              <span style={labelStyle}>
                Подтвердите, введя слово: <code style={{ color: 'var(--text-primary)' }}>УДАЛИТЬ</code>
              </span>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  boxSizing: 'border-box',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-lg)',
                }}
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteBusy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm) var(--spacing-lg)',
                  background: 'var(--color-danger, #b91c1c)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'white',
                  cursor: deleteBusy ? 'not-allowed' : 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  opacity: deleteBusy ? 0.7 : 1,
                }}
              >
                {deleteBusy ? 'Удаление...' : 'Удалить локальный аккаунт'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'sync' && (
          <div>
            <h1 className="settings-page__title">
              <i className="bx bx-cloud settings-page__title-icon" style={{ fontSize: '22px' }} />
              Удалённая синхронизация
            </h1>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 'var(--spacing-xl)',
                maxWidth: '640px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-lg)',
                  paddingBottom: 'var(--spacing-md)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <i
                  className={`bx ${getSyncIconClass()}`}
                  style={{ fontSize: '22px', color: remoteStatus.remoteServerAvailable ? 'var(--color-success)' : 'var(--text-secondary)', marginRight: '8px' }}
                />
                <h2 style={{ margin: 0, flex: 1, fontSize: 'var(--font-size-lg)' }}>Статус</h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--font-size-xs)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: isConnected
                      ? 'rgba(34,197,94,0.12)'
                      : !remoteStatus.remoteServerAvailable
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(45,100,190,0.15)',
                    color: isConnected
                      ? 'var(--color-success)'
                      : !remoteStatus.remoteServerAvailable
                        ? 'var(--color-danger)'
                        : 'var(--color-info)',
                  }}
                >
                  {isConnected ? 'Подключено' : !remoteStatus.remoteServerAvailable ? 'Сервер недоступен' : 'Готов к подключению'}
                </span>
              </div>

              {isConnected && (
                <div
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--border-radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    fontSize: 'var(--font-size-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    color: (remoteStatus.unsyncedNotes > 0 || remoteStatus.unsyncedPasswords > 0) ? 'var(--color-warning)' : 'var(--color-success)',
                  }}
                >
                  {remoteStatus.unsyncedNotes > 0 || remoteStatus.unsyncedPasswords > 0
                    ? `Не синхронизировано: ${remoteStatus.unsyncedNotes || 0} заметок, ${remoteStatus.unsyncedPasswords || 0} паролей`
                    : 'Все данные синхронизированы'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-xl)' }}>
                <button
                  type="button"
                  onClick={onSync}
                  disabled={syncLoading || !isConnected}
                  style={{
                    ...btnPrimary,
                    background: isConnected ? 'var(--color-success)' : 'var(--bg-tertiary)',
                    color: isConnected ? 'white' : 'var(--text-secondary)',
                    cursor: isConnected && !syncLoading ? 'pointer' : 'not-allowed',
                    opacity: syncLoading ? 0.7 : 1,
                  }}
                >
                  {syncLoading ? 'Синхронизация...' : getSyncButtonText?.() || 'Sync Now'}
                </button>
                {isConnected && (
                  <button type="button" onClick={onForceSync} disabled={syncLoading} style={btnOutline('var(--color-warning)', 'var(--color-warning)')}>
                    Принудительная синхронизация
                  </button>
                )}
              </div>

              <div>
                <span style={labelStyle}>Расширенные настройки облака</span>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-md)' }}>
                  Подключение к удалённому серверу, учётные данные и детальная настройка синхронизации.
                </p>
                <button type="button" style={btnOutline('var(--color-info)', 'var(--color-info)')} onClick={onOpenSyncManager}>
                  <i className="bx bx-cog" style={{ fontSize: '14px' }} />
                  Открыть Cloud Sync Manager
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </div>
  );
};

export default SettingsPage;
