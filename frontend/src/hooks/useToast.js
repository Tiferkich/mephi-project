import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      show: true,
      ...options
    };

    setToasts(prev => [...prev, toast]);

    // Автоматически удаляем toast
    const duration = options.duration !== undefined ? options.duration : 2000;
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Удобные методы для разных типов
  const showSuccess = useCallback((message, options) => 
    showToast(message, 'success', options), [showToast]);
  
  const showError = useCallback((message, options) => 
    showToast(message, 'error', options), [showToast]);
  
  const showWarning = useCallback((message, options) => 
    showToast(message, 'warning', options), [showToast]);
  
  const showInfo = useCallback((message, options) => 
    showToast(message, 'info', options), [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}; 