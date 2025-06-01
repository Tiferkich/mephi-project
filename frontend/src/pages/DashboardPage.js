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
  Plus
} from 'lucide-react';
import { remoteService, syncService, authService } from '../services/authService';

const DashboardPage = ({ user, onLogout }) => {
  const [remoteStatus, setRemoteStatus] = useState({
    hasRemoteAccount: false,
    remoteServerAvailable: false,
    tokenValid: false,
    canSync: false
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Загружаем статус удаленного сервера при загрузке
  useEffect(() => {
    loadRemoteStatus();
  }, []);

  const loadRemoteStatus = async () => {
    try {
      const status = await remoteService.getStatus();
      setRemoteStatus(status);
    } catch (error) {
      console.error('Failed to load remote status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncMessage('');

    try {
      if (!remoteStatus.hasRemoteAccount) {
        // Регистрируем на удаленном сервере
        setSyncMessage('Registering with remote server...');
        await remoteService.register();
        setSyncMessage('Registration successful! Syncing data...');
        
        // Обновляем статус
        await loadRemoteStatus();
      } else if (!remoteStatus.tokenValid) {
        // Логинимся на удаленном сервере
        setSyncMessage('Connecting to remote server...');
        await remoteService.login();
        setSyncMessage('Connected! Syncing data...');
      } else {
        setSyncMessage('Syncing data...');
      }

      // Синхронизируем данные
      await syncService.pushToRemote();
      await syncService.pullFromRemote();
      
      setSyncMessage('Sync completed successfully!');
      
      // Обновляем статус
      await loadRemoteStatus();
      
      // Очищаем сообщение через 3 секунды
      setTimeout(() => setSyncMessage(''), 3000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncMessage(`Sync failed: ${error.message}`);
      
      // Очищаем сообщение об ошибке через 5 секунд
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const getSyncButtonText = () => {
    if (syncLoading) return 'Syncing...';
    if (!remoteStatus.hasRemoteAccount) return 'Setup Remote Sync';
    if (!remoteStatus.tokenValid) return 'Connect to Remote';
    return 'Sync Now';
  };

  const getSyncButtonIcon = () => {
    if (!remoteStatus.remoteServerAvailable) return CloudOff;
    if (!remoteStatus.hasRemoteAccount || !remoteStatus.tokenValid) return Cloud;
    return RefreshCw;
  };

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

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        {/* Quick Stats */}
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
            0
          </p>
          <p style={{ 
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Stored securely
          </p>
        </motion.div>

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
            0
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
                  (remoteStatus.tokenValid ? 'Connected' : 'Disconnected') 
                  : 'Not registered') 
                : 'Server unavailable'
              }
            </p>
            
            {syncMessage && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: syncMessage.includes('failed') ? 'var(--color-danger)' : 'var(--color-info)',
                  margin: '0 0 var(--spacing-sm) 0',
                  padding: 'var(--spacing-xs)',
                  background: syncMessage.includes('failed') ? 
                    'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: `1px solid ${syncMessage.includes('failed') ? 
                    'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                }}
              >
                {syncMessage}
              </motion.p>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={syncLoading || !remoteStatus.remoteServerAvailable}
            style={{
              width: '100%',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: remoteStatus.remoteServerAvailable ? 
                (remoteStatus.hasRemoteAccount && remoteStatus.tokenValid ? 
                  'var(--color-success)' : 'var(--color-info)') : 'var(--bg-tertiary)',
              color: remoteStatus.remoteServerAvailable ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: remoteStatus.remoteServerAvailable ? 'pointer' : 'not-allowed',
              opacity: syncLoading ? 0.7 : 1,
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-xs)'
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
          boxShadow: 'var(--shadow-md)'
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
            style={{
              padding: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, var(--color-info) 0%, var(--color-info-hover) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Key size={16} />
            Add Password
          </button>
          
          <button
            style={{
              padding: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-hover) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <FileText size={16} />
            Add Note
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage; 