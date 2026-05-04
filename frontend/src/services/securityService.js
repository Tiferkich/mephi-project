import axios from 'axios';

const API_BASE_URL =
  window.electronAPI?.localServerUrl ||
  process.env.REACT_APP_LOCAL_SERVER_URL ||
  'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * @param {boolean} [forceRefresh] обойти кэш main-process (нужен при каждой проверке, иначе до 10 с виден устаревший «OK»)
 * @returns {Promise<Object|null>} snapshot from Electron main
 */
export async function getDeviceSnapshot(forceRefresh = true) {
  if (typeof window !== 'undefined' && window.electronAPI?.security) {
    return await window.electronAPI.security.getStatus(!!forceRefresh);
  }
  return null;
}

/**
 * @param {Object} snapshot
 * @returns {Promise<{ allowed: boolean, denyReason: string|null, checkId: string, policy: object }>}
 */
export async function submitCheck(snapshot) {
  const response = await api.post('/security/check', { snapshot });
  return response.data;
}

/**
 * @returns {Promise<{ allowed: boolean, denyReason: string|null, checkId: string, policy: object, snapshot: object }>}
 */
export async function runFullCheck() {
  let snapshot = await getDeviceSnapshot();
  if (!snapshot) {
    snapshot = {
      platform: 'web',
      hostname: typeof window !== 'undefined' ? window.location?.hostname : 'app',
      antivirusProducts: [],
      overallEnabled: false,
      overallDefinitionsUpToDate: null,
      collectedAt: new Date().toISOString(),
      providerVersion: 'no-electron',
    };
  }
  lastSnapshot = snapshot;
  const result = await submitCheck(snapshot);
  return { ...result, snapshot };
}

/**
 * @returns {Promise<object>}
 */
export async function getPolicy() {
  const { data } = await api.get('/security/policy');
  return data;
}

/**
 * @returns {Promise<void>}
 */
export async function openDefender() {
  if (typeof window !== 'undefined' && window.electronAPI?.security?.openDefender) {
    await window.electronAPI.security.openDefender();
  }
}

let lastCheckId = null;
let lastCheckAt = null;
/** @type {object|null} */
let lastSnapshot = null;

export function getLastSnapshot() {
  return lastSnapshot;
}

export function getLastCheckId() {
  return lastCheckId;
}

export function setLastCheckId(id) {
  lastCheckId = id;
  lastCheckAt = id ? new Date().toISOString() : null;
}

export function getLastCheckAt() {
  return lastCheckAt;
}

/**
 * After runFullCheck, stores checkId for auth
 */
export function storeCheckResult(result) {
  if (result?.checkId) {
    setLastCheckId(result.checkId);
  }
}
