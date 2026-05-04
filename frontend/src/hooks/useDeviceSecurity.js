import { useState, useCallback, useEffect } from 'react';
import * as securityService from '../services/securityService';

const initial = {
  status: 'unknown',
  snapshot: null,
  denyReason: null,
  lastCheckId: null,
  lastCheckedAt: null,
  policy: null,
  error: null,
};

/**
 * @param {{ autoRun?: boolean }} [options]
 */
export function useDeviceSecurity(options = {}) {
  const { autoRun = true } = options;
  const [state, setState] = useState(initial);

  const recheck = useCallback(async () => {
    setState((s) => ({ ...s, status: 'checking', error: null }));
    try {
      const result = await securityService.runFullCheck();
      securityService.storeCheckResult(result);
      const allowed = result.allowed !== false;
      setState({
        status: allowed ? 'allowed' : 'denied',
        snapshot: result.snapshot,
        denyReason: result.denyReason || null,
        lastCheckId: result.checkId || null,
        lastCheckedAt: new Date().toISOString(),
        policy: result.policy || null,
        error: null,
      });
      return result;
    } catch (e) {
      setState((prev) => ({
        ...prev,
        status: 'unknown',
        error: e.message || 'Security check failed',
      }));
      throw e;
    }
  }, []);

  useEffect(() => {
    if (autoRun) {
      recheck().catch(() => {});
    }
  }, [autoRun, recheck]);

  return { ...state, recheck };
}
