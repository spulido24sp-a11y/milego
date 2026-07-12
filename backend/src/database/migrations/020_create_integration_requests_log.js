export function up(knex) {
  return knex.schema.createTable('integration_requests_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('correlation_id');
    table.string('provider').notNullable();
    table.string('endpoint').notNullable();
    table.integer('status').notNullable();
    table.integer('latency_ms').notNullable();
    table.integer('retries').notNullable().defaultTo(0);
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    table.index(['provider', 'status']);
    table.index('timestamp');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('integration_requests_log');
}
