export function up(knex) {
  return knex.schema.alterTable('orders', (table) => {
    table.foreign('coupon_id').references('id').inTable('coupons');
  });
}

export function down(knex) {
  return knex.schema.alterTable('orders', (table) => {
    table.dropForeign('coupon_id');
  });
}
