export function up(knex) {
  return knex.schema
    .createTable('ai_cache', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('hash').notNullable().unique();
      table.string('provider').notNullable();
      table.string('model').notNullable();
      table.string('prompt_version').notNullable();
      table.string('schema_version').notNullable();
      table.jsonb('response').notNullable();
      table.integer('tokens_in').notNullable();
      table.integer('tokens_out').notNullable();
      table.integer('latency').notNullable();
      table.decimal('cost', 10, 6).notNullable();
      table.integer('cache_hits').notNullable().defaultTo(0);
      table.timestamp('expires_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index('hash');
    })
    .createTable('ai_usage', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
      table.string('provider').notNullable();
      table.string('model').notNullable();
      table.integer('tokens_in').notNullable();
      table.integer('tokens_out').notNullable();
      table.decimal('cost', 10, 6).notNullable();
      table.boolean('cached').notNullable().defaultTo(false);
      table.string('request_type').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['store_id', 'created_at']);
    })
    .createTable('prompt_registry', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('version').notNullable();
      table.text('prompt_template').notNullable();
      table.string('schema_version').notNullable();
      table.decimal('temperature', 3, 2).notNullable().defaultTo(0.7);
      table.string('provider').notNullable().defaultTo('gemini');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['name', 'version']);
      table.index(['name', 'is_active']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('prompt_registry')
    .dropTableIfExists('ai_usage')
    .dropTableIfExists('ai_cache');
}
