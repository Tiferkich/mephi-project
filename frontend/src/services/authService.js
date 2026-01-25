import axios from 'axios';
import { createMasterPasswordHash } from '../utils/crypto';

const API_BASE_URL = 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Отладка запросов
api.interceptors.request.use((config) => {
  console.log('🔄 API Request:', config.method?.toUpperCase(), config.url, config);
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      // Could trigger logout here
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Check if setup is completed
  async checkSetupStatus() {
    try {
      const response = await api.get('/auth/status');
      return response.data;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      // Если сервер недоступен, считаем что setup не завершен
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        return { 
          isSetup: false, 
          error: 'Server is not running. Please start the local server.' 
        };
      }
      return { isSetup: false };
    }
  },

  // Setup new user (first time setup) - ТОЛЬКО ЛОКАЛЬНО
  async setup(userData) {
    try {
      const response = await api.post('/auth/setup', {
        username: userData.username,
        salt: userData.salt,
        passwordHash: userData.masterPasswordHash // Отправляем уже захешированный пароль
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Setup error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.message || 'Setup failed');
    }
  },

  // Login existing user
  async login(masterPassword) {
    try {
      // Создаем SHA-256 хеш от мастер-пароля
      const passwordHash = await createMasterPasswordHash(masterPassword);
      
      const response = await api.post('/auth/login', {
        passwordHash: passwordHash
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  // Validate existing token
  async validateToken(token) {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw new Error('Token validation failed');
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken');
  },

  // Replace local account with recovered account
  async replaceAccount(recoveredData) {
    try {
      const response = await api.post('/auth/replace-account', {
        username: recoveredData.username,
        email: recoveredData.email,
        masterPasswordHash: recoveredData.masterPasswordHash,
        salt: recoveredData.salt,
        remoteToken: recoveredData.remoteToken,
        remoteId: recoveredData.remoteId,
        passwords: recoveredData.passwords || [],
        notes: recoveredData.notes || []
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Account replacement error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.error || 'Account replacement failed');
    }
  },

  // Connect remote account to local account (without replacement)
  async connectRemoteAccount(remoteData) {
    try {
      const response = await api.post('/auth/connect-remote', {
        remoteToken: remoteData.remoteToken,
        remoteId: remoteData.remoteId,
        userData: remoteData.userData || {},
        passwords: remoteData.passwords || [],
        notes: remoteData.notes || []
      });
      
      // Токен не меняется - остается локальный
      return response.data;
    } catch (error) {
      console.error('Remote account connection error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.error || 'Remote account connection failed');
    }
  },

  // ✅ НОВОЕ: Облачный вход
  async cloudLogin(credentials) {
    try {
      // Отправляем данные облачного аккаунта на локальный сервер
      const response = await api.post('/auth/cloud-login', {
        email: credentials.email,
        username: credentials.username,
        masterPassword: credentials.masterPassword
      });
      
      // Если успешно, сохраняем локальный токен
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Cloud login error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.error || 'Cloud login failed');
    }
  },

  // ✅ НОВОЕ: Верификация OTP для облачного входа
  async verifyCloudOTP(otpCode, username) {
    try {
      const response = await api.post('/auth/verify-cloud-otp', {
        otpCode: otpCode,
        username: username
      });
      
      // Если успешно, сохраняем локальный токен
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('OTP verification error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.error || 'OTP verification failed');
    }
  },

  // ✅ НОВОЕ: Использование transfer токена
  async useTransferToken(transferToken) {
    try {
      // Отправляем transfer токен на локальный сервер
      const response = await api.post('/auth/use-transfer', {
        transferToken: transferToken
      });
      
      // Если успешно, сохраняем локальный токен
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Transfer token error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.error || 'Transfer token usage failed');
    }
  }
};

// Проверка истечения JWT токена
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // JWT exp в секундах, конвертируем в мс
    return Date.now() >= exp;
  } catch (e) {
    console.error('[AuthService] Failed to parse token:', e);
    return true;
  }
}

export const remoteService = {
  // Get remote connection status
  async getStatus() {
    try {
      console.log('🔄 Checking sync status...');
      const response = await api.get('/sync/status');
      console.log('🔄 Sync status response:', response.data);
      
      const { 
        syncEnabled, 
        remoteServerAvailable, 
        hasRemoteAccount, 
        tokenValid,  // Теперь проверяется на сервере
        canSync, 
        unsyncedNotes, 
        unsyncedPasswords 
      } = response.data;
      
      console.log('🔄 Token status from server: hasRemoteAccount=', hasRemoteAccount, 'tokenValid=', tokenValid);
      
      return {
        hasRemoteAccount: hasRemoteAccount,
        remoteServerAvailable: remoteServerAvailable,
        tokenValid: tokenValid,
        canSync: canSync,
        unsyncedNotes: unsyncedNotes || 0,
        unsyncedPasswords: unsyncedPasswords || 0,
        message: tokenValid ? 
          `Connected to cloud sync` : 
          hasRemoteAccount && !tokenValid ?
            'Cloud session expired. Please re-login.' :
            'Ready to setup cloud sync'
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      
      // Если ошибка 401, значит пользователь не авторизован локально
      if (error.response?.status === 401) {
        return {
          hasRemoteAccount: false,
          remoteServerAvailable: false,
          tokenValid: false,
          canSync: false,
          unsyncedNotes: 0,
          unsyncedPasswords: 0,
          message: 'Please login first'
        };
      }
      
      // Другие ошибки - проблемы с сервером
      return {
        hasRemoteAccount: false,
        remoteServerAvailable: false,
        tokenValid: false,
        canSync: false,
        unsyncedNotes: 0,
        unsyncedPasswords: 0,
        message: 'Failed to connect to local server'
      };
    }
  },

  // Register on remote server
  async register() {
    try {
      const response = await api.post('/remote/register');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Remote registration failed');
    }
  },

  // Login to remote server
  async login() {
    try {
      const response = await api.post('/remote/login');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Remote login failed');
    }
  },

  // Disconnect from remote
  async disconnect() {
    try {
      const response = await api.post('/remote/disconnect');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to disconnect from remote');
    }
  }
};

export const syncService = {
  // Push data to remote
  async pushToRemote(options = {}) {
    try {
      const response = await api.post('/sync/push', {
        syncNotes: options.syncNotes !== false,
        syncPasswords: options.syncPasswords !== false,
        forceSync: options.forceSync || false
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to push to remote');
    }
  },

  // Pull data from remote
  async pullFromRemote() {
    try {
      const response = await api.post('/sync/pull');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to pull from remote');
    }
  }
};

export const passwordService = {
  // Get all passwords
  async getAll() {
    try {
      const response = await api.get('/passwords');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch passwords');
    }
  },

  // Create new password
  async create(passwordData) {
    try {
      const response = await api.post('/passwords', passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create password');
    }
  },

  // Update password
  async update(id, passwordData) {
    try {
      const response = await api.put(`/passwords/${id}`, passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update password');
    }
  },

  // Delete password
  async delete(id) {
    try {
      await api.delete(`/passwords/${id}`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete password');
    }
  }
};

export const noteService = {
  // Get all notes
  async getAll() {
    try {
      const response = await api.get('/notes');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notes');
    }
  },

  // Create new note
  async create(noteData) {
    try {
      const response = await api.post('/notes', noteData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create note');
    }
  },

  // Update note
  async update(id, noteData) {
    try {
      const response = await api.put(`/notes/${id}`, noteData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update note');
    }
  },

  // Delete note
  async delete(id) {
    try {
      await api.delete(`/notes/${id}`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete note');
    }
  }
};

export default api; 