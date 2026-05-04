import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Key, Check, Eye, EyeOff, AlertTriangle, Cloud, Download } from 'lucide-react';
import './SetupPage.css';
import { authService } from '../services/authService';
import { restoreFromBackup } from '../services/backupService';
import { secureService } from '../services/secureService';
import { userCryptoSalt } from '../utils/userCrypto';
import { generateUserRegistrationData, validatePasswordStrength } from '../utils/crypto';
import { useDeviceSecurity } from '../hooks/useDeviceSecurity';
import { SecurityStatusBadge } from '../components/SecurityStatusBadge';
import { getLastSnapshot, getLastCheckId, runFullCheck, storeCheckResult } from '../services/securityService';
import { publishPublicKey } from '../services/groupService';

async function tryPublishPublicKey(masterPassword, userId) {
  try {
    const result = await window.electronAPI.crypto.deriveX25519Keypair(masterPassword, userId);
    if (result.success) {
      await publishPublicKey(result.pubKeyBase64);
    }
  } catch (e) {
    console.warn('[pubkey] failed to publish X25519 public key:', e.message);
  }
}

const SetupPage = ({ onSetupComplete, isFirstTime, serverError, onSecurityBlocked }) => {
  const { status, snapshot, denyReason, policy, recheck, lastCheckId } = useDeviceSecurity({ autoRun: true });
  const [setupMode, setSetupMode] = useState(''); // 'new', 'cloud', 'restore'
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    masterPassword: '',
    confirmPassword: '',
    // Cloud login fields
    cloudEmail: '',
    cloudUsername: '',
    cloudPassword: '',
    otpCode: '',
    restorePassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getSteps = () => {
    if (setupMode === 'new') {
      return [
        { id: 1, title: 'Setup Mode', icon: Shield },
        { id: 2, title: 'Create Account', icon: User },
        { id: 3, title: 'Master Password', icon: Key },
        { id: 4, title: 'Complete', icon: Check }
      ];
    } else if (setupMode === 'cloud') {
      return [
        { id: 1, title: 'Setup Mode', icon: Shield },
        { id: 2, title: 'Cloud Login', icon: Cloud },
        { id: 3, title: 'OTP Verify', icon: Key },
        { id: 4, title: 'Complete', icon: Check }
      ];
    } else if (setupMode === 'restore') {
      return [
        { id: 1, title: 'Setup Mode', icon: Shield },
        { id: 2, title: 'Restore Backup', icon: Download },
        { id: 3, title: 'Complete', icon: Check }
      ];
    } else {
      return [
        { id: 1, title: 'Setup Mode', icon: Shield }
      ];
    }
  };

  const steps = getSteps();

  // Используем утилиту для валидации пароля
  const passwordValidation = validatePasswordStrength(formData.masterPassword);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = (stepId) => {
    // Можно возвращаться только к предыдущим шагам (completed)
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      setError(''); // Сбрасываем ошибки при переходе
    }
  };

  const handleSetupModeSelect = (mode) => {
    setSetupMode(mode);
    setError('');
    handleNext();
  };

  const handleCloudLogin = async () => {
    if (!formData.cloudEmail.trim() || !formData.cloudUsername.trim() || !formData.cloudPassword.trim()) {
      setError('Please fill in all cloud account fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Starting cloud account login...');
      
      const response = await authService.cloudLogin({
        email: formData.cloudEmail.trim(),
        username: formData.cloudUsername.trim(),
        masterPassword: formData.cloudPassword
      });
      
      console.log('✅ Cloud login initiated:', response);
      
      if (response.requiresOTP) {
        // Переходим к следующему шагу для ввода OTP
        handleNext();
      } else {
        // Успешный вход без OTP (маловероятно)
        onSetupComplete({
          username: response.username,
          userId: response.userId,
          token: response.token,
          setupMode: 'cloud'
        });
      }
      
    } catch (err) {
      console.error('❌ Cloud login failed:', err);
      setError(err.message || 'Failed to login to cloud account');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async () => {
    if (!formData.otpCode.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Verifying OTP code...');
      
      const response = await authService.verifyCloudOTP(
        formData.otpCode.trim(),
        formData.cloudUsername.trim()
      );
      
      console.log('✅ OTP verification successful:', response);
      
      // Успешный вход в облачный аккаунт
      onSetupComplete({
        username: response.username,
        userId: response.userId,
        token: response.token,
        setupMode: 'cloud'
      });
      
    } catch (err) {
      console.error('❌ OTP verification failed:', err);
      setError(err.message || 'Failed to verify OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromBackup = async () => {
    if (!formData.restorePassword.trim()) {
      setError('Please enter your master password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await restoreFromBackup(formData.restorePassword);
      if (!response) {
        // canceled by user
        setLoading(false);
        return;
      }

      // Immediately unlock the vault so the dashboard loads data without
      // asking the user to re-enter the password. The same password that
      // decrypted the .vault file also derives the vault crypto key
      // (PBKDF2 with userId as salt, both of which are now restored).
      const unlockPassword = response.restoredMasterPassword || formData.restorePassword;
      try {
        await secureService.unlock(unlockPassword, userCryptoSalt({
          userId: response.userId,
          username: response.username,
        }));
      } catch (unlockErr) {
        console.error('[SetupPage] vault auto-unlock after restore failed:', unlockErr);
        // Non-fatal — user will see the locked state and can unlock manually
      }

      // Fire-and-forget: publish X25519 pubkey for group vault key exchange
      tryPublishPublicKey(unlockPassword, response.userId);

      onSetupComplete({
        username: response.username,
        userId: response.userId,
        token: response.token,
        masterPassword: unlockPassword,
        setupMode: 'restore',
      });
    } catch (err) {
      console.error('Restore failed:', err);
      if (err.code === 'ANTIVIRUS_DISABLED' && onSecurityBlocked) {
        onSecurityBlocked({ reason: err.message, snapshot: getLastSnapshot() });
        return;
      }
      setError(err.message || 'Failed to restore from backup');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (setupMode === 'new') {
        // Генерируем криптографические данные
        const registrationData = await generateUserRegistrationData(
          formData.username,
          formData.masterPassword
        );

        // Свежая проверка безопасности прямо перед setup
        let securityCheckId = getLastCheckId();
        if (!securityCheckId) {
          const checkResult = await runFullCheck();
          storeCheckResult(checkResult);
          securityCheckId = checkResult.checkId;
        }

        // Выполняем первичную настройку локально
        const response = await authService.setup({ ...registrationData, securityCheckId });
        
        // Публикуем X25519 публичный ключ (фоновая задача)
        tryPublishPublicKey(formData.masterPassword, response.userId);

        onSetupComplete({
          username: formData.username,
          userId: response.userId,
          token: response.token,
          masterPassword: formData.masterPassword
        });
      } else if (setupMode === 'cloud') {
        // На шаге 3 вызываем OTP верификацию
        if (currentStep === 3) {
          await handleOTPVerification();
        } else {
          // На шаге 2 вызываем облачный логин
          await handleCloudLogin();
        }
      } else if (setupMode === 'restore') {
        await handleRestoreFromBackup();
      }
      
    } catch (err) {
      console.error('Setup failed:', err);
      if (err.code === 'ANTIVIRUS_DISABLED' && onSecurityBlocked) {
        onSecurityBlocked({ reason: err.message, snapshot: getLastSnapshot() });
        return;
      }
      setError(err.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordRequirements = () => (
    <div className="password-validation">
      <div className="validation-grid">
        <div className="requirements-section">
          <div className="requirements-title">Requirements:</div>
          <div className="requirements-list">
            <div className={`requirement ${passwordValidation.requirements.length ? 'met' : 'unmet'}`}>
              <span className="requirement-dot"></span>
              At least 8 characters
            </div>
            <div className={`requirement ${passwordValidation.requirements.uppercase ? 'met' : 'unmet'}`}>
              <span className="requirement-dot"></span>
              One uppercase letter
            </div>
            <div className={`requirement ${passwordValidation.requirements.lowercase ? 'met' : 'unmet'}`}>
              <span className="requirement-dot"></span>
              One lowercase letter
            </div>
            <div className={`requirement ${passwordValidation.requirements.number ? 'met' : 'unmet'}`}>
              <span className="requirement-dot"></span>
              One number
            </div>
            <div className={`requirement ${passwordValidation.requirements.special ? 'met' : 'unmet'}`}>
              <span className="requirement-dot"></span>
              One special character
            </div>
          </div>
        </div>
        
        <div className="strength-section">
          <div className="strength-title">Password Strength:</div>
          <div className="strength-display">
            <div className={`strength-meter strength-${passwordValidation.strength}`}>
              <div className="strength-fill"></div>
            </div>
            <div className={`strength-text strength-${passwordValidation.strength}`}>
              {passwordValidation.strength === 'weak' && 'Weak'}
              {passwordValidation.strength === 'medium' && 'Medium'}
              {passwordValidation.strength === 'strong' && 'Strong'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        if (!setupMode) {
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Shield size={64} className="welcome-icon" />
              <h2>Welcome to Secure Password Manager</h2>
              <p>Choose how you want to set up your vault:</p>
              
              {/* Server Error Warning */}
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    backgroundColor: 'rgba(229, 158, 8, 0.1)',
                    border: '1px solid var(--color-warning)',
                    color: 'var(--color-warning)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    margin: 'var(--spacing-lg) 0'
                  }}
                >
                  <AlertTriangle size={16} />
                  <div>
                    <strong>Server Connection Issue:</strong><br />
                    {serverError}<br />
                    <em>You can still create a local vault.</em>
                  </div>
                </motion.div>
              )}

              <div className="setup-mode-options">
                <button 
                  className="setup-mode-button new-account"
                  onClick={() => handleSetupModeSelect('new')}
                >
                  <User size={32} />
                  <h3>Create New Vault</h3>
                  <p>Start fresh with a new local vault</p>
                </button>

                <button 
                  className="setup-mode-button jwt-login"
                  onClick={() => handleSetupModeSelect('cloud')}
                  disabled={serverError}
                >
                  <Cloud size={32} />
                  <h3>Connect Cloud Account</h3>
                  <p>Login with your cloud account credentials</p>
                </button>

                <button
                  className="setup-mode-button restore-backup"
                  onClick={() => handleSetupModeSelect('restore')}
                >
                  <Download size={32} />
                  <h3>Restore from Backup</h3>
                  <p>Restore vault from a *.vault backup file</p>
                </button>
              </div>
            </motion.div>
          );
        } else {
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Shield size={64} className="welcome-icon" />
              <h2>Setup Mode Selected</h2>
              <p>
                {setupMode === 'new' && 'Creating a new local vault'}
                {setupMode === 'cloud' && 'Connecting to cloud account'}
                {setupMode === 'restore' && 'Restoring vault from backup file'}
              </p>
              <button className="btn-primary" onClick={handleNext}>
                Continue
              </button>
            </motion.div>
          );
        }

      case 2:
        if (setupMode === 'new') {
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <User size={40} className="step-icon" />
              <h2>Create Your Account</h2>
              <p>Choose a username for your local account</p>
              
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>

              <button 
                className="btn-primary" 
                onClick={handleNext}
                disabled={!formData.username.trim()}
              >
                Continue
              </button>
            </motion.div>
          );
        } else if (setupMode === 'cloud') {
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Cloud size={40} className="step-icon" />
              <h2>Cloud Account Login</h2>
              <p>Enter your cloud account credentials to connect</p>
              
              <div className="password-fields">
                <div className="form-group">
                  <label htmlFor="cloudEmail">Email</label>
                  <input
                    id="cloudEmail"
                    type="email"
                    value={formData.cloudEmail}
                    onChange={(e) => handleInputChange('cloudEmail', e.target.value)}
                    placeholder="Enter your email"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cloudUsername">Username</label>
                  <input
                    id="cloudUsername"
                    type="text"
                    value={formData.cloudUsername}
                    onChange={(e) => handleInputChange('cloudUsername', e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cloudPassword">Master Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="cloudPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.cloudPassword}
                      onChange={(e) => handleInputChange('cloudPassword', e.target.value)}
                      placeholder="Enter your master password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button 
                className="btn-primary" 
                onClick={handleComplete}
                disabled={!formData.cloudEmail.trim() || !formData.cloudUsername.trim() || !formData.cloudPassword.trim() || loading}
              >
                {loading ? 'Connecting...' : 'Login to Cloud'}
              </button>
            </motion.div>
          );
        } else if (setupMode === 'restore') {
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Download size={40} className="step-icon" />
              <h2>Restore from Backup</h2>
              <p>Enter your master password and select the *.vault backup file</p>

              <div className="form-group">
                <label htmlFor="restorePassword">Master Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="restorePassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.restorePassword}
                    onChange={(e) => handleInputChange('restorePassword', e.target.value)}
                    placeholder="Enter master password used during backup"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small>The password must match the one used when the backup was created</small>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                className="btn-primary"
                onClick={handleComplete}
                disabled={!formData.restorePassword.trim() || loading}
              >
                {loading ? 'Restoring...' : 'Choose File & Restore'}
              </button>
            </motion.div>
          );
        }
        break;

      case 3:
        if (setupMode === 'restore') {
          return renderCompleteStep();
        } else if (setupMode === 'cloud') {
          // Cloud mode - OTP verification step
          return (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Key size={40} className="step-icon" />
              <h2>Email Verification</h2>
              <p>Enter the OTP code sent to your email: <strong>{formData.cloudEmail}</strong></p>
              
              <div className="form-group">
                <label htmlFor="otpCode">OTP Code</label>
                <input
                  id="otpCode"
                  type="text"
                  value={formData.otpCode}
                  onChange={(e) => handleInputChange('otpCode', e.target.value)}
                  placeholder="Enter 6-digit OTP code"
                  maxLength="6"
                  autoFocus
                />
                <small>Check your email for the verification code</small>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button 
                className="btn-primary" 
                onClick={handleComplete}
                disabled={!formData.otpCode.trim() || formData.otpCode.length !== 6 || loading}
              >
                {loading ? 'Verifying...' : 'Verify & Connect'}
              </button>
            </motion.div>
          );
        } else {
          // New account or JWT login - both need master password
          return (
            <motion.div
              className="step-content password-step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Key size={40} className="step-icon" />
              <h2>
                {setupMode === 'new' ? 'Create Master Password' : 'Enter Master Password'}
              </h2>
              <p>
                {setupMode === 'new' 
                  ? 'This password will protect all your data. Make it strong!' 
                  : 'Enter your local master password to unlock the vault'}
              </p>
              
              <div className="password-fields">
                <div className="form-group">
                  <label htmlFor="masterPassword">Master Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="masterPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.masterPassword}
                      onChange={(e) => handleInputChange('masterPassword', e.target.value)}
                      placeholder="Enter master password"
                      className={formData.masterPassword && !passwordValidation.isValid ? 'invalid' : ''}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {setupMode === 'new' && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="password-input-wrapper">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm master password"
                        className={formData.confirmPassword && formData.masterPassword !== formData.confirmPassword ? 'invalid' : ''}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.masterPassword !== formData.confirmPassword && (
                      <div className="field-error">Passwords do not match</div>
                    )}
                  </div>
                )}
              </div>

              {setupMode === 'new' && formData.masterPassword && renderPasswordRequirements()}

              {error && <div className="error-message">{error}</div>}

              <button 
                className="btn-primary" 
                onClick={handleNext}
                disabled={
                  !formData.masterPassword || 
                  (setupMode === 'new' && (
                    !passwordValidation.isValid || 
                    formData.masterPassword !== formData.confirmPassword
                  ))
                }
              >
                Continue
              </button>
            </motion.div>
          );
        }

      case 4:
        return renderCompleteStep();

      default:
        return null;
    }
  };

  const renderCompleteStep = () => (
    <motion.div
      className="step-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Check size={64} className="success-icon" />
      <h2>
        {setupMode === 'new' && 'Ready to Create Vault'}
        {setupMode === 'cloud' && 'Ready to Connect'}
        {setupMode === 'transfer' && 'Ready to Transfer'}
      </h2>
      <p>
        {setupMode === 'new' && 'Your vault will be created with military-grade encryption.'}
        {setupMode === 'cloud' && 'Your cloud account will be connected to this device.'}
        {setupMode === 'transfer' && 'Your data will be transferred from the other device.'}
      </p>

      {error && <div className="error-message">{error}</div>}

      <button 
        className="btn-primary btn-large" 
        onClick={handleComplete}
        disabled={loading || (setupMode === 'new' && status === 'denied')}
      >
        {loading ? 'Setting up...' : (
          setupMode === 'new' ? 'Create Vault' :
          setupMode === 'cloud' ? 'Connect Account' :
          'Complete Transfer'
        )}
      </button>
    </motion.div>
  );

  return (
    <div className="setup-page">
      <div className="setup-container" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <SecurityStatusBadge
            status={status}
            snapshot={snapshot}
            denyReason={denyReason}
            policy={policy}
            onRecheck={recheck}
          />
        </div>
        {status === 'denied' && (
          <div
            style={{
              color: 'var(--color-warning, #f59e0b)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              fontSize: '0.9rem',
              marginBottom: '0.75rem',
            }}
          >
            {denyReason || 'Создание сейфа недоступно, пока не соблюдена политика безопасности устройства.'}
          </div>
        )}
        {/* Progress Steps */}
        <div className="setup-steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isClickable = isCompleted; // Можно кликать только на completed шаги
            
            return (
              <div
                key={step.id}
                className={`setup-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                onClick={() => handleStepClick(step.id)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                title={isClickable ? `Go back to ${step.title}` : ''}
              >
                <div 
                  className="step-indicator"
                >
                  <Icon size={20} />
                </div>
                <span className="step-title">{step.title}</span>
                {index < steps.length - 1 && <div className="step-connector" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="setup-content">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default SetupPage; 