export function up(knex) {
  return knex.schema.createTable('launch_versions', (table) => {
    table.increments('id').primary();
    table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.jsonb('blueprint').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['product_id', 'version']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('launch_versions');
}
