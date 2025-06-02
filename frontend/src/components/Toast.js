import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const Toast = ({ 
  message, 
  type = 'info', // 'success', 'warning', 'error', 'info'
  show, 
  onHide, 
  duration = 2000,
  closable = true 
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        if (onHide) onHide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, onHide, duration]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          borderColor: 'var(--color-success)',
          shadowColor: 'rgba(34, 197, 94, 0.3)',
          iconBg: 'rgba(34, 197, 94, 0.1)',
          iconColor: 'var(--color-success)'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          borderColor: 'var(--color-warning)',
          shadowColor: 'rgba(245, 158, 11, 0.3)',
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: 'var(--color-warning)'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          borderColor: 'var(--color-danger)',
          shadowColor: 'rgba(239, 68, 68, 0.3)',
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: 'var(--color-danger)'
        };
      case 'info':
      default:
        return {
          icon: Info,
          borderColor: 'var(--color-info)',
          shadowColor: 'rgba(59, 130, 246, 0.3)',
          iconBg: 'rgba(59, 130, 246, 0.1)',
          iconColor: 'var(--color-info)'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
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
            border: `1px solid ${config.borderColor}`,
            boxShadow: `0 10px 40px ${config.shadowColor}`,
            padding: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            cursor: closable ? 'pointer' : 'default'
          }}
          onClick={closable ? onHide : undefined}
        >
          <div style={{
            background: config.iconBg,
            borderRadius: '50%',
            padding: 'var(--spacing-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon 
              size={24} 
              style={{ color: config.iconColor }} 
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

          {closable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onHide) onHide();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 'var(--spacing-xs)',
                borderRadius: 'var(--border-radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast; 