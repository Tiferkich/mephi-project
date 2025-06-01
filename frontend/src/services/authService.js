import axios from 'axios';
import { createMasterPasswordHash } from '../utils/crypto';

const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
      const response = await api.get('/auth/setup/status');
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

  // Register new user (first time setup) - ТОЛЬКО ЛОКАЛЬНО
  async register(userData) {
    try {
      const response = await api.post('/auth/register', {
        username: userData.username,
        salt: userData.salt,
        passwordHash: userData.masterPasswordHash // Отправляем SHA-256 хеш
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to local server. Please make sure the local server is running.');
      }
      
      throw new Error(error.response?.data?.message || 'Registration failed');
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
  }
};

export const remoteService = {
  // Get remote connection status
  async getStatus() {
    try {
      const response = await api.get('/remote/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get remote status:', error);
      return {
        hasRemoteAccount: false,
        remoteServerAvailable: false,
        tokenValid: false,
        canSync: false
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