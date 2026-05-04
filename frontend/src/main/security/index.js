const { WindowsAVProvider } = require('./WindowsAVProvider');
const { StubAVProvider } = require('./StubAVProvider');

/**
 * @typedef {Object} AntivirusProduct
 * @property {string} name
 * @property {boolean} enabled
 * @property {boolean|null} realtimeProtection
 * @property {boolean|null} definitionsUpToDate
 * @property {Object} [raw]
 */

/**
 * @typedef {Object} SecuritySnapshot
 * @property {string} platform
 * @property {string} [hostname]
 * @property {AntivirusProduct[]} antivirusProducts
 * @property {boolean} overallEnabled
 * @property {boolean|null} [overallDefinitionsUpToDate]
 * @property {string} collectedAt
 * @property {string} providerVersion
 * @property {string} [error]
 */

/**
 * @returns {import('./SecurityProvider').SecurityProvider}
 */
function createSecurityProvider() {
  if (process.platform === 'win32') {
    return new WindowsAVProvider();
  }
  return new StubAVProvider();
}

module.exports = {
  createSecurityProvider,
  WindowsAVProvider,
  StubAVProvider,
};
