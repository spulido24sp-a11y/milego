import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../../config/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function runTest() {
  console.log('=== Dropi API Connectivity Proof ===');
  
  const token = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;
  const enabled = process.env.DROPI_PROVIDER_ENABLED || config.dropiProviderEnabled;
  const productId = process.env.DROPI_TEST_PRODUCT_ID || '14166';

  if (!enabled || enabled === 'false') {
    console.log('[Feature Flag] DROPI_PROVIDER_ENABLED is disabled. Skipping real connection.');
    return;
  }

  if (!token) {
    console.log('[WARNING] No real DROPI_INTEGRATION_KEY provided in environment variables.');
    console.log('To run this against the live API, execute:');
    console.log('  DROPI_PROVIDER_ENABLED=true DROPI_INTEGRATION_KEY="your_key" npm run test:dropi\n');
    console.log('Falling back to local sample JSON check...');
    
    // Load and log the local sample file
    const sample = JSON.parse(readFileSync(`${__dirname}samples/dropi-product.json`, 'utf8'));
    console.log(`GET /api/v1/products/${productId} (FALLBACK SAMPLE)`);
    console.log('Status: 200 OK');
    console.log('JSON recibido:');
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  // Real connection test
  const url = `https://api.dropi.co/api/v1/products/${productId}`;
  console.log(`GET ${url}`);
  console.log('Headers: { "dropi-integration-key": "MASKED" }');

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'dropi-integration-key': token,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      console.log(`Status: ${res.status} OK`);
      console.log('JSON recibido:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log('Error details:', text);
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

runTest();
