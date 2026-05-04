import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw, Shield, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import * as securityService from '../../services/securityService';
import './SecurityBlockedScreen.css';

export function SecurityBlockedScreen({ denyReason, snapshot, onRetry }) {
  const [loading, setLoading] = useState(false);

  const products = snapshot?.antivirusProducts || [];
  const defaultReason =
    denyReason ||
    'Антивирусная защита в реальном времени не активна. Включите защиту, чтобы продолжить.';

  const handleRetry = async () => {
    setLoading(true);
    try {
      const result = await securityService.runFullCheck();
      securityService.storeCheckResult(result);
      if (onRetry) await onRetry(result);
    } finally {
      setLoading(false);
    }
  };

  const openDef = async () => {
    try {
      await securityService.openDefender();
    } catch (e) {
      console.warn(e);
    }
  };

  const hasElectron =
    typeof window !== 'undefined' && !!window.electronAPI?.security;

  return (
    <div className="security-blocked-root">
      <motion.div
        className="security-blocked-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Icon */}
        <div className="security-blocked-icon" aria-hidden>
          <ShieldAlert size={36} color="var(--color-danger)" />
        </div>

        {/* Title */}
        <h1 className="security-blocked-title">Доступ ограничен</h1>
        <p className="security-blocked-reason">
          Ваше устройство не соответствует политике безопасности.
        </p>

        {/* Alert message */}
        <div className="security-blocked-alert">
          <span className="security-blocked-alert-icon">
            <ShieldAlert size={15} />
          </span>
          <span>{defaultReason}</span>
        </div>

        {/* AV products list */}
        {products.length > 0 && (
          <ul className="security-blocked-products">
            {products.map((p, i) => (
              <li key={`${p.name}-${i}`}>
                <span className="security-blocked-product-name">
                  <Shield size={13} color="var(--text-secondary)" />
                  {p.name}
                </span>
                <span
                  className={`security-blocked-product-status ${
                    p.realtimeProtection
                      ? 'security-blocked-product-status--ok'
                      : 'security-blocked-product-status--off'
                  }`}
                >
                  {p.realtimeProtection ? (
                    <>
                      <CheckCircle size={11} />
                      RT включена
                    </>
                  ) : (
                    <>
                      <XCircle size={11} />
                      RT выключена
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="security-blocked-actions">
          <button
            type="button"
            className="security-blocked-btn security-blocked-btn-primary"
            onClick={handleRetry}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? 'sb-spin' : undefined}
            />
            {loading ? 'Проверка…' : 'Повторить проверку'}
          </button>

          {hasElectron && (
            <button
              type="button"
              className="security-blocked-btn security-blocked-btn-secondary"
              onClick={openDef}
            >
              <ExternalLink size={15} />
              Открыть «Безопасность Windows»
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default SecurityBlockedScreen;
