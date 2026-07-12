export async function seed(knex) {
  // Clear existing product variants, images, and products (soft deletes and hard deletes)
  await knex('product_variants').del();
  await knex('product_images').del();
  await knex('supplier_products').del();
  await knex('products').del();
  await knex('categories').del();

  const storeRow = await knex('stores').where({ slug: 'milego-store' }).first();
  if (!storeRow) {
    throw new Error('MIleGo Store not found. Run seed 001 first.');
  }
  const storeId = storeRow.id;

  // Insert categories
  const categoriesData = [
    { store_id: storeId, name: 'Automotriz', slug: 'automotriz', sort_order: 1 },
    { store_id: storeId, name: 'Cocina', slug: 'cocina', sort_order: 2 },
    { store_id: storeId, name: 'Hogar', slug: 'hogar', sort_order: 3 },
    { store_id: storeId, name: 'Tecnología', slug: 'tecnologia', sort_order: 4 },
    { store_id: storeId, name: 'Mascotas', slug: 'mascotas', sort_order: 5 },
    { store_id: storeId, name: 'Viajes', slug: 'viajes', sort_order: 6 },
    { store_id: storeId, name: 'Fitness', slug: 'fitness', sort_order: 7 },
  ];

  const categoryRows = await knex('categories').insert(categoriesData).returning(['id', 'slug']);
  const categoryMap = {};
  categoryRows.forEach(row => {
    categoryMap[row.slug] = row.id;
  });

  // Insert products
  const productsData = [
    {
      store_id: storeId,
      name: 'Inflador de Llantas Portátil Eléctrico',
      slug: 'inflador-llantas-portatil',
      description: 'Inflador inteligente de llantas de alta potencia para carros, motos y bicicletas. Evita grúas y varadas en carretera.',
      short_description: 'Mini compresor digital recargable para emergencias.',
      category_id: categoryMap['automotriz'],
      price: 139900.00,
      compare_price: 199900.00,
      cost_price: 48000.00,
      sku: 'INF-001',
      status: 'active',
      stock: 100,
      is_featured: true,
      meta_title: 'Inflador de Llantas Portátil Eléctrico | MIleGo',
      meta_description: 'Evita varadas. Compresor de aire recargable para auto y moto en Colombia.',
    },
    {
      store_id: storeId,
      name: 'Cortadora de Verduras 4 en 1 Recargable',
      slug: 'cortadora-verduras-4en1',
      description: 'Pica ajo, cebolla y verduras directamente sobre la olla. Recargable por USB y fácil de limpiar.',
      short_description: 'Procesador de alimentos de mano ultra práctico.',
      category_id: categoryMap['cocina'],
      price: 79900.00,
      compare_price: 119900.00,
      cost_price: 28000.00,
      sku: 'COR-001',
      status: 'active',
      stock: 150,
      is_featured: true,
      meta_title: 'Cortadora de Verduras 4 en 1 Recargable | MIleGo',
      meta_description: 'Pica vegetales en segundos de forma fácil y rápida.',
    },
    {
      store_id: storeId,
      name: 'Secador Mascota 2 en 1',
      slug: 'secador-mascota-2en1',
      description: 'Secador y cepillo silencioso para peinar y secar a tu perro o gato de una pasada sin asustarlo.',
      short_description: 'Cepillo secador de pelo para mascotas.',
      category_id: categoryMap['mascotas'],
      price: 99900.00,
      compare_price: 149900.00,
      cost_price: 38000.00,
      sku: 'SEC-001',
      status: 'active',
      stock: 80,
      is_featured: true,
      meta_title: 'Secador de Mascotas Silencioso 2 en 1 | MIleGo',
      meta_description: 'Cepilla y seca a tu mascota sin ruidos molestos.',
    },
    {
      store_id: storeId,
      name: 'Deshumidificador Portátil',
      slug: 'deshumidificador-portatil',
      description: 'Elimina la humedad de clósets y habitaciones evitando moho y malos olores. Compacto y silencioso.',
      short_description: 'Extractor de humedad para el hogar.',
      category_id: categoryMap['hogar'],
      price: 129900.00,
      compare_price: 199900.00,
      cost_price: 55000.00,
      sku: 'DES-001',
      status: 'active',
      stock: 50,
      is_featured: false,
      meta_title: 'Deshumidificador Portátil Silencioso | MIleGo',
      meta_description: 'Protege tu ropa y salud eliminando el exceso de humedad en el ambiente.',
    },
    {
      store_id: storeId,
      name: 'Plancha Vapor Vertical',
      slug: 'plancha-vapor-vertical',
      description: 'Desarruga tu ropa directamente en el gancho. Vapor continuo que cuida las telas y elimina bacterias.',
      short_description: 'Plancha de ropa portátil a vapor.',
      category_id: categoryMap['hogar'],
      price: 89900.00,
      compare_price: 139900.00,
      cost_price: 35000.00,
      sku: 'PLA-001',
      status: 'active',
      stock: 120,
      is_featured: false,
      meta_title: 'Plancha de Vapor Vertical Portátil | MIleGo',
      meta_description: 'Planchado fácil y rápido en gancho ideal para viajes.',
    },
    {
      store_id: storeId,
      name: 'Lámpara Cargador LED',
      slug: 'lampara-cargador-led',
      description: 'Lámpara de escritorio inteligente con cargador inalámbrico Qi para celular y múltiples tonos de luz.',
      short_description: 'Luz LED de escritorio con carga inalámbrica.',
      category_id: categoryMap['tecnologia'],
      price: 129900.00,
      compare_price: 199900.00,
      cost_price: 45000.00,
      sku: 'LAM-001',
      status: 'active',
      stock: 90,
      is_featured: false,
      meta_title: 'Lámpara de Escritorio con Cargador Inalámbrico | MIleGo',
      meta_description: 'Luz de lectura premium y cargador Qi integrados.',
    },
    {
      store_id: storeId,
      name: 'Dispensador Jabón Sensor',
      slug: 'dispensador-jabon-sensor',
      description: 'Dispensador automático de jabón en espuma con sensor de movimiento para un lavado higiénico sin contacto.',
      short_description: 'Dispensador inteligente de jabón por sensor.',
      category_id: categoryMap['hogar'],
      price: 69900.00,
      compare_price: 99900.00,
      cost_price: 22000.00,
      sku: 'DIS-001',
      status: 'active',
      stock: 200,
      is_featured: false,
      meta_title: 'Dispensador Automático de Jabón | MIleGo',
      meta_description: 'Lavado de manos sin contacto por sensor infrarrojo.',
    },
    {
      store_id: storeId,
      name: 'Aspiradora de Mano USB',
      slug: 'aspiradora-mano-usb',
      description: 'Aspiradora inalámbrica portátil de alta succión para carro, oficina y rincones difíciles.',
      short_description: 'Mini aspiradora inalámbrica recargable.',
      category_id: categoryMap['automotriz'],
      price: 89900.00,
      compare_price: 129900.00,
      cost_price: 34000.00,
      sku: 'ASP-001',
      status: 'active',
      stock: 110,
      is_featured: false,
      meta_title: 'Aspiradora de Mano Recargable USB | MIleGo',
      meta_description: 'Limpieza rápida sin cables en tu auto y hogar.',
    },
    {
      store_id: storeId,
      name: 'Trípode Inteligente AI',
      slug: 'tripode-inteligente-ai',
      description: 'Soporte inteligente con seguimiento de rostro por inteligencia artificial 360 grados para videos perfectos.',
      short_description: 'Soporte estabilizador con rastreo facial.',
      category_id: categoryMap['tecnologia'],
      price: 99900.00,
      compare_price: 149900.00,
      cost_price: 38000.00,
      sku: 'TRI-001',
      status: 'active',
      stock: 70,
      is_featured: false,
      meta_title: 'Trípode con Seguimiento de Rostro AI | MIleGo',
      meta_description: 'Crea contenido con manos libres y encuadre inteligente.',
    },
    {
      store_id: storeId,
      name: 'Cerradura Portátil de Seguridad',
      slug: 'cerradura-portatil',
      description: 'Cerrojo metálico de seguridad portátil para puertas de hoteles, Airbnb y apartamentos de alquiler.',
      short_description: 'Bloqueo portátil de seguridad para puertas.',
      category_id: categoryMap['hogar'],
      price: 59900.00,
      compare_price: 89900.00,
      cost_price: 18000.00,
      sku: 'CER-001',
      status: 'active',
      stock: 300,
      is_featured: false,
      meta_title: 'Cerradura Portátil de Seguridad Viajera | MIleGo',
      meta_description: 'Seguridad adicional en segundos para cualquier puerta.',
    },
  ];

  const productRows = await knex('products').insert(productsData).returning(['id', 'slug', 'sku', 'price', 'compare_price', 'stock']);

  // Insert variants and images for each product
  const variantsData = [];
  const imagesData = [];

  productRows.forEach(product => {
    // Primary variant (1 unit)
    variantsData.push({
      product_id: product.id,
      name: 'Unidad Individual',
      sku: `${product.sku}-V1`,
      price: product.price,
      compare_price: product.compare_price,
      stock: product.stock,
      sort_order: 1,
      is_active: true
    });

    // Combo variant (Pack x2 with discount)
    variantsData.push({
      product_id: product.id,
      name: 'Pack x2 (Ahorro Especial)',
      sku: `${product.sku}-V2`,
      price: Math.round(product.price * 1.7), // 15% discount for 2
      compare_price: product.compare_price * 2,
      stock: product.stock,
      sort_order: 2,
      is_active: true
    });

    // Seed dummy primary image
    imagesData.push({
      product_id: product.id,
      url: `/assets/img/products/${product.slug}-hero.webp`,
      alt: product.name,
      sort_order: 1,
      is_primary: true
    });
  });

  await knex('product_variants').insert(variantsData);
  await knex('product_images').insert(imagesData);
}
