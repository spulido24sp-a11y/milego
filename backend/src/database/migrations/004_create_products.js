export function up(knex) {
  return knex.schema
    .createTable('categories', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('name').notNullable();
      table.string('slug').notNullable();
      table.text('description');
      table.integer('parent_id').references('id').inTable('categories');
      table.integer('sort_order').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.unique(['store_id', 'slug']);
    })
    .createTable('products', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('name').notNullable();
      table.string('slug').notNullable();
      table.text('description');
      table.string('short_description');
      table.integer('category_id').references('id').inTable('categories');
      table.decimal('price', 12, 2).notNullable().defaultTo(0);
      table.decimal('compare_price', 12, 2);
      table.decimal('cost_price', 12, 2);
      table.string('sku');
      table.string('barcode');
      table.string('status').notNullable().defaultTo('active');
      table.integer('stock').notNullable().defaultTo(0);
      table.decimal('weight', 10, 2);
      table.boolean('is_featured').notNullable().defaultTo(false);
      table.string('meta_title');
      table.text('meta_description');
      table.string('dropi_id');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.unique(['store_id', 'slug']);
      table.index('store_id');
      table.index('status');
      table.index('category_id');
      table.index('dropi_id');
      table.index('deleted_at');
    })
    .createTable('product_images', (table) => {
      table.increments('id').primary();
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.string('url').notNullable();
      table.string('alt');
      table.integer('sort_order').notNullable().defaultTo(0);
      table.boolean('is_primary').notNullable().defaultTo(false);
      table.index('product_id');
    })
    .createTable('product_variants', (table) => {
      table.increments('id').primary();
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('sku');
      table.decimal('price', 12, 2).notNullable().defaultTo(0);
      table.decimal('compare_price', 12, 2);
      table.integer('stock').notNullable().defaultTo(0);
      table.decimal('weight', 10, 2);
      table.integer('sort_order').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.index('product_id');
    })
    .createTable('suppliers', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('store_id').notNullable().references('id').inTable('stores');
      table.string('name').notNullable();
      table.string('contact_name');
      table.string('email');
      table.string('phone');
      table.text('notes');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
    })
    .createTable('supplier_products', (table) => {
      table.increments('id').primary();
      table.integer('supplier_id').notNullable().references('id').inTable('suppliers').onDelete('CASCADE');
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.string('supplier_sku');
      table.decimal('cost_price', 12, 2);
      table.integer('lead_time');
      table.boolean('is_preferred').notNullable().defaultTo(false);
      table.unique(['supplier_id', 'product_id']);
      table.index('supplier_id');
      table.index('product_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('supplier_products')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('product_variants')
    .dropTableIfExists('product_images')
    .dropTableIfExists('products')
    .dropTableIfExists('categories');
}