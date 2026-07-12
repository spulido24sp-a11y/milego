import { BaseAdapter } from './base.adapter.js';

export class ManualAdapter extends BaseAdapter {
  normalize(rawData) {
    if (!rawData) throw new Error('Data manual vacía');

    return {
      name: rawData.name || '',
      sku_base: rawData.sku_base || rawData.sku || '',
      slug: rawData.slug || (rawData.name || '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      description: rawData.description || '',
      supplier_info: {
        provider_name: 'manual',
        external_id: 'manual-' + Date.now(),
        wholesale_price: parseFloat(rawData.wholesale_price || rawData.cost || 0),
        suggested_retail_price: parseFloat(rawData.suggested_retail_price || rawData.price || 0),
        stock_available: parseInt(rawData.stock_available || rawData.stock || 0, 10),
        warehouse_location: rawData.warehouse_location || 'Manual Warehouse',
        weight: parseFloat(rawData.peso || rawData.weight || 0)
      },
      images: (rawData.images || []).map((img, idx) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        is_primary: idx === 0,
        sort_order: idx + 1
      })),
      variants: (rawData.variants || []).map(v => ({
        name: v.name || '',
        sku: v.sku || '',
        price: parseFloat(v.price || rawData.price || 0),
        stock: parseInt(v.stock || 0, 10),
        attributes: v.attributes || {}
      }))
    };
  }
}
