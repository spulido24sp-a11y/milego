export function up(knex) {
  return knex.schema.alterTable('sessions', (table) => {
    table.timestamp('revoked_at');
    table.index('revoked_at');
  });
}

export function down(knex) {
  return knex.schema.alterTable('sessions', (table) => {
    table.dropIndex('revoked_at');
    table.dropColumn('revoked_at');
  });
}