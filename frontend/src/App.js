import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { authService } from './services/authService';
import { secureService } from './services/secureService';
import { resetWidgets } from './services/widgetService';
import { runFullCheck, storeCheckResult } from './services/securityService';
import { SecurityBlockedScreen } from './components/SecurityBlockedScreen';
import './styles/variables.css';
import './styles/globals.css';

// App states
const APP_STATES = {
  LOADING: 'loading',
  SETUP: 'setup',
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  SECURITY_BLOCKED: 'security_blocked',
};

function App() {
  const [appState, setAppState] = useState(APP_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [securityBlockedInfo, setSecurityBlockedInfo] = useState({
    reason: null,
    snapshot: null,
  });

  // Check app initialization state
  useEffect(() => {
    initializeApp();
  }, []);

  // Setup Electron menu listeners
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event) => {
        handleMenuAction(event);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-new-entry');
        window.electronAPI.removeAllListeners('menu-lock');
        window.electronAPI.removeAllListeners('menu-sync-push');
        window.electronAPI.removeAllListeners('menu-sync-pull');
        window.electronAPI.removeAllListeners('menu-remote-settings');
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Проверяем есть ли сохраненный токен
      const savedToken = localStorage.getItem('authToken');
      
      if (savedToken) {
        try {
          // Валидируем токен
          const userData = await authService.validateToken(savedToken);
          setUser(userData);
          setAppState(APP_STATES.DASHBOARD);
          return;
        } catch (error) {
          // Токен недействителен, удаляем его
          localStorage.removeItem('authToken');
          console.log('Saved token is invalid, removed');
        }
      }

      // Контроль устройства перед входом/настройкой
      try {
        const sec = await runFullCheck();
        storeCheckResult(sec);
        if (sec.allowed === false) {
          setSecurityBlockedInfo({ reason: sec.denyReason, snapshot: sec.snapshot });
          setAppState(APP_STATES.SECURITY_BLOCKED);
          return;
        }
      } catch (secErr) {
        console.error('Security pre-check failed:', secErr);
        setError(
          'Не удалось проверить безопасность устройства. Запустите локальный сервер (порт 3001).'
        );
        setAppState(APP_STATES.SETUP);
        return;
      }

      // Проверяем статус настройки сервера
      const setupStatus = await authService.checkSetupStatus();
      
      if (setupStatus.error) {
        setError(setupStatus.error);
        setAppState(APP_STATES.SETUP); // Показываем setup даже если сервер недоступен
        return;
      }

      if (setupStatus.isSetup) {
        setAppState(APP_STATES.LOGIN);
      } else {
        setAppState(APP_STATES.SETUP);
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError('Failed to connect to local server. Please make sure it is running.');
      setAppState(APP_STATES.SETUP);
    }
  };

  const handleSetupComplete = (userData) => {
    setUser(userData);
    setError(null);
    setAppState(APP_STATES.DASHBOARD);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setError(null);
    setAppState(APP_STATES.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setAppState(APP_STATES.LOGIN);
  };

  const handleUserDataChange = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleAccountDeleted = async () => {
    try {
      await secureService.lock();
    } catch (e) {
      console.warn('lock after account delete:', e);
    }
    try {
      authService.logout();
      localStorage.removeItem('vaultBackupHistory');
      resetWidgets();
    } catch (e) {
      console.warn('cleanup after account delete:', e);
    }
    setUser(null);
    setAppState(APP_STATES.SETUP);
  };

  const handleGoToSetup = () => {
    setError(null);
    setAppState(APP_STATES.SETUP);
  };

  const handleGoToLogin = () => {
    setError(null);
    setAppState(APP_STATES.LOGIN);
  };

  const handleSecurityRetry = async (result) => {
    if (result?.allowed) {
      setSecurityBlockedInfo({ reason: null, snapshot: null });
      setAppState(APP_STATES.LOADING);
      await initializeApp();
    } else {
      setSecurityBlockedInfo({ reason: result?.denyReason, snapshot: result?.snapshot });
    }
  };

  const handleMenuAction = (event) => {
    switch (event) {
      case 'menu-new-entry':
        // Handle new entry creation
        console.log('New entry requested from menu');
        break;
      case 'menu-lock':
        handleLogout();
        break;
      case 'menu-sync-push':
        // Handle sync to remote
        console.log('Sync push requested from menu');
        break;
      case 'menu-sync-pull':
        // Handle sync from remote  
        console.log('Sync pull requested from menu');
        break;
      case 'menu-remote-settings':
        // Handle remote settings
        console.log('Remote settings requested from menu');
        break;
      default:
        console.log('Unknown menu action:', event);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3
  };

  return (
    <div className="App">
      <AnimatePresence mode="wait">
        {appState === APP_STATES.LOADING && (
          <motion.div
            key="loading"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <LoadingScreen />
          </motion.div>
        )}

        {appState === APP_STATES.SECURITY_BLOCKED && (
          <motion.div
            key="security_blocked"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <SecurityBlockedScreen
              denyReason={securityBlockedInfo.reason}
              snapshot={securityBlockedInfo.snapshot}
              onRetry={handleSecurityRetry}
            />
          </motion.div>
        )}

        {appState === APP_STATES.SETUP && (
          <motion.div
            key="setup"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <SetupPage 
              onSetupComplete={handleSetupComplete}
              isFirstTime={true}
              serverError={error}
              onSecurityBlocked={({ reason, snapshot }) => {
                setSecurityBlockedInfo({ reason, snapshot });
                setAppState(APP_STATES.SECURITY_BLOCKED);
              }}
            />
          </motion.div>
        )}

        {appState === APP_STATES.LOGIN && (
          <motion.div
            key="login"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <LoginPage 
              onLoginSuccess={handleLoginSuccess}
              onGoToSetup={handleGoToSetup}
              onSecurityBlocked={({ reason, snapshot }) => {
                setSecurityBlockedInfo({ reason, snapshot });
                setAppState(APP_STATES.SECURITY_BLOCKED);
              }}
            />
          </motion.div>
        )}

        {appState === APP_STATES.DASHBOARD && (
          <motion.div
            key="dashboard"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <DashboardPage 
              user={user}
              onLogout={handleLogout}
              onUserDataChange={handleUserDataChange}
              onAccountDeleted={handleAccountDeleted}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App; 