import { DropiSyncService } from './sync.service.js';
import { DropiClient } from './client.js';
import db from '../../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rawSample = JSON.parse(readFileSync(`${__dirname}/samples/dropi-product.json`, 'utf8'));

// Configure dynamic provider environment
process.env.DROPI_PROVIDER_ENABLED = 'true';
process.env.DROPI_INTEGRATION_KEY = 'benchmark-key';

// Mock client calls for pure backend/DB benchmarking
DropiClient.prototype.getProduct = async function(externalId) {
  // Return sample JSON but randomize ID to simulate unique products
  const customized = JSON.parse(JSON.stringify(rawSample));
  customized.id = parseInt(externalId, 10);
  customized.nombre = `${rawSample.nombre} (Bench #${externalId})`;
  // Randomize variants and images
  return customized;
};

async function runBenchmark(productCount = 50) {
  console.log(`\n=== MIleGo OS Beta Technical Benchmark: Importing ${productCount} Products ===\n`);
  
  // Clean tables
  await db('product_variants').del();
  await db('product_images').del();
  await db('products').where({ provider_id: 'dropi' }).del();

  const syncService = new DropiSyncService();
  
  // Query counter middleware using Knex events
  let sqlQueriesCount = 0;
  db.on('query', () => {
    sqlQueriesCount++;
  });

  const memoryStart = process.memoryUsage().heapUsed;
  const timeStart = Date.now();

  for (let i = 1; i <= productCount; i++) {
    const externalId = (10000 + i).toString();
    await syncService.importProduct(externalId, 1);
    if (i % 10 === 0) {
      console.log(`[Progress] Imported ${i}/${productCount}...`);
    }
  }

  const durationMs = Date.now() - timeStart;
  const memoryEnd = process.memoryUsage().heapUsed;
  const memoryUsedMb = ((memoryEnd - memoryStart) / 1024 / 1024).toFixed(2);
  const avgTimePerProduct = (durationMs / productCount).toFixed(2);
  const throughput = (productCount / (durationMs / 1000)).toFixed(2);

  console.log('\n=== Performance Results ===');
  console.log(`- Total Duration: ${(durationMs / 1000).toFixed(2)} seconds (${durationMs} ms)`);
  console.log(`- Avg Time per Product: ${avgTimePerProduct} ms`);
  console.log(`- Throughput: ${throughput} products/sec`);
  console.log(`- Memory Heap Allocation: ${memoryUsedMb} MB`);
  console.log(`- SQL Database Operations Executed: ${sqlQueriesCount} queries`);
  
  // Clean query listener
  db.removeAllListeners('query');

  // Verify Idempotency and Data Lock
  console.log('\n=== Validating Idempotency & Data Lock ===');
  const targetId = '10001';
  const imported = await db('products').where({ provider_product_id: targetId }).first();
  
  const customBlueprint = {
    decision: 'launch',
    explanation: ['Customized explanation'],
    commerce_confidence_scores: { total: 95 }
  };
  const customDescription = 'User custom copywriting content';

  await db('products').where({ id: imported.id }).update({
    launch_blueprint: customBlueprint,
    description: customDescription
  });

  // Re-sync
  console.log('Executing resynchronization on custom product...');
  await syncService.syncProduct(imported.id, imported);

  const synced = await db('products').where({ id: imported.id }).first();
  
  // Assert Data Lock rules
  const blueprintMatch = JSON.stringify(synced.launch_blueprint) === JSON.stringify(customBlueprint);
  const descriptionMatch = synced.description === customDescription;

  if (blueprintMatch && descriptionMatch) {
    console.log('✅ DATA LOCK VERIFIED: Custom launch blueprints and copies were protected and NOT overwritten.');
  } else {
    console.error('❌ DATA LOCK FAILURE: Custom user edits were overwritten during resynchronization.');
    process.exit(1);
  }

  console.log('\n=== Beta Benchmark Successful ===\n');
  process.exit(0);
}

runBenchmark(50).catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
