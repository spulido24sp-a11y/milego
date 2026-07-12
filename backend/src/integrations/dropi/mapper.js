export class DropiMapper {
  /**
   * Maps raw Dropi API payload to standard MIleGo internal contract.
   * @param {Object} rawDropiProduct 
   * @returns {Object} Standardized contract
   */
  static mapProduct(rawDropiProduct) {
    if (!rawDropiProduct || !rawDropiProduct.id) {
      throw new Error('Payload Dropi inválido o sin ID');
    }

    return {
      provider_product_id: String(rawDropiProduct.id),
      name: rawDropiProduct.nombre || rawDropiProduct.name || '',
      description: rawDropiProduct.descripcion || rawDropiProduct.description || '',
      wholesale_price: parseFloat(rawDropiProduct.costo || rawDropiProduct.wholesale_price || 0),
      suggested_retail_price: parseFloat(rawDropiProduct.precio_sugerido || rawDropiProduct.suggested_retail_price || 0),
      stock: parseInt(rawDropiProduct.stock || rawDropiProduct.stock_available || 0, 10),
      weight: parseFloat(rawDropiProduct.peso || rawDropiProduct.weight || 0),
      images: (rawDropiProduct.imagenes || rawDropiProduct.images || []).map((img, idx) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        is_primary: idx === 0,
        sort_order: idx + 1
      })),
      variants: (rawDropiProduct.variantes || rawDropiProduct.variants || []).map(v => ({
        provider_variant_id: String(v.id),
        name: v.nombre || v.name || '',
        sku: v.sku || '',
        price: parseFloat(v.precio || v.price || rawDropiProduct.precio_sugerido || 0),
        stock: parseInt(v.stock || 0, 10)
      }))
    };
  }
}
