import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const WarningModal = ({ message, show, onHide }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        if (onHide) onHide();
      }, 2000); // Автоматически скрываем через 2 секунды

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 'var(--spacing-xl)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <motion.div
            initial={{ y: -50, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -50, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30 
            }}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--color-danger)',
              boxShadow: '0 10px 40px rgba(239, 68, 68, 0.3)',
              padding: 'var(--spacing-lg)',
              maxWidth: '400px',
              width: '90%',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)'
            }}
            onClick={onHide}
          >
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '50%',
              padding: 'var(--spacing-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle 
                size={24} 
                style={{ color: 'var(--color-danger)' }} 
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {message}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WarningModal; 