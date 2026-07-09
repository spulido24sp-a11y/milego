export function up(knex) {
  return knex.schema
    .createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('slug').notNullable().unique();
      table.text('description');
      table.boolean('is_system').notNullable().defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('permissions', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('slug').notNullable().unique();
      table.string('module').notNullable();
      table.string('action').notNullable();
      table.text('description');
      table.timestamps(true, true);
    })
    .createTable('role_permissions', (table) => {
      table.integer('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
      table.integer('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.primary(['role_id', 'permission_id']);
    })
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.integer('store_id').references('id').inTable('stores');
      table.integer('role_id').references('id').inTable('roles');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('last_login_at');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.index('email');
      table.index('store_id');
    })
    .createTable('sessions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('refresh_token_hash').notNullable();
      table.specificType('ip_address', 'INET');
      table.text('user_agent');
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      table.index('user_id');
      table.index('expires_at');
    })
    .createTable('api_keys', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('key_hash').notNullable();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.jsonb('permissions').defaultTo('[]');
      table.timestamp('last_used_at');
      table.timestamp('expires_at');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      table.index('user_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('api_keys')
    .dropTableIfExists('sessions')
    .dropTableIfExists('users')
    .dropTableIfExists('role_permissions')
    .dropTableIfExists('permissions')
    .dropTableIfExists('roles');
}