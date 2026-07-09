import { config } from '../config/index.js';
import { LocalProvider } from './local.provider.js';

let provider;

export function getStorage() {
  if (provider) return provider;

  switch (config.storage.provider) {
    case 'cloudinary': {
      const { CloudinaryProvider } = require('./cloudinary.provider.js');
      provider = new CloudinaryProvider();
      break;
    }
    case 'local':
    default:
      provider = new LocalProvider();
  }

  return provider;
}
