/**
 * Migration 030 — LIAM Telemetry v2 (CDP Ligera)
 *
 * Transforma la telemetría de LIAM de una tabla plana (liam_telemetry)
 * a un modelo de datos relacional con sesiones, eventos, versiones de
 * landing y métricas agregadas. Diseñado para escalar a millones de
 * eventos sin rediseñar el esquema.
 *
 * Tablas:
 *   liam_sessions        — contexto único por visita (una vez por landing load)
 *   liam_events          — eventos individuales con payload JSONB
 *   liam_landing_versions — historial de versiones generadas por LIAM
 *   liam_daily_metrics   — agregación diaria para consultas rápidas
 */
export async function up(knex) {
  // ─── 1. liam_sessions ──────────────────────────────────────────────
  await knex.schema.createTable('liam_sessions', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable().unique();
    table.string('anonymous_visitor_id', 255).nullable();
    table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.integer('landing_id').nullable().references('id').inTable('launch_versions').onDelete('SET NULL');
    table.integer('landing_version').nullable();
    table.string('landing_hash', 64).nullable();
    table.text('landing_url').nullable();
    table.text('referrer').nullable();

    table.string('decision_engine_version', 50).nullable();
    table.string('conversion_compiler_version', 50).nullable();
    table.string('prompt_version', 50).nullable();
    table.string('learning_model_version', 50).nullable();

    table.string('experiment_id', 100).nullable();
    table.string('experiment_variant', 10).nullable();

    table.string('theme_key', 50).nullable();
    table.string('cta_key', 50).nullable();
    table.string('bundle_key', 50).nullable();

    table.string('traffic_source', 50).nullable();
    table.string('campaign', 255).nullable();
    table.string('adset', 255).nullable();
    table.string('ad_name', 255).nullable();
    table.string('device', 20).nullable();
    table.string('country', 5).nullable();
    table.string('language', 10).nullable();
    table.text('user_agent').nullable();
    table.specificType('ip_address', 'inet').nullable();

    table.integer('event_count').notNullable().defaultTo(0);
    table.timestamp('first_event_at').nullable();
    table.timestamp('last_event_at').nullable();
    table.boolean('converted').notNullable().defaultTo(false);
    table.decimal('revenue', 12, 2).nullable();
    table.jsonb('payload').notNullable().defaultTo('{}');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['product_id', 'landing_version'], 'idx_liam_sessions_product_version');
    table.index(['traffic_source'], 'idx_liam_sessions_source');
    table.index(['created_at'], 'idx_liam_sessions_created');
    table.index(['experiment_id', 'experiment_variant'], 'idx_liam_sessions_experiment');
  });

  // ─── 2. liam_events ────────────────────────────────────────────────
  await knex.schema.createTable('liam_events', (table) => {
    table.bigIncrements('id').primary();
    table.string('session_id', 255).notNullable().references('session_id').inTable('liam_sessions').onDelete('CASCADE');
    table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.string('event_type', 50).notNullable();
    table.jsonb('payload').notNullable().defaultTo('{}');
    table.timestamp('client_ts').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['session_id'], 'idx_liam_events_session');
    table.index(['product_id', 'event_type'], 'idx_liam_events_product_event');
    table.index(['event_type', 'created_at'], 'idx_liam_events_type_time');
  });

  // ─── 3. liam_landing_versions ──────────────────────────────────────
  await knex.schema.createTable('liam_landing_versions', (table) => {
    table.increments('id').primary();
    table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.string('landing_hash', 64).nullable();
    table.string('theme_key', 50).nullable();
    table.string('cta_key', 50).nullable();
    table.string('bundle_key', 50).nullable();
    table.jsonb('block_order').nullable();
    table.string('decision_engine_version', 50).nullable();
    table.string('conversion_compiler_version', 50).nullable();
    table.string('prompt_version', 50).nullable();
    table.string('learning_model_version', 50).nullable();
    table.jsonb('cro_decision').nullable();
    table.jsonb('prompts_used').nullable();
    table.string('created_by', 20).notNullable().defaultTo('manual');
    table.timestamp('published_at').nullable();
    table.string('published_by', 255).nullable();
    table.integer('rollback_from').nullable().references('id').inTable('liam_landing_versions').onDelete('SET NULL');
    table.boolean('is_active').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['product_id', 'version'], 'idx_llv_product_version');
    table.index(['product_id', 'is_active'], 'idx_llv_active');
  });

  // ─── 4. liam_daily_metrics ─────────────────────────────────────────
  await knex.schema.createTable('liam_daily_metrics', (table) => {
    table.increments('id').primary();
    table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.integer('landing_version').nullable();
    table.date('date').notNullable();
    table.string('theme_key', 50).nullable();
    table.string('cta_key', 50).nullable();
    table.string('bundle_key', 50).nullable();
    table.string('traffic_source', 50).nullable();
    table.string('experiment_variant', 10).nullable();

    table.integer('page_views').notNullable().defaultTo(0);
    table.integer('sessions').notNullable().defaultTo(0);
    table.integer('unique_visitors').notNullable().defaultTo(0);
    table.integer('scroll_50_count').notNullable().defaultTo(0);
    table.integer('cta_clicks').notNullable().defaultTo(0);
    table.integer('checkout_starts').notNullable().defaultTo(0);
    table.integer('checkout_completes').notNullable().defaultTo(0);
    table.integer('purchases').notNullable().defaultTo(0);
    table.integer('refunds').notNullable().defaultTo(0);
    table.decimal('revenue', 12, 2).notNullable().defaultTo(0);
    table.decimal('refund_amount', 12, 2).notNullable().defaultTo(0);

    table.decimal('conversion_rate', 6, 4).notNullable().defaultTo(0);
    table.decimal('ctr', 6, 4).notNullable().defaultTo(0);
    table.decimal('aov', 12, 2).notNullable().defaultTo(0);
    table.decimal('refund_rate', 6, 4).notNullable().defaultTo(0);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(
      ['product_id', 'landing_version', 'date', 'theme_key', 'cta_key', 'bundle_key', 'traffic_source'],
      'idx_ldm_unique_key'
    );
  });

  // ─── 5. Registrar versión del esquema en settings ──────────────────
  await knex('settings').insert({
    key: 'liam.telemetry_schema_version',
    value: '1',
    store_id: 1,
  }).onConflict(['key', 'store_id']).ignore();
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('liam_daily_metrics');
  await knex.schema.dropTableIfExists('liam_landing_versions');
  await knex.schema.dropTableIfExists('liam_events');
  await knex.schema.dropTableIfExists('liam_sessions');
}
