export function up(knex) {
  return knex.schema
    .createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.string('action').notNullable();
      table.string('entity_type').notNullable();
      table.string('entity_id').notNullable();
      table.jsonb('old_values');
      table.jsonb('new_values');
      table.specificType('ip_address', 'INET');
      table.text('user_agent');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('user_id');
      table.index(['entity_type', 'entity_id']);
      table.index('created_at');
    })
    .createTable('webhook_logs', (table) => {
      table.increments('id').primary();
      table.string('event_type').notNullable();
      table.jsonb('payload').defaultTo('{}');
      table.integer('response_status');
      table.text('response_body');
      table.string('status').notNullable().defaultTo('pending');
      table.text('error_message');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('analytics_events', (table) => {
      table.increments('id').primary();
      table.string('event_type').notNullable();
      table.string('event_name').notNullable();
      table.jsonb('payload').defaultTo('{}');
      table.string('source');
      table.string('session_id');
      table.specificType('ip_address', 'INET');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('event_type');
      table.index('created_at');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('analytics_events')
    .dropTableIfExists('webhook_logs')
    .dropTableIfExists('audit_logs');
}