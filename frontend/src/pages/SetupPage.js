import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Key, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import './SetupPage.css';
import { authService } from '../services/authService';
import { generateUserRegistrationData, validatePasswordStrength } from '../utils/crypto';

const SetupPage = ({ onSetupComplete, isFirstTime, serverError }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    masterPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = [
    { id: 1, title: 'Welcome', icon: Shield },
    { id: 2, title: 'Create Account', icon: User },
    { id: 3, title: 'Master Password', icon: Key },
    { id: 4, title: 'Complete', icon: Check }
  ];

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

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Генерируем криптографические данные
      const registrationData = await generateUserRegistrationData(
        formData.username,
        formData.masterPassword
      );

      console.log('Registration data:', registrationData); // Для отладки

      // Регистрируем пользователя локально
      const response = await authService.register(registrationData);
      
      // Успешная регистрация
      onSetupComplete({
        username: formData.username,
        userId: response.userId,
        token: response.token
      });
      
    } catch (err) {
      console.error('Setup failed:', err);
      setError(err.message || 'Failed to create account. Please try again.');
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
        return (
          <motion.div
            className="step-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Shield size={64} className="welcome-icon" />
            <h2>Welcome to Secure Password Manager</h2>
            <p>
              Keep your passwords safe and secure with military-grade encryption.
              Let's set up your vault.
            </p>
            
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
                  <em>You can still create a local vault and sync later.</em>
                </div>
              </motion.div>
            )}
            
            <button className="btn-primary" onClick={handleNext}>
              Get Started
            </button>
          </motion.div>
        );

      case 2:
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

      case 3:
        return (
          <motion.div
            className="step-content password-step-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Key size={40} className="step-icon" />
            <h2>Create Master Password</h2>
            <p>This password will protect all your data. Make it strong!</p>
            
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
            </div>

            {formData.masterPassword && renderPasswordRequirements()}

            {error && <div className="error-message">{error}</div>}

            <button 
              className="btn-primary" 
              onClick={handleNext}
              disabled={
                !formData.masterPassword || 
                !passwordValidation.isValid ||
                formData.masterPassword !== formData.confirmPassword
              }
            >
              Create Account
            </button>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            className="step-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Check size={40} className="step-icon success" />
            <h2>Setup Complete!</h2>
            <p>Your secure vault has been created successfully.</p>
            
            <button 
              className="btn-success" 
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Enter Vault'}
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-container">
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