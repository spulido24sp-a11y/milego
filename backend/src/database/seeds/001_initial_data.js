const modules = ['products', 'categories', 'orders', 'customers', 'users', 'settings', 'reviews'];
const actions = ['create', 'read', 'update', 'delete'];
const extraPermissions = [
  { name: 'Ver dashboard', slug: 'dashboard.view', module: 'dashboard', action: 'view' },
  { name: 'Ver auditoria', slug: 'audit.view', module: 'audit', action: 'view' },
  { name: 'Ver reportes', slug: 'reports.view', module: 'reports', action: 'view' },
];

export async function seed(knex) {
  await knex.raw('TRUNCATE TABLE settings, role_permissions, sessions, api_keys, users, permissions, roles, stores RESTART IDENTITY CASCADE');

  const [storeRow] = await knex('stores').insert({
    name: 'MIleGo Store',
    slug: 'milego-store',
    domain: 'milego.co',
    currency: 'COP',
    timezone: 'America/Bogota',
    status: 'active',
  }).returning('id');
  const storeId = storeRow.id;

  const rolesData = [
    { name: 'Administrador', slug: 'admin', description: 'Acceso completo al sistema', is_system: true },
    { name: 'Gerente', slug: 'manager', description: 'Gestion operativa del negocio', is_system: true },
    { name: 'Consultor', slug: 'viewer', description: 'Solo lectura de informacion', is_system: true },
  ];

  const [adminRoleId, managerRoleId, viewerRoleId] = (await knex('roles').insert(rolesData).returning('id')).map(r => r.id);

  const permissionsData = [];
  for (const mod of modules) {
    for (const action of actions) {
      permissionsData.push({
        name: `${mod}.${action}`,
        slug: `${mod}.${action}`,
        module: mod,
        action,
      });
    }
  }
  permissionsData.push(...extraPermissions);

  const insertedPermissions = await knex('permissions').insert(permissionsData).returning('id');
  const allPermissionIds = insertedPermissions.map(p => p.id);

  const adminRolePermissions = allPermissionIds.map(permissionId => ({
    role_id: adminRoleId,
    permission_id: permissionId,
  }));
  await knex('role_permissions').insert(adminRolePermissions);

  const argon2 = (await import('argon2')).default;
  const passwordHash = await argon2.hash('admin123');

  await knex('users').insert({
    name: 'Administrador MIleGo',
    email: 'admin@milego.co',
    password_hash: passwordHash,
    store_id: storeId,
    role_id: adminRoleId,
    is_active: true,
  });

  const settingsData = [
    { store_id: storeId, key: 'brand.name', value: JSON.stringify('MIleGo'), group_name: 'brand', type: 'string', is_public: true },
    { store_id: storeId, key: 'brand.logo', value: JSON.stringify(''), group_name: 'brand', type: 'string', is_public: true },
    { store_id: storeId, key: 'contact.whatsapp', value: JSON.stringify(''), group_name: 'contact', type: 'string', is_public: true },
    { store_id: storeId, key: 'contact.email', value: JSON.stringify(''), group_name: 'contact', type: 'string', is_public: true },
    { store_id: storeId, key: 'analytics.meta_pixel', value: JSON.stringify(''), group_name: 'analytics', type: 'string', is_public: false },
    { store_id: storeId, key: 'analytics.ga4', value: JSON.stringify(''), group_name: 'analytics', type: 'string', is_public: false },
    { store_id: storeId, key: 'shipping.free_shipping_over', value: JSON.stringify('0'), group_name: 'shipping', type: 'number', is_public: true },
  ];
  await knex('settings').insert(settingsData);
}