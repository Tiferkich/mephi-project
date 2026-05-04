const os = require('os');
const { SecurityProvider } = require('./SecurityProvider');

/**
 * Non-Windows: allow access by default; later replace with MacOSAVProvider / LinuxAVProvider.
 */
class StubAVProvider extends SecurityProvider {
  async detect(_force = false) {
    return {
      platform: process.platform,
      hostname: os.hostname(),
      antivirusProducts: [
        {
          name: 'stub',
          enabled: true,
          realtimeProtection: true,
          definitionsUpToDate: true,
          raw: { stub: true },
        },
      ],
      overallEnabled: true,
      overallDefinitionsUpToDate: true,
      collectedAt: new Date().toISOString(),
      providerVersion: 'stub',
    };
  }
}

module.exports = { StubAVProvider };
