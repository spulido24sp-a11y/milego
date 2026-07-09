export function up(knex) {
  return knex.schema
    .alterTable('categories', (table) => {
      table.dropForeign('parent_id');
      table.foreign('parent_id').references('id').inTable('categories').onDelete('SET NULL');
      table.index('store_id');
    })
    .alterTable('suppliers', (table) => {
      table.index('store_id');
    })
    .alterTable('reviews', (table) => {
      table.index('store_id');
    })
    .alterTable('coupons', (table) => {
      table.timestamp('deleted_at');
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('categories', (table) => {
      table.dropIndex('store_id');
      table.dropForeign('parent_id');
      table.foreign('parent_id').references('id').inTable('categories');
    })
    .alterTable('suppliers', (table) => {
      table.dropIndex('store_id');
    })
    .alterTable('reviews', (table) => {
      table.dropIndex('store_id');
    })
    .alterTable('coupons', (table) => {
      table.dropColumn('deleted_at');
    });
}
