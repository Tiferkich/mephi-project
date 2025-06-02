import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { authService } from '../services/authService';
import { secureService } from '../services/secureService';

const LoginPage = ({ onLoginSuccess, onGoToSetup }) => {
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setError('Please enter your master password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Сначала авторизуемся на сервере без передачи мастер-пароля
      const response = await authService.login(masterPassword);
      
      // Затем безопасно разблокируем хранилище в main процессе
      await secureService.unlock(masterPassword, response.username || 'default-salt');
      
      // Передаем только безопасные данные (БЕЗ мастер-пароля)
      onLoginSuccess({
        username: response.username,
        userId: response.userId,
        token: response.token
        // ❌ masterPassword НЕ передаем!
      });
      
      // Очищаем мастер-пароль из памяти
      setMasterPassword('');
      
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
      padding: 'var(--spacing-md)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--spacing-2xl)',
          width: '100%',
          maxWidth: '400px'
        }}
      >
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 'var(--spacing-xl)'
        }}>
          <Shield 
            size={48} 
            style={{ 
              color: 'var(--color-success)',
              filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.3))',
              marginBottom: 'var(--spacing-md)'
            }}
          />
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            margin: '0 0 var(--spacing-sm) 0'
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Enter your master password to unlock your vault
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label 
              htmlFor="masterPassword"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-sm)'
              }}
            >
              <Lock size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="masterPassword"
                type={showPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setError('');
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = 'var(--bg-secondary)';
                  e.target.style.borderColor = 'var(--color-success)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'var(--bg-tertiary)';
                  if (!error) {
                    e.target.style.borderColor = 'var(--border-color)';
                  }
                }}
                placeholder="Enter your master password"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  paddingRight: '50px',
                  fontSize: 'var(--font-size-md)',
                  borderRadius: 'var(--border-radius-md)',
                  border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-color)'}`,
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  transition: 'all var(--transition-fast)',
                  boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 'var(--spacing-md)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 'var(--spacing-xs)',
                  borderRadius: 'var(--border-radius-sm)',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius-md)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--spacing-lg)'
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !masterPassword.trim()}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-success)',
              color: 'var(--bg-primary)',
              padding: 'var(--spacing-md)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: loading || !masterPassword.trim() ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              opacity: loading || !masterPassword.trim() ? 0.5 : 1,
              transform: 'translateY(0)',
              marginBottom: 'var(--spacing-lg)'
            }}
            onMouseEnter={(e) => {
              if (!loading && masterPassword.trim()) {
                e.target.style.backgroundColor = 'var(--color-success-hover)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--color-success)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Unlocking Vault...' : 'Unlock Vault'}
          </button>

          {/* Setup Link */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--text-secondary)' 
            }}>
              Don't have an account?{' '}
            </span>
            <button
              type="button"
              onClick={onGoToSetup}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-success)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--color-success-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--color-success)';
              }}
            >
              Create New Vault
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage; 