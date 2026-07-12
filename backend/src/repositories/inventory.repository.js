import db from '../config/database.js';

export class InventoryRepository {
  async recordMovement(data, trx) {
    const conn = trx || db;
    const [movement] = await conn('inventory_movements').insert(data).returning('*');
    return movement;
  }

  async updateProductStock(productId, newStock, trx) {
    const conn = trx || db;
    const [product] = await conn('products')
      .where({ id: productId })
      .update({ stock: newStock, updated_at: conn.fn.now() })
      .returning('*');
    return product;
  }

  async updateVariantStock(variantId, newStock, trx) {
    const conn = trx || db;
    const [variant] = await conn('product_variants')
      .where({ id: variantId })
      .update({ stock: newStock })
      .returning('*');
    return variant;
  }
}
