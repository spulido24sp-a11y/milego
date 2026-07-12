export function up(knex) {
  return knex.schema
    .alterTable('products', (table) => {
      table.jsonb('launch_blueprint');
    })
    .createTable('ai_requests_log', (table) => {
      table.increments('id').primary();
      table.string('provider').notNullable();
      table.string('model').notNullable();
      table.integer('prompt_tokens');
      table.integer('completion_tokens');
      table.decimal('cost_usd', 10, 6);
      table.integer('duration_ms');
      table.boolean('cache_hit').defaultTo(false);
      table.string('prompt_template');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('ai_requests_log')
    .alterTable('products', (table) => {
      table.dropColumn('launch_blueprint');
    });
}
