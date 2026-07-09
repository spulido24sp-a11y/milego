export function up(knex) {
  return knex.schema
    .createTable('reviews', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.integer('customer_id').references('id').inTable('customers');
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.integer('rating').notNullable();
      table.string('title');
      table.text('content');
      table.boolean('is_approved').notNullable().defaultTo(false);
      table.boolean('is_featured').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.index('product_id');
      table.index('is_approved');
    })
    .raw('ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)')
    .createTable('coupons', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('code').notNullable();
      table.string('type').notNullable();
      table.decimal('value', 12, 2).notNullable();
      table.decimal('min_order_amount', 12, 2);
      table.decimal('max_discount', 12, 2);
      table.integer('max_uses');
      table.integer('used_count').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('starts_at');
      table.timestamp('expires_at');
      table.timestamps(true, true);
      table.unique(['store_id', 'code']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('coupons')
    .dropTableIfExists('reviews');
}