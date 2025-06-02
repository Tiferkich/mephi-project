import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Key, 
  Globe, 
  User, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  Check, 
  X,
  Save,
  Wand2
} from 'lucide-react';
import { generateSecurePassword, validatePasswordStrength } from '../utils/crypto';

const PasswordForm = ({ 
  initialData = null, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    site: '',
    login: '',
    password: '',
    type: 'Website'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Загружаем данные для редактирования
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        site: initialData.site || '',
        login: initialData.login || '',
        password: initialData.password || '',
        type: initialData.type || 'Website'
      });
    }
  }, [initialData]);

  const passwordStrength = validatePasswordStrength(formData.password);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Убираем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleGeneratePassword = () => {
    try {
      const newPassword = generateSecurePassword(
        generatorOptions.length, 
        generatorOptions
      );
      setFormData(prev => ({ ...prev, password: newPassword }));
      setShowPasswordGenerator(false);
    } catch (error) {
      console.error('Password generation failed:', error);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save failed:', error);
      setErrors({ submit: error.message || 'Failed to save password' });
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    'Website', 'Application', 'Email', 'Social Media', 
    'Banking', 'Gaming', 'Work', 'Personal', 'Other'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--spacing-md)'
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-2xl)',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Key style={{ color: 'var(--color-info)' }} />
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit Password' : 'Add New Password'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 'var(--spacing-lg)' }}>
          {/* Title */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Gmail Account"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${errors.title ? 'var(--color-danger)' : 'var(--border-color)'}`,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
            {errors.title && (
              <p style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-danger)', 
                margin: 'var(--spacing-xs) 0 0 0' 
              }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* Site */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <Globe size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
              Website/URL
            </label>
            <input
              type="text"
              value={formData.site}
              onChange={(e) => handleInputChange('site', e.target.value)}
              placeholder="https://example.com"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Login */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <User size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
              Login/Email
            </label>
            <input
              type="text"
              value={formData.login}
              onChange={(e) => handleInputChange('login', e.target.value)}
              placeholder="username or email"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <span>Password *</span>
              <button
                type="button"
                onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-info)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)'
                }}
              >
                <Wand2 size={14} />
                Generate
              </button>
            </label>
            
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  paddingRight: '80px',
                  fontSize: 'var(--font-size-md)',
                  borderRadius: 'var(--border-radius-md)',
                  border: `1px solid ${errors.password ? 'var(--color-danger)' : 'var(--border-color)'}`,
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              
              <div style={{
                position: 'absolute',
                right: 'var(--spacing-sm)',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: 'var(--spacing-xs)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 'var(--spacing-xs)'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                
                {formData.password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copySuccess ? 'var(--color-success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 'var(--spacing-xs)'
                    }}
                  >
                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>
            
            {errors.password && (
              <p style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-danger)', 
                margin: 'var(--spacing-xs) 0 0 0' 
              }}>
                {errors.password}
              </p>
            )}
            
            {/* Password Strength */}
            {formData.password && (
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Strength
                  </span>
                  <span style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    color: passwordStrength.strength === 'weak' ? 'var(--color-danger)' :
                           passwordStrength.strength === 'medium' ? 'var(--color-warning)' :
                           'var(--color-success)'
                  }}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>
                <div style={{
                  height: '4px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    background: passwordStrength.strength === 'weak' ? 'var(--color-danger)' :
                               passwordStrength.strength === 'medium' ? 'var(--color-warning)' :
                               'var(--color-success)',
                    transition: 'all var(--transition-fast)'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Password Generator */}
          {showPasswordGenerator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)'
              }}
            >
              <h4 style={{ margin: '0 0 var(--spacing-md) 0', color: 'var(--text-primary)' }}>
                Password Generator
              </h4>
              
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  Length: {generatorOptions.length}
                </label>
                <input
                  type="range"
                  min="8"
                  max="50"
                  value={generatorOptions.length}
                  onChange={(e) => setGeneratorOptions(prev => ({ 
                    ...prev, 
                    length: parseInt(e.target.value) 
                  }))}
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-md)'
              }}>
                {[
                  { key: 'includeUppercase', label: 'Uppercase (A-Z)' },
                  { key: 'includeLowercase', label: 'Lowercase (a-z)' },
                  { key: 'includeNumbers', label: 'Numbers (0-9)' },
                  { key: 'includeSymbols', label: 'Symbols (!@#$)' },
                ].map(({ key, label }) => (
                  <label key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={generatorOptions[key]}
                      onChange={(e) => setGeneratorOptions(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={generatorOptions.excludeSimilar}
                    onChange={(e) => setGeneratorOptions(prev => ({
                      ...prev,
                      excludeSimilar: e.target.checked
                    }))}
                  />
                  Exclude similar characters (i, l, 1, L, o, 0, O)
                </label>
              </div>
              
              <button
                type="button"
                onClick={handleGeneratePassword}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  background: 'var(--color-info)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-sm)'
                }}
              >
                <RefreshCw size={16} />
                Generate Password
              </button>
            </motion.div>
          )}

          {/* Type */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            >
              {typeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              marginBottom: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: loading ? 'var(--bg-tertiary)' : 'var(--color-success)',
                color: loading ? 'var(--text-secondary)' : 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)'
              }}
            >
              {loading ? (
                <RefreshCw size={16} style={{
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PasswordForm; 