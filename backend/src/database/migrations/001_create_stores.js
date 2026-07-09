export function up(knex) {
  return knex.schema.createTable('stores', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('slug').notNullable().unique();
    table.string('domain');
    table.string('logo');
    table.string('currency').notNullable().defaultTo('COP');
    table.string('timezone').notNullable().defaultTo('America/Bogota');
    table.string('status').notNullable().defaultTo('active');
    table.jsonb('settings').defaultTo('{}');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('stores');
}