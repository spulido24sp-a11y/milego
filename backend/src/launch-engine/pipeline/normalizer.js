import { DropiAdapter } from '../adapters/dropi.adapter.js';
import { ManualAdapter } from '../adapters/manual.adapter.js';

const adapters = {
  dropi: new DropiAdapter(),
  manual: new ManualAdapter()
};

export class Normalizer {
  /**
   * Normalizes raw input payload into standard MIleGo internal contract
   * @param {string} providerName 
   * @param {Object} rawData 
   * @returns {Object} Standardized contract
   */
  normalize(providerName, rawData) {
    const adapter = adapters[providerName?.toLowerCase()];
    if (!adapter) {
      throw new Error(`Proveedor no soportado en normalización: ${providerName}`);
    }
    return adapter.normalize(rawData);
  }
}
