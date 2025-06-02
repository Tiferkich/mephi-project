import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';

const ToastContainer = ({ toasts, onHideToast }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 'var(--spacing-lg)',
      right: 'var(--spacing-lg)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30,
              delay: index * 0.05 // Небольшая задержка для каскадного эффекта
            }}
            style={{
              pointerEvents: 'auto',
              width: '350px',
              maxWidth: '90vw'
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              show={toast.show}
              onHide={() => onHideToast(toast.id)}
              duration={0} // Отключаем автоматическое скрытие, так как это управляется в useToast
              closable={toast.closable !== false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer; 