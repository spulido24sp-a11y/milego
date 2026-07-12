/**
 * Migration 028 — GIN indexes on JSONB columns
 *
 * Resuelve el hallazgo P1 de PROJECT_AUDIT.md:
 * "A medida que crezcan las consultas en Mission Control para filtrar
 * productos por palabras clave del blueprint, la base de datos se
 * ralentizará. Mitigación P1: Añadir índices GIN sobre products.launch_blueprint"
 *
 * También cubre metadata del Knowledge Graph, que sufre el mismo patrón
 * de lectura por contenido JSONB.
 */
export async function up(knex) {
  // Índice GIN sobre el blueprint completo (permite operadores @>, ?, ?&, ?| de Postgres
  // para búsquedas por claves/valores dentro del JSON sin escanear la tabla completa).
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_launch_blueprint_gin
    ON products USING GIN (launch_blueprint jsonb_path_ops)
  `);

  const hasKgNodes = await knex.schema.hasTable('knowledge_graph_nodes');
  if (hasKgNodes) {
    const hasMetadataCol = await knex.schema.hasColumn('knowledge_graph_nodes', 'metadata');
    if (hasMetadataCol) {
      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_kg_nodes_metadata_gin
        ON knowledge_graph_nodes USING GIN (metadata jsonb_path_ops)
      `);
    }
  }

  const hasKgEdges = await knex.schema.hasTable('knowledge_graph_edges');
  if (hasKgEdges) {
    const hasCols = await knex.schema.hasColumn('knowledge_graph_edges', 'source_node_id');
    if (hasCols) {
      // Recomendación explícita del CTO directive en PROJECT_AUDIT.md:
      // índice combinado (source_node_id, target_node_id, relationship)
      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_kg_edges_source_target_relationship
        ON knowledge_graph_edges (source_node_id, target_node_id, relationship)
      `);
    }
  }
}

export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_products_launch_blueprint_gin`);
  await knex.raw(`DROP INDEX IF EXISTS idx_kg_nodes_metadata_gin`);
  await knex.raw(`DROP INDEX IF EXISTS idx_kg_edges_source_target_relationship`);
}
