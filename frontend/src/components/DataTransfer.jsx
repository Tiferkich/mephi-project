import React, { useState, useEffect } from 'react';
import { remoteService } from '../services/remoteService';
import './DataTransfer.css';

const DataTransfer = ({ onSuccess, onCancel }) => {
  const [mode, setMode] = useState(''); // 'create', 'use'
  const [step, setStep] = useState('select'); // 'select', 'authenticate', 'generate', 'input', 'transfer'
  const [loading, setLoading] = useState(false);
  
  // Create token mode
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [transferToken, setTransferToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  
  // Use token mode
  const [inputToken, setInputToken] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer for token expiration
  useEffect(() => {
    let interval;
    if (expiresAt && timeLeft > 0) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          setError('Transfer token has expired. Please generate a new one.');
          setTransferToken('');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [expiresAt, timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!username || !masterPassword) {
      setError('Username and master password are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Import crypto functions
      const { createHash } = window.require('crypto');
      
      // Hash the master password (SHA-256)
      const masterPasswordHash = createHash('sha256')
        .update(masterPassword)
        .digest('hex');

      // Get stored salt from localStorage or wherever it's stored
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!storedUser.salt) {
        setError('User salt not found. Please login first.');
        return;
      }

      // Import Argon2 for final hashing
      const argon2 = window.require('argon2');
      const finalPasswordHash = await argon2.hash(masterPasswordHash + storedUser.salt, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 3,
        parallelism: 1,
      });

      const result = await remoteService.createTransferToken({
        username,
        passwordHash: finalPasswordHash
      });

      if (result.success) {
        setTransferToken(result.transferToken);
        setExpiresAt(result.expiresAt);
        setTimeLeft(result.expiresInMinutes * 60);
        setMessage('Transfer token created successfully!');
        setStep('generate');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to create transfer token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseToken = async (e) => {
    e.preventDefault();
    if (!inputToken) {
      setError('Transfer token is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await remoteService.useTransferToken(inputToken);

      if (result.success) {
        setMessage('Data transfer successful! Setting up your account...');
        setTimeout(() => {
          onSuccess({
            remoteToken: result.token,
            remoteId: result.userId,
            userData: result.userData,
            passwords: result.passwords,
            notes: result.notes,
            masterPasswordHash: result.masterPasswordHash,
            salt: result.salt
          });
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to use transfer token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transferToken);
      setMessage('Transfer token copied to clipboard!');
    } catch (error) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="transfer-overlay">
      <div className="transfer-modal">
        <div className="transfer-header">
          <h2>📱 Device Transfer</h2>
          <button 
            className="close-button" 
            onClick={onCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {step === 'select' && (
          <div className="transfer-select">
            <div className="transfer-info">
              <h3>📦 Transfer Your Data</h3>
              <p>Quickly move your password vault to another device using a secure 5-minute token</p>
            </div>

            <div className="transfer-options">
              <button 
                className="option-button create-option"
                onClick={() => {
                  setMode('create');
                  setStep('authenticate');
                }}
              >
                <div className="option-icon">📤</div>
                <div className="option-content">
                  <h4>Generate Transfer Token</h4>
                  <p>Create a secure token to send your data to another device</p>
                </div>
              </button>

              <button 
                className="option-button use-option"
                onClick={() => {
                  setMode('use');
                  setStep('input');
                }}
              >
                <div className="option-icon">📥</div>
                <div className="option-content">
                  <h4>Use Transfer Token</h4>
                  <p>Enter a token received from another device to import data</p>
                </div>
              </button>
            </div>

            <div className="transfer-warning">
              <p>⚠️ Transfer tokens expire in 5 minutes for security</p>
              <p>🔒 Your data is encrypted and secure during transfer</p>
            </div>
          </div>
        )}

        {step === 'authenticate' && mode === 'create' && (
          <form onSubmit={handleCreateToken} className="transfer-auth-form">
            <div className="auth-info">
              <h3>🔐 Authenticate to Generate Token</h3>
              <p>Verify your credentials to create a secure transfer token</p>
            </div>

            <div className="form-group">
              <label htmlFor="username">👤 Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="masterPassword">🔑 Master Password</label>
              <input
                type="password"
                id="masterPassword"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter your master password"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">❌ {error}</div>}
            {message && <div className="success-message">✅ {message}</div>}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setStep('select')}
                className="back-button"
                disabled={loading}
              >
                ← Back
              </button>
              <button 
                type="submit" 
                className="generate-button"
                disabled={loading}
              >
                {loading ? '⏳ Generating...' : '🎯 Generate Token'}
              </button>
            </div>
          </form>
        )}

        {step === 'generate' && (
          <div className="transfer-token-display">
            <div className="token-info">
              <h3>🎉 Transfer Token Generated!</h3>
              <p>Share this token with your other device. It expires in:</p>
              <div className="countdown">
                <span className="time-display">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="token-container">
              <div className="token-display">
                <code>{transferToken}</code>
              </div>
              <button 
                className="copy-button"
                onClick={copyToClipboard}
                disabled={!transferToken}
              >
                📋 Copy Token
              </button>
            </div>

            <div className="token-instructions">
              <h4>📋 Instructions:</h4>
              <ol>
                <li>Copy the token above</li>
                <li>Open the app on your new device</li>
                <li>Go to Device Transfer → Use Transfer Token</li>
                <li>Paste the token and import your data</li>
              </ol>
            </div>

            {error && <div className="error-message">❌ {error}</div>}
            {message && <div className="success-message">✅ {message}</div>}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setStep('select');
                  setTransferToken('');
                  setTimeLeft(0);
                }}
                className="done-button"
              >
                ✅ Done
              </button>
            </div>
          </div>
        )}

        {step === 'input' && mode === 'use' && (
          <form onSubmit={handleUseToken} className="transfer-input-form">
            <div className="input-info">
              <h3>📥 Enter Transfer Token</h3>
              <p>Paste the transfer token you received from your other device</p>
            </div>

            <div className="form-group">
              <label htmlFor="inputToken">🎫 Transfer Token</label>
              <input
                type="text"
                id="inputToken"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Enter 16-character token"
                required
                disabled={loading}
                maxLength="16"
                className="token-input"
              />
              <small>Token should be 16 characters (letters and numbers)</small>
            </div>

            {error && <div className="error-message">❌ {error}</div>}
            {message && <div className="success-message">✅ {message}</div>}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setStep('select')}
                className="back-button"
                disabled={loading}
              >
                ← Back
              </button>
              <button 
                type="submit" 
                className="transfer-button"
                disabled={loading || inputToken.length !== 16}
              >
                {loading ? '⏳ Transferring...' : '🚀 Import Data'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DataTransfer; 