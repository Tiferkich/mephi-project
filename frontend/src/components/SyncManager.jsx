import React, { useState, useEffect } from 'react';
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

  const handleSyncSuccess = (syncData) => {
    onSuccess({
      type: 'sync_setup',
      ...syncData
    });
    // ✅ Обновляем статус после успешной синхронизации
    checkRemoteStatus();
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

  return (
    <>
      {activeView === 'menu' && (
        <div className="sync-manager-overlay">
          <div className="sync-manager-modal">
            <div className="sync-manager-header">
              <h2>☁️ Cloud Sync Manager</h2>
              <button 
                className="close-button" 
                onClick={onCancel}
              >
                ×
              </button>
            </div>

            <div className="sync-manager-content">
              <div className="sync-status">
                {statusLoading ? (
                  <div className="status-loading">
                    <div className="status-icon">⏳</div>
                    <div className="status-text">
                      <h3>Checking Connection...</h3>
                      <p>Pinging remote server...</p>
                    </div>
                  </div>
                ) : hasRemoteSync ? (
                  <div className="status-connected">
                    <div className="status-icon">✅</div>
                    <div className="status-text">
                      <h3>Cloud Sync Active</h3>
                      <p>Your account is connected and syncing</p>
                      <p><strong>Server:</strong> {remoteStatus.remoteServerAvailable ? '🟢 Online' : '🔴 Offline'}</p>
                      {userData?.email && <p><strong>Email:</strong> {userData.email}</p>}
                    </div>
                  </div>
                ) : remoteStatus.remoteServerAvailable ? (
                  <div className="status-local">
                    <div className="status-icon">📱</div>
                    <div className="status-text">
                      <h3>Local Account</h3>
                      <p>Your data is stored locally only</p>
                      <p><strong>Server:</strong> 🟢 Online - Ready to sync</p>
                      <p>Connect to cloud sync for backup and multi-device access</p>
                    </div>
                  </div>
                ) : (
                  <div className="status-offline">
                    <div className="status-icon">🔴</div>
                    <div className="status-text">
                      <h3>Server Offline</h3>
                      <p>Cannot connect to remote server</p>
                      <p><strong>Server:</strong> 🔴 Offline</p>
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
                    <div className="option-icon">🔄</div>
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
                  <div className="option-icon">📱</div>
                  <div className="option-content">
                    <h4>Device Transfer</h4>
                    <p>Generate token to transfer data to another device</p>
                    <span className="option-badge fast">5min</span>
                  </div>
                </button>
              </div>

              <div className="sync-info">
                <h4>🛡️ Security Features</h4>
                <div className="security-features">
                  <div className="feature">
                    <span className="feature-icon">🔒</span>
                    <span>End-to-end encryption</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">📧</span>
                    <span>Email verification</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">⏱️</span>
                    <span>Time-limited tokens</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">🔑</span>
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
          onSuccess={handleSyncSuccess}
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