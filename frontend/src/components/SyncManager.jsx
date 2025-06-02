import React, { useState, useEffect } from 'react';
import { Cloud, X, RefreshCw, CheckCircle, Smartphone, AlertCircle, WifiOff, Shield, Lock, Mail, Clock, Key, AlertTriangle } from 'lucide-react';
import SyncSetup from './SyncSetup';
import DataTransfer from './DataTransfer';
import { remoteService } from '../services/authService';
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
      const status = await remoteService.getStatus();
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
                {isLocalUser && remoteStatus.remoteServerAvailable && (
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
    </>
  );
};

export default SyncManager; 