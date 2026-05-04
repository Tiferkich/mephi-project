/**
 * Base contract for device security / antivirus status detection.
 * Subclass per platform (Windows, macOS, Linux).
 */
class SecurityProvider {
  getPlatformId() {
    return process.platform;
  }

  /**
   * @returns {Promise<import('./index').SecuritySnapshot>}
   */
  async detect() {
    throw new Error('detect() must be implemented by subclass');
  }
}

module.exports = { SecurityProvider };
