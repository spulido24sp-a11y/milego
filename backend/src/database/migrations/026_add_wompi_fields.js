export function up(knex) {
  const addColumn = (table, col, type, def) =>
    knex.raw(`ALTER TABLE ?? ADD COLUMN IF NOT EXISTS ?? ${type} ${def}`, [table, col]);

  return Promise.all([
    addColumn('orders', 'wompi_transaction_id', 'VARCHAR(255)', 'NULL'),
    addColumn('orders', 'wompi_status', 'VARCHAR(50)', 'NULL'),
    addColumn('payments', 'wompi_transaction_id', 'VARCHAR(255)', 'NULL'),
    addColumn('payments', 'wompi_response', 'TEXT', 'NULL'),
  ]);
}

export function down(knex) {
  return knex.schema
    .alterTable('orders', (table) => {
      table.dropColumn('wompi_transaction_id');
      table.dropColumn('wompi_status');
    })
    .alterTable('payments', (table) => {
      table.dropColumn('wompi_transaction_id');
      table.dropColumn('wompi_response');
    });
}
