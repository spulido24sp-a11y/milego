export function up(knex) {
  return knex.schema
    .createTable('event_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('event_name').notNullable();
      table.jsonb('payload').defaultTo('{}');
      table.string('status').notNullable().defaultTo('pending');
      table.text('error_message');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at');
      table.index('status');
      table.index('created_at');
    })
    .createTable('jobs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('type').notNullable();
      table.jsonb('payload').defaultTo('{}');
      table.string('status').notNullable().defaultTo('pending');
      table.integer('attempts').notNullable().defaultTo(0);
      table.integer('max_attempts').notNullable().defaultTo(5);
      table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.text('failed_reason');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    })
    .raw('CREATE INDEX idx_jobs_status_pending_processing ON jobs (status) WHERE status IN (\'pending\', \'processing\')')
    .raw('CREATE INDEX idx_jobs_available_at_pending ON jobs (available_at) WHERE status = \'pending\'')
    .createTable('webhook_events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('provider').notNullable();
      table.string('external_id').notNullable();
      table.string('event_type').notNullable();
      table.jsonb('payload').defaultTo('{}');
      table.string('status').notNullable().defaultTo('received');
      table.timestamp('processed_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['provider', 'external_id']);
      table.index(['provider', 'external_id']);
    })
    .createTable('inventory_movements', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.integer('variant_id').references('id').inTable('product_variants');
      table.string('type').notNullable();
      table.integer('quantity').notNullable();
      table.integer('before_stock').notNullable();
      table.integer('after_stock').notNullable();
      table.string('reference_type');
      table.string('reference_id');
      table.text('notes');
      table.integer('created_by').references('id').inTable('users');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('product_id');
      table.index('created_at');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('inventory_movements')
    .dropTableIfExists('webhook_events')
    .dropTableIfExists('jobs')
    .dropTableIfExists('event_logs');
}