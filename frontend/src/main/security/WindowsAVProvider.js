const { execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const path = require('path');
const { SecurityProvider } = require('./SecurityProvider');

/**
 * 32-bit `powershell` из syswow64 (часто в PATH) может не нормально читать Defender/MP-API; всегда 64-bit.
 */
function getWindowsPowerShell64() {
  const root = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
  if (os.platform() !== 'win32') {
    return 'powershell.exe';
  }
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

const execFileAsync = promisify(execFile);

const CACHE_TTL_MS = 3000;
const POWERSHELL_TIMEOUT_MS = 5000;

const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$wsc = @()
try {
  $items = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct
  if ($null -eq $items) { $items = @() }
  $items = @($items)
  foreach ($p in $items) {
    $wsc += [pscustomobject]@{
      displayName = $p.displayName
      name = $p.name
      instanceGuid = if ($p.instanceGuid) { $p.instanceGuid.ToString() } else { $null }
      productState = if ($p.productState -ne $null) { $p.productState } else { $null }
    }
  }
} catch {
  $wsc = @()
}
$defRtp = $null
$mpDisableRT = $null
$ErrorActionPreference = 'SilentlyContinue'
try {
  if (Get-Command Get-MpComputerStatus -ErrorAction SilentlyContinue) {
    $mcs = Get-MpComputerStatus
    if ($null -ne $mcs) { $defRtp = [bool]$mcs.RealTimeProtectionEnabled }
  }
} catch { }
try {
  if (Get-Command Get-MpPreference -ErrorAction SilentlyContinue) {
    $pref = Get-MpPreference
    if ($null -ne $pref) { $mpDisableRT = [bool]$pref.DisableRealtimeMonitoring }
  }
} catch { }
[pscustomobject]@{ wsc = $wsc; defenderRealtime = $defRtp; mpDisableRealtimeMonitoring = $mpDisableRT } | ConvertTo-Json -Compress -Depth 6
`.trim();

/**
 * WSC productState: бит 0x1000 = real-time ON; 0xF0 (биты 4–7) — сигнатуры.
 * Для Microsoft Defender приоритетно подставляем Get-MpComputerStatus (см. _applyDefenderFromMp),
 * т.к. nibble-эвристики и устаревшее WSC дают «RT включён» при реально выключенной защите.
 * @param {number} state
 */
function parseProductStateRefined(state) {
  if (state === null || state === undefined) {
    return { realtimeProtection: null, definitionsUpToDate: null };
  }
  const s = state >>> 0;
  if (s === 0) {
    return { realtimeProtection: false, definitionsUpToDate: true };
  }
  const rtOn = (s & 0x1000) === 0x1000;
  const signaturesStale = (s & 0xf0) !== 0;
  return {
    realtimeProtection: rtOn,
    definitionsUpToDate: !signaturesStale,
  };
}

const THIRD_PARTY_AV = /(kaspersky|eset|norton|avast|avg|bitdefender|sophos|trend|mcafee|drweb|kaspers|каспер|нортон|аваст|авира|f-secure)/i;

/**
 * @param {string} name
 */
function isMicrosoftDefenderLabel(name) {
  if (!name) return false;
  if (THIRD_PARTY_AV.test(name)) return false;
  const n = name.toLowerCase();
  if (n.includes('defender')) return true;
  if (n.includes('защитник')) return true;
  if (n.includes('антивирус') && (n.includes('microsoft') || n.includes('майкрософт') || n.includes('windows'))) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} v
 * @returns {boolean|null}
 */
function coerceBoolish(v) {
  if (typeof v === 'boolean') return v;
  if (v === true || v === false) return v;
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return null;
}

/**
 * Сначала Get-MpPreference:DisableRealtimeMonitoring (совпадает с тумблёром «в реальном времени»),
 * затем Get-MpComputerStatus:RealTimeProtectionEnabled.
 * @param {unknown} mcsRtp
 * @param {unknown} mpDisableRealtime
 */
function effectiveDefenderRealTime(mcsRtp, mpDisableRealtime) {
  const d = coerceBoolish(mpDisableRealtime);
  if (d !== null) {
    return !d;
  }
  return coerceBoolish(mcsRtp);
}

/**
 * Точный статус RTP для встроенного Защитника Windows.
 * @param {Array<{name:string, enabled: boolean, realtimeProtection: boolean|null, definitionsUpToDate: boolean|null, raw: object}>} products
 * @param {boolean|null|undefined} mpRtp
 * @param {boolean|null|undefined} [mpDisableRealtime] Get-MpPreference.DisableRealtimeMonitoring
 */
function _applyDefenderFromMp(products, mpRtp, mpDisableRealtime) {
  const on = effectiveDefenderRealTime(mpRtp, mpDisableRealtime);
  if (on == null) return;
  const matched = products.filter((p) => isMicrosoftDefenderLabel(p.name));
  const targets = matched.length
    ? matched
    : products.length === 1
      ? products
      : [];
  for (const p of targets) {
    p.realtimeProtection = Boolean(on);
    p.enabled = p.realtimeProtection;
    p.raw = { ...p.raw, defenderMpStatus: on, fromMpPreferenceFallback: !matched.length && products.length === 1 };
  }
}

class WindowsAVProvider extends SecurityProvider {
  constructor() {
    super();
    this._cache = null;
    this._cacheTime = 0;
  }

  getPlatformId() {
    return 'win32';
  }

  async _runPowerShell() {
    const { stdout } = await execFileAsync(
      getWindowsPowerShell64(),
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_SCRIPT],
      { timeout: POWERSHELL_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 }
    );
    return stdout || '{}';
  }

  /**
   * @returns {{ items: any[], defenderRealtime: boolean|null }}
   */
  _parsePowershellOutput(raw) {
    const t = (raw || '')
      .trim()
      .replace(/^\uFEFF/, '');
    if (!t) return { items: [], defenderRealtime: null, mpDisableRealtimeMonitoring: null };
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) {
      return { items: parsed, defenderRealtime: null, mpDisableRealtimeMonitoring: null };
    }
    if (parsed && typeof parsed === 'object') {
      const wsc = parsed.wsc || parsed.Wsc;
      if (Array.isArray(wsc)) {
        return {
          items: wsc,
          defenderRealtime: coerceBoolish(parsed.defenderRealtime ?? parsed.DefenderRealtime),
          mpDisableRealtimeMonitoring: coerceBoolish(
            parsed.mpDisableRealtimeMonitoring ?? parsed.MpDisableRealtimeMonitoring
          ),
        };
      }
    }
    return { items: [], defenderRealtime: null, mpDisableRealtimeMonitoring: null };
  }

  async _detectNoCache() {
    let rawJson;
    try {
      rawJson = await this._runPowerShell();
    } catch (e) {
      return {
        platform: 'win32',
        hostname: os.hostname(),
        antivirusProducts: [],
        overallEnabled: false,
        overallDefinitionsUpToDate: null,
        collectedAt: new Date().toISOString(),
        providerVersion: '1.0.3',
        error: e.message,
      };
    }

    const { items, defenderRealtime, mpDisableRealtimeMonitoring } =
      this._parsePowershellOutput(rawJson);
    const products = items.map((row) => {
      const name = row.displayName || row.name || 'Unknown';
      let stateNum = row.productState;
      if (typeof stateNum === 'string' && /^\d+$/.test(stateNum)) {
        stateNum = parseInt(stateNum, 10);
      }
      const p = parseProductStateRefined(stateNum);
      return {
        name,
        enabled: p.realtimeProtection === true,
        realtimeProtection: p.realtimeProtection,
        definitionsUpToDate: p.definitionsUpToDate,
        raw: { productState: stateNum },
      };
    });

    _applyDefenderFromMp(products, defenderRealtime, mpDisableRealtimeMonitoring);

    const overallEnabled = products.some((p) => p.realtimeProtection === true);
    const allDefs = products
      .map((p) => p.definitionsUpToDate)
      .filter((d) => d !== null);
    const overallDefinitionsUpToDate = allDefs.length ? allDefs.every((d) => d) : null;

    return {
      platform: 'win32',
      hostname: os.hostname(),
      antivirusProducts: products,
      overallEnabled,
      overallDefinitionsUpToDate,
      collectedAt: new Date().toISOString(),
      providerVersion: '1.0.3',
    };
  }

  /**
   * @param {boolean} [force] обойти кеш
   * @returns {Promise<import('./index').SecuritySnapshot>}
   */
  async detect(force = false) {
    if (!force && this._cache && Date.now() - this._cacheTime < CACHE_TTL_MS) {
      return { ...this._cache, collectedAt: this._cache.collectedAt };
    }
    const snap = await this._detectNoCache();
    this._cache = snap;
    this._cacheTime = Date.now();
    return snap;
  }
}

module.exports = {
  WindowsAVProvider,
  parseProductStateRefined,
  isMicrosoftDefenderLabel,
  _applyDefenderFromMp,
};
