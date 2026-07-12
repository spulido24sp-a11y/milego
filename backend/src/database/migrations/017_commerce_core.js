export function up(knex) {
  return knex.schema
    .createTable('customer_access_tokens', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
      table.string('token_hash').notNullable().unique();
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at');
      table.string('ip');
      table.string('user_agent');
      table.timestamps(true, true);
      table.index('token_hash');
      table.index('customer_id');
      table.index('expires_at');
    })
    .createTable('customer_notes', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
      table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
      table.text('note').notNullable();
      table.integer('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      table.index('customer_id');
      table.index('store_id');
    })
    .createTable('payments', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      table.integer('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
      table.string('provider').notNullable();
      table.string('method').notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).notNullable().defaultTo('COP');
      table.string('status').notNullable().defaultTo('pending');
      table.string('external_reference');
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
      table.index('order_id');
      table.index('store_id');
      table.index('status');
    })
    .createTable('payment_status_history', (table) => {
      table.increments('id').primary();
      table.integer('payment_id').notNullable().references('id').inTable('payments').onDelete('CASCADE');
      table.string('status').notNullable();
      table.text('notes');
      table.integer('created_by').references('id').inTable('users');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('payment_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('payment_status_history')
    .dropTableIfExists('payments')
    .dropTableIfExists('customer_notes')
    .dropTableIfExists('customer_access_tokens');
}
