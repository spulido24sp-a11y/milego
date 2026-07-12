/**
 * Migration 029 — WhatsApp order confirmation gate
 *
 * Colombia opera mayoritariamente en pago contraentrega. El mayor riesgo
 * de ese modelo son los pedidos falsos / que nadie recibe en la puerta
 * (devoluciones). Esta migración agrega el estado necesario para exigir
 * una confirmación explícita del cliente por WhatsApp ANTES de despachar
 * el pedido a logística.
 */
export async function up(knex) {
  await knex.schema.alterTable('orders', (table) => {
    // 'awaiting' -> esperando respuesta | 'confirmed' -> cliente confirmó
    // 'rejected'  -> cliente canceló   | 'no_response' -> se agotaron los recordatorios
    // 'not_applicable' -> pedidos que no son contraentrega
    table.string('whatsapp_confirmation_status', 20).notNullable().defaultTo('not_applicable');
    table.timestamp('whatsapp_confirmation_requested_at').nullable();
    table.timestamp('whatsapp_confirmation_responded_at').nullable();
    table.integer('whatsapp_confirmation_reminders_sent').notNullable().defaultTo(0);

    table.index(['whatsapp_confirmation_status'], 'idx_orders_wa_confirmation_status');
  });

  await knex.schema.createTable('whatsapp_inbound_messages', (table) => {
    table.increments('id').primary();
    table.string('phone', 30).notNullable();
    table.text('body').nullable();
    table.jsonb('raw_payload').defaultTo('{}');
    table.integer('matched_order_id').nullable().references('id').inTable('orders').onDelete('SET NULL');
    table.string('resolution', 30).nullable(); // 'confirmed' | 'rejected' | 'unrecognized' | 'no_pending_order'
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['phone'], 'idx_wa_inbound_phone');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_inbound_messages');
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('whatsapp_confirmation_status');
    table.dropColumn('whatsapp_confirmation_requested_at');
    table.dropColumn('whatsapp_confirmation_responded_at');
    table.dropColumn('whatsapp_confirmation_reminders_sent');
  });
}
