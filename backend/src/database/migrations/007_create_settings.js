export function up(knex) {
  return knex.schema
    .createTable('settings', (table) => {
      table.increments('id').primary();
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('key').notNullable();
      table.jsonb('value').notNullable().defaultTo('{}');
      table.string('group_name');
      table.text('description');
      table.string('type').notNullable().defaultTo('string');
      table.boolean('is_public').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.unique(['store_id', 'key']);
      table.index('group_name');
      table.index('is_public');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('settings');
}