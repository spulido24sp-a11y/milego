/**
 * Migration 027 — ad_performance_snapshots
 * Stores ad campaign performance snapshots from Meta Ads and TikTok Ads.
 */
export async function up(knex) {
  await knex.schema.createTable('ad_performance_snapshots', (table) => {
    table.increments('id').primary();
    table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
    table.string('platform', 20).notNullable(); // 'meta' | 'tiktok'
    table.integer('product_id').nullable().references('id').inTable('products').onDelete('SET NULL');

    // Campaign hierarchy
    table.string('campaign_id', 100).nullable();
    table.string('campaign_name', 255).nullable();
    table.string('adset_id', 100).nullable();
    table.string('adset_name', 255).nullable();
    table.string('ad_id', 100).nullable();
    table.string('ad_name', 255).nullable();

    // Time window
    table.date('date_start').notNullable();
    table.date('date_stop').notNullable();

    // Reach & engagement
    table.bigInteger('impressions').defaultTo(0);
    table.bigInteger('clicks').defaultTo(0);
    table.bigInteger('reach').defaultTo(0);
    table.decimal('frequency', 8, 2).defaultTo(0);
    table.decimal('ctr', 8, 4).defaultTo(0);      // Click-through rate %
    table.decimal('cpm', 14, 2).defaultTo(0);     // Cost per 1000 impressions (COP)
    table.decimal('cpc', 14, 2).defaultTo(0);     // Cost per click (COP)

    // Spend & conversions
    table.decimal('spend', 14, 2).defaultTo(0);           // Total spend (COP)
    table.integer('purchases').defaultTo(0);
    table.decimal('purchase_value', 14, 2).defaultTo(0);  // Revenue attributed (COP)
    table.decimal('roas', 8, 4).defaultTo(0);             // Return on ad spend
    table.decimal('cpa', 14, 2).defaultTo(0);             // Cost per acquisition (COP)

    // Meta for internal tracking
    table.boolean('is_simulated').defaultTo(false);
    table.timestamp('synced_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index(['store_id', 'platform', 'date_start']);
    table.index(['store_id', 'product_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ad_performance_snapshots');
}
