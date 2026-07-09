export function up(knex) {
  return knex.schema
    .createTable('orders', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('order_number').notNullable();
      table.integer('customer_id').references('id').inTable('customers');
      table.string('status').notNullable().defaultTo('pending');
      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
      table.decimal('shipping_cost', 12, 2).notNullable().defaultTo(0);
      table.decimal('discount', 12, 2).notNullable().defaultTo(0);
      table.decimal('total', 12, 2).notNullable().defaultTo(0);
      table.string('payment_method');
      table.string('payment_status').notNullable().defaultTo('pending');
      table.text('notes');
      table.integer('shipping_address_id').references('id').inTable('addresses');
      table.integer('coupon_id');
      table.string('shipping_company');
      table.string('tracking_number');
      table.boolean('whatsapp_opt_in').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.unique(['store_id', 'order_number']);
      table.index('store_id');
      table.index('customer_id');
      table.index('status');
      table.index('created_at');
      table.index('deleted_at');
    })
    .createTable('order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products');
      table.integer('variant_id').references('id').inTable('product_variants');
      table.string('product_name').notNullable();
      table.string('product_sku');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 12, 2).notNullable();
      table.decimal('total_price', 12, 2).notNullable();
      table.index('order_id');
    })
    .createTable('order_status_history', (table) => {
      table.increments('id').primary();
      table.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      table.string('status').notNullable();
      table.text('notes');
      table.integer('created_by').references('id').inTable('users');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('order_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('order_status_history')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders');
}