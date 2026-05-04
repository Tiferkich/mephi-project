/**
 * Сервис для интеграции с удаленным сервером
 * Обеспечивает синхронизацию и восстановление данных
 * Все запросы проходят через локальный сервер
 */

const LOCAL_SERVER_URL =
  window.electronAPI?.localServerUrl ||
  process.env.REACT_APP_LOCAL_SERVER_URL ||
  'http://localhost:3001';
const REMOTE_PROXY_URL = `${LOCAL_SERVER_URL}/remote-proxy`;

class RemoteService {
  constructor() {
    this.remoteToken = localStorage.getItem('remoteToken');
    this.remoteId = localStorage.getItem('remoteId');
  }

  // ✅ НОВОЕ: Получение локального JWT токена
  getLocalToken() {
    return localStorage.getItem('authToken');
  }

  // ✅ НОВОЕ: Создание заголовков с локальным JWT токеном
  getAuthHeaders() {
    const localToken = this.getLocalToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
      console.log('🔐 Добавляем локальный JWT токен в запрос');
    } else {
      console.warn('⚠️ Локальный JWT токен не найден!');
    }
    
    return headers;
  }

  // ✅ НОВОЕ: Подключение синхронизации с email и OTP
  async setupSync(userData) {
    try {
      console.log('🔄 Starting sync setup for:', userData.username, userData.email);
      
      const requestBody = JSON.stringify({
        username: userData.username,
        email: userData.email
        // passwordHash, salt, localUserId добавит локальный сервер автоматически из БД
      });
      
      console.log('🔄 Request body:', requestBody);
      console.log('🔄 Request URL:', `${REMOTE_PROXY_URL}/auth/sync-setup`);
      console.log('🔄 Headers:', this.getAuthHeaders());
      
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/sync-setup`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: requestBody
      });

      console.log('🔄 Sync setup response status:', response.status);
      console.log('🔄 Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('🔄 Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('❌ Response not ok, status:', response.status);
        let errorText = '';
        try {
          const error = await response.json();
          errorText = error.message || 'Sync setup failed';
          console.error('❌ Error response body:', error);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorText);
      }

      console.log('✅ Response is ok, parsing JSON...');
      const result = await response.json();
      console.log('✅ Sync setup success response:', result);
      
      // Возвращаем реальный ответ от сервера
      const finalResult = {
        success: result.success || true,
        message: result.message || 'OTP code sent to your email. Please verify to complete sync setup.',
        otpRequired: result.otpRequired || true,
        ...result // Включаем все дополнительные поля от сервера
      };
      
      console.log('✅ Final result:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('❌ Sync setup failed with error:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ НОВОЕ: Верификация OTP кода
  async verifyOtp(username, otpCode, otpType) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username,
          otpCode,
          otpType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'OTP verification failed');
      }

      const result = await response.json();
      
      // Если это верификация синхронизации, сохраняем токены
      if (otpType === 'SYNC_SETUP' && result.token) {
        this.remoteToken = result.token;
        this.remoteId = result.userId;
        localStorage.setItem('remoteToken', this.remoteToken);
        localStorage.setItem('remoteId', this.remoteId);
      }

      return {
        success: true,
        message: result.message,
        token: result.token,
        userId: result.userId
      };
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ НОВОЕ: Создание токена для переноса данных
  async createTransferToken(username, passwordHash) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/create-transfer-token`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username,
          passwordHash,
          deviceInfo: navigator.userAgent,
          ipAddress: 'auto' // Сервер определит IP
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transfer token creation failed');
      }

      const result = await response.json();
      
      return {
        success: true,
        transferToken: result.transferToken,
        expiresAt: result.expiresAt,
        message: 'Transfer token created successfully! You can now use this token on another device.'
      };
    } catch (error) {
      console.error('❌ Transfer token creation failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ НОВОЕ: Использование токена для переноса данных
  async useTransferToken(transferToken) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/use-transfer-token`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          transferToken,
          deviceInfo: navigator.userAgent,
          ipAddress: 'auto' // Сервер определит IP
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transfer token usage failed');
      }

      const result = await response.json();
      
      // Автоматически авторизуемся
      this.remoteToken = result.token;
      this.remoteId = result.userId;
      localStorage.setItem('remoteToken', this.remoteToken);
      localStorage.setItem('remoteId', this.remoteId);

      return {
        success: true,
        message: 'Data transferred successfully!',
        userData: result.userData,
        passwords: result.passwords || [],
        notes: result.notes || []
      };
    } catch (error) {
      console.error('❌ Transfer token usage failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Регистрация на удаленном сервере
  async registerRemoteUser(userData) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/register`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username: userData.username,
          passwordHash: userData.passwordHash,
          salt: userData.salt,
          localUserId: userData.localUserId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Remote registration failed');
      }

      const result = await response.json();
      
      return {
        success: true,
        message: 'Registration successful! Check your email for verification.',
        otpRequired: true,
        username: userData.username
      };
    } catch (error) {
      console.error('❌ Remote registration failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Авторизация на удаленном сервере
  async loginRemoteUser(credentials) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/login`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username: credentials.username,
          passwordHash: credentials.passwordHash
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Remote login failed');
      }

      const result = await response.json();
      
      this.remoteToken = result.token;
      this.remoteId = result.userId;
      localStorage.setItem('remoteToken', this.remoteToken);
      localStorage.setItem('remoteId', this.remoteId);

      return {
        success: true,
        remoteId: this.remoteId,
        remoteToken: this.remoteToken,
        userData: result.userData
      };
    } catch (error) {
      console.error('❌ Remote login failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Синхронизация паролей на удаленный сервер
  async syncPasswordsToRemote(passwords) {
    if (!this.remoteToken) {
      throw new Error('Not authenticated with remote server');
    }

    try {
      const headers = this.getAuthHeaders();
      // Добавляем удаленный токен для аутентификации на удаленном сервере
      // Локальный токен уже добавлен через getAuthHeaders()
      
      const response = await fetch(`${REMOTE_PROXY_URL}/sync/passwords`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Remote-Token': this.remoteToken // Передаем удаленный токен отдельно
        },
        body: JSON.stringify({ passwords })
      });

      if (!response.ok) {
        throw new Error('Failed to sync passwords to remote server');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Password sync failed:', error);
      throw error;
    }
  }

  // ✅ Синхронизация заметок на удаленный сервер
  async syncNotesToRemote(notes) {
    if (!this.remoteToken) {
      throw new Error('Not authenticated with remote server');
    }

    try {
      const headers = this.getAuthHeaders();
      
      const response = await fetch(`${REMOTE_PROXY_URL}/sync/notes`, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Remote-Token': this.remoteToken // Передаем удаленный токен отдельно
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error('Failed to sync notes to remote server');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Notes sync failed:', error);
      throw error;
    }
  }

  // ✅ Получение данных с удаленного сервера
  async pullDataFromRemote() {
    if (!this.remoteToken) {
      throw new Error('Not authenticated with remote server');
    }

    try {
      const headers = this.getAuthHeaders();
      headers['X-Remote-Token'] = this.remoteToken;
      
      const [passwordsResponse, notesResponse] = await Promise.all([
        fetch(`${REMOTE_PROXY_URL}/sync/passwords`, {
          headers: headers
        }),
        fetch(`${REMOTE_PROXY_URL}/sync/notes`, {
          headers: headers
        })
      ]);

      if (!passwordsResponse.ok || !notesResponse.ok) {
        throw new Error('Failed to fetch data from remote server');
      }

      const passwords = await passwordsResponse.json();
      const notes = await notesResponse.json();

      return {
        success: true,
        passwords: passwords.data || [],
        notes: notes.data || []
      };
    } catch (error) {
      console.error('❌ Pull data failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Проверка статуса подключения к удаленному серверу
  async checkRemoteConnection() {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/health-check`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });

      if (!response.ok) {
        return {
          connected: false,
          error: 'Health check failed'
        };
      }

      const result = await response.json();
      return {
        connected: result.remoteServerAvailable,
        status: result.status || 'unknown'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // ✅ Cloud Login - повторная авторизация когда токен истёк
  async cloudLogin({ email, username }) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/cloud-login`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email, username })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Cloud login failed');
      }

      const result = await response.json();
      
      return {
        success: true,
        requiresOTP: result.requiresOTP || true,
        sessionId: result.sessionId,
        message: result.message || 'OTP sent to email'
      };
    } catch (error) {
      console.error('❌ Cloud login failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Верификация OTP для Cloud Login
  async verifyCloudOTP({ otpCode, username }) {
    try {
      const response = await fetch(`${REMOTE_PROXY_URL}/auth/verify-cloud-otp`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ otpCode, username })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'OTP verification failed');
      }

      const result = await response.json();
      
      if (result.token) {
        this.remoteToken = result.token;
        this.remoteId = result.userId;
        localStorage.setItem('remoteToken', this.remoteToken);
        localStorage.setItem('remoteId', this.remoteId);
      }

      return {
        success: true,
        token: result.token,
        userId: result.userId,
        username: result.username,
        email: result.email,
        message: 'Cloud login successful'
      };
    } catch (error) {
      console.error('❌ Cloud OTP verification failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ Отключение от удаленного сервера
  logout() {
    this.remoteToken = null;
    this.remoteId = null;
    localStorage.removeItem('remoteToken');
    localStorage.removeItem('remoteId');
  }

  // ✅ Проверка авторизации на удаленном сервере
  isRemoteAuthenticated() {
    return Boolean(this.remoteToken && this.remoteId);
  }
}

export const remoteService = new RemoteService(); 