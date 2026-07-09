export function up(knex) {
  return knex.schema
    .alterTable('event_logs', (table) => {
      table.integer('version').notNullable().defaultTo(1);
      table.string('producer', 100).notNullable().defaultTo('core');
      table.string('correlation_id', 255);
      table.index('correlation_id');
      table.index('version');
    })
    .alterTable('jobs', (table) => {
      table.string('locked_by', 255);
      table.timestamp('locked_at');
      table.timestamp('started_at');
      table.string('correlation_id', 255);
      table.index('correlation_id');
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('event_logs', (table) => {
      table.dropColumn('version');
      table.dropColumn('producer');
      table.dropColumn('correlation_id');
    })
    .alterTable('jobs', (table) => {
      table.dropColumn('locked_by');
      table.dropColumn('locked_at');
      table.dropColumn('started_at');
      table.dropColumn('correlation_id');
    });
}
