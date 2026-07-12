export function up(knex) {
  return knex.schema
    .createTable('knowledge_graph_nodes', (table) => {
      table.increments('id').primary();
      table.string('type').notNullable();
      table.text('value').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('knowledge_graph_edges', (table) => {
      table.increments('id').primary();
      table.integer('source_node_id').notNullable().references('id').inTable('knowledge_graph_nodes').onDelete('CASCADE');
      table.integer('target_node_id').notNullable().references('id').inTable('knowledge_graph_nodes').onDelete('CASCADE');
      table.string('relationship').notNullable();
      table.integer('times_used').defaultTo(0);
      table.integer('times_success').defaultTo(0);
      table.integer('times_failed').defaultTo(0);
      table.decimal('avg_ctr', 5, 2).defaultTo(0.00);
      table.decimal('avg_roas', 5, 2).defaultTo(0.00);
      table.decimal('decay_factor', 3, 2).defaultTo(0.95);
      table.integer('memory_score').defaultTo(50);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('market_opportunities', (table) => {
      table.increments('id').primary();
      table.string('source').notNullable();
      table.string('external_sku').notNullable();
      table.string('name').notNullable();
      table.decimal('estimated_margin', 5, 2).defaultTo(0.00);
      table.string('trend_status').notNullable();
      table.string('hunter_decision').notNullable().defaultTo('pending');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('ab_experiments', (table) => {
      table.increments('id').primary();
      table.integer('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.string('element_type').notNullable();
      table.text('hypothesis');
      table.string('variation_a').notNullable();
      table.string('variation_b').notNullable();
      table.integer('impressions_a').defaultTo(0);
      table.integer('impressions_b').defaultTo(0);
      table.integer('conversions_a').defaultTo(0);
      table.integer('conversions_b').defaultTo(0);
      table.string('status').notNullable().defaultTo('active');
      table.string('winner');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('ab_experiments')
    .dropTableIfExists('market_opportunities')
    .dropTableIfExists('knowledge_graph_edges')
    .dropTableIfExists('knowledge_graph_nodes');
}
