export function up(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.string('provider_product_id');
    table.string('provider_id');
    table.timestamp('provider_last_sync');
    table.string('sync_status');

    table.index('provider_product_id');
    table.index(['provider_id', 'provider_product_id']);
  });
}

export function down(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.dropIndex(['provider_id', 'provider_product_id']);
    table.dropIndex('provider_product_id');

    table.dropColumn('sync_status');
    table.dropColumn('provider_last_sync');
    table.dropColumn('provider_id');
    table.dropColumn('provider_product_id');
  });
}
