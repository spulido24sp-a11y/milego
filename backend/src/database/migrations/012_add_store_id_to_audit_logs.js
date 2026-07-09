export function up(knex) {
  return knex.schema
    .alterTable('audit_logs', (table) => {
      table.integer('store_id').references('id').inTable('stores');
      table.index('store_id');
    })
    .then(() => knex('audit_logs').update({ store_id: 1 }))
    .then(() => knex.schema.alterTable('audit_logs', (table) => {
      table.integer('store_id').notNullable().alter();
    }));
}

export function down(knex) {
  return knex.schema.alterTable('audit_logs', (table) => {
    table.dropColumn('store_id');
  });
}
