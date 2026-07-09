export function up(knex) {
  return knex.schema
    .raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_slug ON products(store_id, slug) WHERE deleted_at IS NULL')
    .raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_store_slug ON categories(store_id, slug) WHERE deleted_at IS NULL')
    .raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_store_email ON users(store_id, email) WHERE deleted_at IS NULL')
    .raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_store_key ON settings(store_id, key)')
    .raw('CREATE INDEX IF NOT EXISTS idx_products_store_status ON products(store_id, status, created_at DESC)')
    .raw('CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created ON audit_logs(store_id, created_at DESC)')
    .raw('CREATE INDEX IF NOT EXISTS idx_event_logs_status ON event_logs(status, created_at ASC)')
    .raw("CREATE INDEX IF NOT EXISTS idx_jobs_status_available ON jobs(status, available_at ASC) WHERE status = 'pending'")
    .raw('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(refresh_token_hash)')
    .raw('CREATE INDEX IF NOT EXISTS idx_categories_store_parent ON categories(store_id, parent_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON product_images(product_id, sort_order)')
    .raw('CREATE INDEX IF NOT EXISTS idx_product_variants_product_active ON product_variants(product_id, is_active)')
    .raw('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_foreign')
    .raw('ALTER TABLE products ADD CONSTRAINT products_category_id_foreign FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL');
}

export function down(knex) {
  return knex.schema
    .raw('DROP INDEX IF EXISTS idx_products_store_slug')
    .raw('DROP INDEX IF EXISTS idx_categories_store_slug')
    .raw('DROP INDEX IF EXISTS idx_users_store_email')
    .raw('DROP INDEX IF EXISTS idx_settings_store_key')
    .raw('DROP INDEX IF EXISTS idx_products_store_status')
    .raw('DROP INDEX IF EXISTS idx_audit_logs_store_created')
    .raw('DROP INDEX IF EXISTS idx_event_logs_status')
    .raw('DROP INDEX IF EXISTS idx_jobs_status_available')
    .raw('DROP INDEX IF EXISTS idx_sessions_user_id')
    .raw('DROP INDEX IF EXISTS idx_sessions_token_hash')
    .raw('DROP INDEX IF EXISTS idx_categories_store_parent')
    .raw('DROP INDEX IF EXISTS idx_product_images_product_sort')
    .raw('DROP INDEX IF EXISTS idx_product_variants_product_active')
    .raw('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_foreign')
    .raw('ALTER TABLE products ADD CONSTRAINT products_category_id_foreign FOREIGN KEY (category_id) REFERENCES categories(id)');
}
