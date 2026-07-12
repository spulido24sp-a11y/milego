/**
 * Ad Sync Worker — runs every 6 hours to pull fresh ad performance data.
 * Syncs Meta Ads and TikTok Ads snapshots into ad_performance_snapshots.
 */
import { MetaAdsService }   from '../integrations/meta/ads.service.js';
import { TikTokAdsService } from '../integrations/tiktok/ads.service.js';
import db from '../config/database.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;

async function syncAllPlatforms() {
  console.info('[AdSync] Starting ad performance sync...');

  try {
    // Get all active store IDs
    const stores = await db('stores').select('id').where('status', 'active').catch(() => [{ id: 1 }]);

    for (const store of stores) {
      const storeId = store.id;

      // Meta Ads
      try {
        const metaService = new MetaAdsService();
        const metaResult  = await metaService.syncToDb(storeId);
        console.info(`[AdSync] Meta → store ${storeId}: ${metaResult.synced} snapshots (sim: ${metaResult.simulated})`);
      } catch (err) {
        console.warn(`[AdSync] Meta sync failed for store ${storeId}:`, err.message);
      }

      // TikTok Ads
      try {
        const ttService  = new TikTokAdsService();
        const ttResult   = await ttService.syncToDb(storeId);
        console.info(`[AdSync] TikTok → store ${storeId}: ${ttResult.synced} snapshots (sim: ${ttResult.simulated})`);
      } catch (err) {
        console.warn(`[AdSync] TikTok sync failed for store ${storeId}:`, err.message);
      }
    }

    console.info('[AdSync] Sync complete.');
  } catch (err) {
    console.error('[AdSync] Fatal error during sync:', err.message);
  }
}

export function startAdSyncWorker() {
  // Run immediately on startup so dashboard has data right away
  syncAllPlatforms();

  // Then run every 6 hours
  const interval = setInterval(syncAllPlatforms, SIX_HOURS);
  interval.unref(); // Don't block process exit
  console.info('[AdSync Worker] Started — syncing every 6 hours.');
  return interval;
}
