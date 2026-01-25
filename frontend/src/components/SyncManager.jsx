import React, { useState, useEffect } from 'react';
import { Cloud, X, RefreshCw, CheckCircle, Smartphone, AlertCircle, WifiOff, Shield, Lock, Mail, Clock, Key, AlertTriangle } from 'lucide-react';
import SyncSetup from './SyncSetup';
import DataTransfer from './DataTransfer';
import { remoteService as authRemoteService } from '../services/authService';
import { remoteService } from '../services/remoteService';
import './SyncManager.css';

const SyncManager = ({ userData, onSuccess, onCancel }) => {
  const [activeView, setActiveView] = useState('menu'); // 'menu', 'sync', 'transfer'
  const [remoteStatus, setRemoteStatus] = useState({
    hasRemoteAccount: false,
    remoteServerAvailable: false,
    tokenValid: false,
    canSync: false
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [otpData, setOtpData] = useState(null);
  const [warning, setWarning] = useState('');

  // ✅ Пинг удаленного сервера при открытии
  useEffect(() => {
    checkRemoteStatus();
  }, []);

  const checkRemoteStatus = async () => {
    try {
      setStatusLoading(true);
      console.log('🔄 SyncManager: Checking remote status...');
      const status = await authRemoteService.getStatus();
      console.log('🔄 SyncManager: Remote status received:', status);
      setRemoteStatus(status);
    } catch (error) {
      console.error('SyncManager: Failed to check remote status:', error);
      setRemoteStatus({
        hasRemoteAccount: false,
        remoteServerAvailable: false,
        tokenValid: false,
        canSync: false
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSyncSetup = async (email, username) => {
    try {
      setSetupLoading(true);
      setSetupError('');
      
      console.log('🔄 Setting up sync for:', username, email);
      
      const result = await remoteService.setupSync({ username, email });
      
      if (result.success) {
        console.log('✅ Sync setup successful:', result);
        
        // ✅ НОВОЕ: Показываем предупреждение если email используется другим аккаунтом
        if (result.warning) {
          showWarning(result.warning);
        }
        
        if (result.otpRequired) {
          // Переходим к вводу OTP
          setActiveView('otp-verification');
          setOtpData({
            type: 'sync_setup',
            username: username,
            email: email,
            message: result.message
          });
        } else {
          // Синхронизация настроена без OTP
          onSuccess({ 
            type: 'sync_setup', 
            message: result.message,
            username: username 
          });
        }
      } else {
        setSetupError(result.error || 'Sync setup failed');
      }
      
    } catch (error) {
      console.error('❌ Sync setup failed:', error);
      setSetupError(error.message || 'Failed to setup sync');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleTransferSuccess = (transferData) => {
    onSuccess({
      type: 'device_transfer',
      ...transferData
    });
  };

  // ✅ Определяем статус на основе реальных данных из API, а не userData
  const hasRemoteSync = remoteStatus.hasRemoteAccount && remoteStatus.tokenValid;
  const isLocalUser = !hasRemoteSync;
  const needsRelogin = remoteStatus.hasRemoteAccount && !remoteStatus.tokenValid;

  // ✅ ДОБАВЛЯЕМ: функция для показа предупреждений
  const showWarning = (message) => {
    setWarning(message);
    setTimeout(() => setWarning(''), 5000); // Скрываем через 5 секунд
  };

  return (
    <>
      {activeView === 'menu' && (
        <div className="sync-manager-overlay">
          <div className="sync-manager-modal">
            <div className="sync-manager-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Cloud size={24} />
                Cloud Sync Manager
              </h2>
              <button 
                className="close-button" 
                onClick={onCancel}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sync-manager-content">
              {/* ✅ ДОБАВЛЯЕМ: Отображение предупреждений */}
              {warning && (
                <div className="warning-message">
                  <div className="warning-icon">
                    <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                  </div>
                  <div className="warning-text">{warning}</div>
                </div>
              )}
              
              <div className="sync-status">
                {statusLoading ? (
                  <div className="status-loading">
                    <div className="status-icon">
                      <RefreshCw size={32} className="animate-spin" />
                    </div>
                    <div className="status-text">
                      <h3>Checking Connection...</h3>
                      <p>Pinging remote server...</p>
                    </div>
                  </div>
                ) : hasRemoteSync ? (
                  <div className="status-connected">
                    <div className="status-icon">
                      <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
                    </div>
                    <div className="status-text">
                      <h3>Cloud Sync Active</h3>
                      <p>Your account is connected and syncing</p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <strong>Server:</strong> 
                        {remoteStatus.remoteServerAvailable ? (
                          <span style={{ color: 'var(--color-success)' }}>Online</span>
                        ) : (
                          <span style={{ color: 'var(--color-danger)' }}>Offline</span>
                        )}
                      </p>
                      {userData?.email && <p><strong>Email:</strong> {userData.email}</p>}
                    </div>
                  </div>
                ) : remoteStatus.remoteServerAvailable ? (
                  <div className="status-local">
                    <div className="status-icon">
                      <Smartphone size={32} style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <div className="status-text">
                      <h3>Local Account</h3>
                      <p>Your data is stored locally only</p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <strong>Server:</strong> 
                        <span style={{ color: 'var(--color-success)' }}>Online - Ready to sync</span>
                      </p>
                      <p>Connect to cloud sync for backup and multi-device access</p>
                    </div>
                  </div>
                ) : (
                  <div className="status-offline">
                    <div className="status-icon">
                      <WifiOff size={32} style={{ color: 'var(--color-danger)' }} />
                    </div>
                    <div className="status-text">
                      <h3>Server Offline</h3>
                      <p>Cannot connect to remote server</p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <strong>Server:</strong> 
                        <span style={{ color: 'var(--color-danger)' }}>Offline</span>
                      </p>
                      <p>Check your internet connection or try again later</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sync-options">
                {/* Показываем Cloud Login если токен истёк */}
                {needsRelogin && remoteStatus.remoteServerAvailable && (
                  <button 
                    className="sync-option-button setup-option"
                    onClick={() => setActiveView('cloud-login')}
                    style={{ borderColor: 'var(--color-warning)' }}
                  >
                    <div className="option-icon">
                      <AlertCircle size={32} style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <div className="option-content">
                      <h4>Cloud Login</h4>
                      <p>Your session expired. Re-authenticate to continue syncing</p>
                      <span className="option-badge" style={{ background: 'var(--color-warning)', color: '#000' }}>Session Expired</span>
                    </div>
                  </button>
                )}

                {isLocalUser && remoteStatus.remoteServerAvailable && !needsRelogin && (
                  <button 
                    className="sync-option-button setup-option"
                    onClick={() => setActiveView('sync')}
                  >
                    <div className="option-icon">
                      <RefreshCw size={32} style={{ color: 'var(--color-success)' }} />
                    </div>
                    <div className="option-content">
                      <h4>Setup Cloud Sync</h4>
                      <p>Connect your account to cloud backup and sync</p>
                      <span className="option-badge new">New</span>
                    </div>
                  </button>
                )}

                <button 
                  className="sync-option-button transfer-option"
                  onClick={() => setActiveView('transfer')}
                  disabled={!remoteStatus.remoteServerAvailable}
                >
                  <div className="option-icon">
                    <Smartphone size={32} style={{ color: 'var(--color-info)' }} />
                  </div>
                  <div className="option-content">
                    <h4>Device Transfer</h4>
                    <p>Generate token to transfer data to another device</p>
                    <span className="option-badge fast">5min</span>
                  </div>
                </button>
              </div>

              <div className="sync-info">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Shield size={20} />
                  Security Features
                </h4>
                <div className="security-features">
                  <div className="feature">
                    <span className="feature-icon">
                      <Lock size={16} style={{ color: 'var(--text-secondary)' }} />
                    </span>
                    <span>End-to-end encryption</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">
                      <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                    </span>
                    <span>Email verification</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">
                      <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                    </span>
                    <span>Time-limited tokens</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">
                      <Key size={16} style={{ color: 'var(--text-secondary)' }} />
                    </span>
                    <span>Zero-knowledge architecture</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'sync' && (
        <SyncSetup
          userData={userData}
          onSuccess={handleSyncSetup}
          onCancel={() => setActiveView('menu')}
        />
      )}

      {activeView === 'transfer' && (
        <DataTransfer
          onSuccess={handleTransferSuccess}
          onCancel={() => setActiveView('menu')}
        />
      )}

      {activeView === 'cloud-login' && (
        <CloudLoginForm
          userData={userData}
          onSuccess={(result) => {
            onSuccess({
              type: 'cloud_login',
              remoteToken: result.token,
              remoteId: result.userId,
              ...result
            });
          }}
          onCancel={() => setActiveView('menu')}
        />
      )}
    </>
  );
};

// ✅ Компонент для Cloud Login (переавторизации)
const CloudLoginForm = ({ userData, onSuccess, onCancel }) => {
  const [email, setEmail] = useState(userData?.email || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !username.trim()) {
      setError('Email и username обязательны');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await remoteService.cloudLogin({ email: email.trim(), username: username.trim() });
      
      if (result.requiresOTP) {
        setOtpStep(true);
        setMessage('OTP код отправлен на ваш email. Проверьте почту.');
      } else if (result.success) {
        onSuccess(result);
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err) {
      setError(err.message || 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Введите OTP код');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await remoteService.verifyCloudOTP({ otpCode: otpCode.trim(), username: username.trim() });
      
      if (result.success) {
        // Сохраняем токен
        localStorage.setItem('remoteToken', result.token);
        localStorage.setItem('remoteId', result.userId);
        onSuccess(result);
      } else {
        setError(result.error || 'Неверный OTP код');
      }
    } catch (err) {
      setError(err.message || 'Ошибка верификации OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sync-manager-overlay">
      <div className="sync-manager-modal">
        <div className="sync-manager-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Cloud size={24} />
            Cloud Login
          </h2>
          <button className="close-button" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="sync-manager-content">
          {error && (
            <div className="error-message" style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--color-danger-bg)', 
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <AlertCircle size={16} style={{ marginRight: '8px' }} />
              {error}
            </div>
          )}

          {message && (
            <div style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--color-success-bg)', 
              color: 'var(--color-success)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <CheckCircle size={16} style={{ marginRight: '8px' }} />
              {message}
            </div>
          )}

          {!otpStep ? (
            <form onSubmit={handleSubmit}>
              <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                Ваша сессия облака истекла. Введите данные для повторного входа.
              </p>
              
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'var(--color-primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Отправка...' : 'Отправить OTP код'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPVerify}>
              <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                Введите OTP код, отправленный на <strong>{email}</strong>
              </p>
              
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>OTP Код</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)',
                    fontSize: '24px',
                    textAlign: 'center',
                    letterSpacing: '8px'
                  }}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'var(--color-success)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Проверка...' : 'Войти'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncManager; 