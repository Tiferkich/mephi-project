import React, { useState } from 'react';
import { RefreshCw, X, Mail, CheckCircle, AlertTriangle, Clock, Send, ArrowLeft, Rocket } from 'lucide-react';
import { remoteService } from '../services/remoteService';
import './SyncSetup.css';

const SyncSetup = ({ userData, onSuccess, onCancel }) => {
  const [step, setStep] = useState('setup'); // 'setup', 'verify'
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');

  const handleSetupSync = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');
    
    try {
      const result = await remoteService.setupSync({
        username: userData.username,
        email: email
      });

      if (result.success) {
        setMessage('OTP code sent to your email. Please check your inbox.');
        
        if (result.warning) {
          setWarning(result.warning);
        }
        
        setStep('verify');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to setup sync: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setError('OTP code is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await remoteService.verifyOtp(userData.username, otpCode, 'SYNC_SETUP');

      if (result.success) {
        setMessage('Sync setup completed successfully!');
        setTimeout(() => {
          onSuccess({
            remoteToken: result.token,
            remoteId: result.userId,
            email: email
          });
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to verify OTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await remoteService.setupSync({
        username: userData.username,
        email: email
      });

      if (result.success) {
        setMessage('New OTP code sent to your email.');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to resend OTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sync-setup-overlay">
      <div className="sync-setup-modal">
        <div className="sync-setup-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <RefreshCw size={24} />
            Setup Cloud Sync
          </h2>
          <button 
            className="close-button" 
            onClick={onCancel}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {step === 'setup' && (
          <form onSubmit={handleSetupSync} className="sync-setup-form">
            <div className="sync-info">
              <p>Connect your account to cloud sync to:</p>
              <ul>
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                  Backup your data securely
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                  Access from multiple devices
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                  Recover if you lose local data
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Mail size={16} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
              <small>We'll send a verification code to this email</small>
            </div>

            <div className="user-info">
              <p><strong>Username:</strong> {userData.username}</p>
            </div>

            {error && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                {error}
              </div>
            )}
            {message && (
              <div className="success-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                {message}
              </div>
            )}
            {warning && (
              <div className="warning-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                {warning}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={onCancel}
                className="cancel-button"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="setup-button"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
              >
                {loading ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket size={16} />
                    Setup Sync
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="sync-verify-form">
            <div className="verify-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Mail size={20} />
                Check Your Email
              </h3>
              <p>We sent a 6-digit verification code to:</p>
              <strong>{email}</strong>
            </div>

            <div className="form-group">
              <label htmlFor="otpCode" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <CheckCircle size={16} />
                Verification Code
              </label>
              <input
                type="text"
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength="6"
                required
                disabled={loading}
                className="otp-input"
              />
              <small>Enter the 6-digit code from your email</small>
            </div>

            {error && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                {error}
              </div>
            )}
            {message && (
              <div className="success-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                {message}
              </div>
            )}
            {warning && (
              <div className="warning-message" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                {warning}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setStep('setup')}
                className="back-button"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button 
                type="button" 
                onClick={resendOtp}
                className="resend-button"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
              >
                <Send size={16} />
                Resend Code
              </button>
              <button 
                type="submit" 
                className="verify-button"
                disabled={loading || otpCode.length !== 6}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
              >
                {loading ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Verify & Complete
                  </>
                )}
              </button>
            </div>

            <div className="help-text">
              <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                Code expires in 10 minutes
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                Check spam folder if you don't see the email
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SyncSetup; 