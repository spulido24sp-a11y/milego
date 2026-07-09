let cache = null;
let loading = null;

export async function loadProducts() {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch('/data/products.json').then(r => {
    if (!r.ok) throw new Error('Failed to load products');
    return r.json();
  }).then(data => {
    cache = data;
    return data;
  });
  return loading;
}

export function getProduct(slug) {
  if (!cache) return null;
  return cache.find(p => p.slug === slug) || null;
}

export function getActiveProducts() {
  return (cache || []).filter(p => p.activo);
}

export function getComboPrice(product, comboId) {
  const key = Object.keys(product.precios)[parseInt(comboId) - 1] || 'x6';
  return { id: key, precio: product.precios[key], original: product.precios_originales?.[key] || 0, ahorro: (product.precios_originales?.[key] || 0) - product.precios[key] };
}

export function getCombos(product) {
  return product.combos || [];
}
