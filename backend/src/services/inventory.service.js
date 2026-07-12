import { InventoryRepository } from '../repositories/inventory.repository.js';
import db from '../config/database.js';

const repo = new InventoryRepository();

export class InventoryService {
  async adjustStock(productId, variantId, type, quantity, notes, createdBy, trx) {
    const conn = trx || db;

    // 1. Get current stock
    let currentStock = 0;
    if (variantId) {
      const variant = await conn('product_variants').where({ id: variantId }).forUpdate().first();
      if (!variant) throw new Error('Variante de producto no encontrada');
      currentStock = variant.stock;
    } else {
      const product = await conn('products').where({ id: productId }).forUpdate().first();
      if (!product) throw new Error('Producto no encontrado');
      currentStock = product.stock;
    }

    // 2. Calculate new stock
    let afterStock = currentStock;
    if (type === 'in' || type === 'return' || type === 'restock') {
      afterStock += quantity;
    } else if (type === 'out' || type === 'sale' || type === 'damaged' || type === 'adjustment') {
      afterStock -= quantity;
    } else {
      throw new Error(`Tipo de movimiento de inventario inválido: ${type}`);
    }

    if (afterStock < 0) {
      throw new Error(`Stock insuficiente. Stock actual: ${currentStock}, Solicitado: ${quantity}`);
    }

    // 3. Save movement log
    const movement = await repo.recordMovement({
      product_id: productId,
      variant_id: variantId || null,
      type,
      quantity,
      before_stock: currentStock,
      after_stock: afterStock,
      notes,
      created_by: createdBy || null,
    }, conn);

    // 4. Update physical table stock counts
    if (variantId) {
      await repo.updateVariantStock(variantId, afterStock, conn);
      // Also update aggregate product stock (optional but standard practice in some systems. Let's do it if needed, or keep them decoupled)
    } else {
      await repo.updateProductStock(productId, afterStock, conn);
    }

    return movement;
  }
}
