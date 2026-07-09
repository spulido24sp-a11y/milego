export function up(knex) {
  return knex.schema
    .createTable('failed_jobs', (table) => {
      table.increments('id').primary();
      table.uuid('original_job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
      table.string('type', 100).notNullable();
      table.jsonb('payload').notNullable().defaultTo('{}');
      table.text('failed_reason');
      table.integer('attempts').notNullable().defaultTo(0);
      table.timestamp('failed_at', { useTz: true }).defaultTo(knex.fn.now());
    })
    .raw('CREATE INDEX idx_failed_jobs_failed_at ON failed_jobs(failed_at DESC)');
}

export function down(knex) {
  return knex.schema.dropTableIfExists('failed_jobs');
}
