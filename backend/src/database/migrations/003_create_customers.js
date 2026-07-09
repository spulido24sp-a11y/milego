export function up(knex) {
  return knex.schema
    .createTable('customers', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('name').notNullable();
      table.string('email');
      table.string('phone');
      table.string('document_type');
      table.string('document_number');
      table.text('notes');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.index('email');
      table.index('phone');
      table.index('deleted_at');
    })
    .createTable('addresses', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
      table.string('label');
      table.string('street').notNullable();
      table.string('city').notNullable();
      table.string('state');
      table.string('zip_code');
      table.string('country').notNullable().defaultTo('Colombia');
      table.boolean('is_default').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.index('customer_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('addresses')
    .dropTableIfExists('customers');
}