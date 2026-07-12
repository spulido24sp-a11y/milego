export function up(knex) {
  return knex.schema
    .createTable('liam_memory', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
      table.string('type').notNullable(); // 'knowledge', 'experience', 'preferences'
      table.string('key').notNullable();
      table.text('value').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['store_id', 'type', 'key']);
      table.index(['store_id', 'type']);
    })
    .createTable('liam_event_memory', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
      table.uuid('launch_id'); // Optional, could link to products or campaigns
      table.string('event_type').notNullable(); // 'TOOL_EXECUTED', 'PATCH_APPLIED', 'QUALITY_FAILED', etc.
      table.jsonb('payload').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['store_id', 'event_type']);
      table.index(['launch_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('liam_event_memory')
    .dropTableIfExists('liam_memory');
}
