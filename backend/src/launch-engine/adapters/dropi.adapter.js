import { BaseAdapter } from './base.adapter.js';

export class DropiAdapter extends BaseAdapter {
  normalize(rawData) {
    if (!rawData) throw new Error('Data cruda de Dropi vacía o inválida');

    return {
      name: rawData.nombre || rawData.name || '',
      sku_base: rawData.sku || '',
      slug: (rawData.nombre || rawData.name || '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      description: rawData.descripcion || rawData.description || '',
      supplier_info: {
        provider_name: 'dropi',
        external_id: String(rawData.id || rawData.external_id || ''),
        wholesale_price: parseFloat(rawData.costo || rawData.wholesale_price || 0),
        suggested_retail_price: parseFloat(rawData.precio_sugerido || rawData.suggested_retail_price || 0),
        stock_available: parseInt(rawData.stock || rawData.stock_available || 0, 10),
        warehouse_location: rawData.bodega || rawData.warehouse_location || 'Colombia',
        weight: parseFloat(rawData.peso || rawData.weight || 0)
      },
      images: (rawData.imagenes || rawData.images || []).map((img, idx) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        is_primary: idx === 0,
        sort_order: idx + 1
      })),
      variants: (rawData.variantes || rawData.variants || []).map(v => ({
        name: v.nombre || v.name || '',
        sku: v.sku || '',
        price: parseFloat(v.precio || v.price || rawData.precio_sugerido || 0),
        stock: parseInt(v.stock || 0, 10),
        attributes: v.atributos || v.attributes || {}
      }))
    };
  }
}
