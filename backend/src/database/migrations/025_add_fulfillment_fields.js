export function up(knex) {
  const addColumn = (col, type, def) =>
    knex.raw(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ?? ${type} ${def}`, [col]);

  return Promise.all([
    addColumn('dropi_order_id', 'VARCHAR(255)', 'NULL'),
    addColumn('carrier', 'VARCHAR(255)', 'NULL'),
    addColumn('fulfillment_status', 'VARCHAR(255)', "DEFAULT 'pending'"),
    addColumn('fulfilled_at', 'TIMESTAMPTZ', 'NULL'),
    addColumn('tracking_updated_at', 'TIMESTAMPTZ', 'NULL'),
  ])
    .then(() =>
      knex.schema.hasTable('fulfillment_log').then((exists) => {
        if (!exists) {
          return knex.schema.createTable('fulfillment_log', (table) => {
            table.increments('id');
            table.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
            table.string('event').notNullable();
            table.jsonb('metadata').defaultTo('{}');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.index('order_id');
          });
        }
      })
    );
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('fulfillment_log')
    .alterTable('orders', (table) => {
      table.dropColumn('dropi_order_id');
      table.dropColumn('tracking_number');
      table.dropColumn('carrier');
      table.dropColumn('fulfillment_status');
      table.dropColumn('fulfilled_at');
      table.dropColumn('tracking_updated_at');
    });
}
