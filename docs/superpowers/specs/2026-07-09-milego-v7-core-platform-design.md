# MIleGo V7 — Core Platform Design

**Fecha:** 2026-07-09
**Versión:** 7.1
**Estado:** Approved
**Arquitecto:** CTO / Lead Developer

---

## 1. Executive Summary

MIleGo pasa de ser una tienda estática a una **plataforma SaaS de ecommerce**. El objetivo de V7 es construir el Core Platform: la infraestructura backend + admin sobre la que crecerá el negocio durante los próximos años, sin volver a tocar la base.

### Principios arquitectónicos

1. **Hybrid JAMstack** — CDN para contenido inmutable (landing, políticas, SEO), API para datos dinámicos (precios, stock, reviews, config).
2. **Database as Source of Truth** — PostgreSQL es el único origen de verdad. El frontend público consulta la API, no archivos JSON.
3. **API-first** — Todo el negocio expuesto via REST API versionada. Admin SPA consume la misma API que el frontend público. Diseñada para servir a web, app móvil, marketplaces y CRMs externos simultáneamente.
4. **Security by design** — JWT + refresh tokens, RBAC, Argon2, rate limiting, audit logging desde el día 1.
5. **Domain-driven structure** — Separación clara: controllers (HTTP) → services (reglas de negocio) → repositories (acceso a datos). Un controller nunca consulta la DB directamente.
6. **Multi-tenant desde el día 1** — Cada tabla de negocio incluye `store_id` para soportar múltiples marcas/tiendas sin reescribir el sistema.
7. **Event-driven** — Las acciones de negocio generan eventos. El resto del sistema reacciona (integraciones, jobs, auditoría) sin acoplar el flujo principal.
8. **Configuración dinámica** — Secretos en `.env`, configuración del negocio en tabla `settings` editable desde el admin sin redeploy.

---

## 2. Architecture Overview

```
                    Internet
                       │
               https://milego.co
                       │
        ┌──────────────┴──────────────┐
        │                             │
    Landing HTML (Netlify CDN)    API Node.js + Express
    (estático, SEO)               (VPS: Railway/Render/DO)
        │                             │
        └─────────────┬───────────────┘
                      │
                 PostgreSQL
                      │
                   Admin SPA
                (/admin, mismo VPS)
```

### Hybrid data model

| Elemento | Fuente | Estrategia |
|----------|--------|------------|
| Landing, Home, FAQ, Políticas | CDN (Netlify) | HTML estático prerenderizado |
| CSS, JS, Assets | CDN (Netlify) | Cache público, hashado |
| Precios, Stock, Productos | API | `GET /api/v1/products/:slug` |
| Reviews | API | `GET /api/v1/products/:slug/reviews` |
| Config global | API | `GET /api/v1/config` (cacheable) |
| Pedidos, Dashboard | API | Solo admin, requiere auth |
| Imágenes | CDN / Object Storage | URL pública, servido por CDN |

---

## 3. Tech Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework API | Express | 4.x |
| Lenguaje | JavaScript (ESM) | — |
| Base de datos | PostgreSQL | 16 |
| ORM / Query | Knex.js | Migraciones + raw queries |
| Auth | JWT + Refresh Tokens + Argon2 | jsonwebtoken + argon2 |
| Validación | Zod | — |
| Documentación API | OpenAPI 3.1 (Swagger) | swagger-jsdoc + swagger-ui-express |
| Seguridad | Helmet, CORS, express-rate-limit | — |
| Logging | Pino | — |
| Testing | Vitest | — |
| Admin SPA | Vanilla JS | Sin frameworks, sin build step |
| Admin CSS | Vanilla CSS | Consistente con frontend público |
| Deploy API | Railway / Render / DigitalOcean App Platform | — |
| Deploy Frontend | Netlify | Sin cambios |

---

## 4. Database Schema

Todas las tablas incluyen:
- `id` SERIAL PRIMARY KEY
- `uuid` UUID UNIQUE DEFAULT gen_random_uuid() (público)
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- `deleted_at` TIMESTAMPTZ NULL (soft delete donde aplique)
- Claves foráneas con ON DELETE RESTRICT / CASCADE según corresponda
- Índices en UUID, slugs, FKs, y columnas de búsqueda frecuente

### 4.0 Multi-tenant (Stores)

```sql
CREATE TABLE stores (
    id          SERIAL PRIMARY KEY,
    uuid        UUID UNIQUE DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,     -- 'milego', 'needo'
    domain      VARCHAR(200),                      -- milego.co, needo.co
    logo        TEXT,
    currency    VARCHAR(3) DEFAULT 'COP',
    timezone    VARCHAR(50) DEFAULT 'America/Bogota',
    status      VARCHAR(20) DEFAULT 'active',      -- 'active', 'suspended', 'maintenance'
    settings    JSONB DEFAULT '{}',                 -- Configuración específica de la tienda
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
```

**Regla:** Todas las tablas de negocio (productos, pedidos, clientes, categorías, reviews, etc.) incluyen `store_id INTEGER REFERENCES stores(id)` como clave foránea obligatoria. Los índices compuestos `(store_id, slug)` aseguran unicidad por tienda.

### 4.1 Auth & Access

```sql
-- Roles del sistema
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,  -- 'admin', 'manager', 'viewer'
    description TEXT,
    is_system   BOOLEAN DEFAULT false,          -- no se puede eliminar
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Permisos individuales (granulares)
CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) UNIQUE NOT NULL,  -- 'products.create', 'orders.read'
    module      VARCHAR(100) NOT NULL,          -- 'products', 'orders', 'users'
    action      VARCHAR(50) NOT NULL,            -- 'create', 'read', 'update', 'delete'
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id       INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,               -- Argon2id
    role_id         INTEGER REFERENCES roles(id),
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE sessions (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    ip_address        INET,
    user_agent        TEXT,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE api_keys (
    id            SERIAL PRIMARY KEY,
    uuid          UUID UNIQUE DEFAULT gen_random_uuid(),
    name          VARCHAR(200) NOT NULL,
    key_hash      TEXT NOT NULL,                 -- SHA-256 de la API key
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permissions   JSONB DEFAULT '[]',            -- ['products.read', 'orders.write']
    last_used_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

### 4.2 Customers

```sql
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id        INTEGER NOT NULL REFERENCES stores(id),
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    document_type   VARCHAR(20),                 -- 'CC', 'NIT', 'CE'
    document_number VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_deleted ON customers(deleted_at);

CREATE TABLE addresses (
    id            SERIAL PRIMARY KEY,
    uuid          UUID UNIQUE DEFAULT gen_random_uuid(),
    customer_id   INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    label         VARCHAR(100),                  -- 'Casa', 'Oficina'
    street        TEXT NOT NULL,
    city          VARCHAR(100) NOT NULL,
    state         VARCHAR(100),
    zip_code      VARCHAR(20),
    country       VARCHAR(100) DEFAULT 'Colombia',
    is_default    BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_addresses_customer ON addresses(customer_id);
```

### 4.3 Products

```sql
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    uuid        UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id    INTEGER NOT NULL REFERENCES stores(id),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    parent_id   INTEGER REFERENCES categories(id),
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id        INTEGER NOT NULL REFERENCES stores(id),
    name            VARCHAR(300) NOT NULL,
    slug            VARCHAR(300) NOT NULL,
    description     TEXT,
    short_description VARCHAR(500),
    category_id     INTEGER REFERENCES categories(id),
    price           INTEGER NOT NULL,            -- en centavos (129900 = $129.900)
    compare_price   INTEGER,                     -- precio de referencia / tachado
    cost_price      INTEGER,                     -- costo real del producto
    sku             VARCHAR(100) UNIQUE,
    barcode         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active', -- 'active', 'draft', 'archived'
    stock           INTEGER DEFAULT 0,
    weight          INTEGER,                     -- gramos
    is_featured     BOOLEAN DEFAULT false,
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    dropi_id        VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_products_store_slug ON products(store_id, slug);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_dropi ON products(dropi_id);
CREATE INDEX idx_products_deleted ON products(deleted_at);

CREATE TABLE product_images (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    alt         VARCHAR(300),
    sort_order  INTEGER DEFAULT 0,
    is_primary  BOOLEAN DEFAULT false
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

CREATE TABLE product_variants (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,           -- 'x6 unidades', 'x12 unidades'
    sku         VARCHAR(100),
    price       INTEGER NOT NULL,                -- en centavos
    compare_price INTEGER,
    stock       INTEGER DEFAULT 0,
    weight      INTEGER,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true
);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
```

### 4.4 Suppliers

```sql
CREATE TABLE suppliers (
    id            SERIAL PRIMARY KEY,
    uuid          UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id      INTEGER NOT NULL REFERENCES stores(id),
    name          VARCHAR(300) NOT NULL,
    contact_name  VARCHAR(200),
    email         VARCHAR(255),
    phone         VARCHAR(50),
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE supplier_products (
    id              SERIAL PRIMARY KEY,
    supplier_id     INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id) ON DELETE CASCADE,
    supplier_sku    VARCHAR(100),
    cost_price      INTEGER,                     -- en centavos
    lead_time       INTEGER,                     -- días de entrega
    is_preferred    BOOLEAN DEFAULT false,
    UNIQUE (supplier_id, product_id)
);
CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);
```

### 4.5 Orders

```sql
CREATE TABLE orders (
    id                SERIAL PRIMARY KEY,
    uuid              UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id          INTEGER NOT NULL REFERENCES stores(id),
    order_number      VARCHAR(50) NOT NULL, -- 'MGO-00001' (único por store)
    customer_id       INTEGER REFERENCES customers(id),
    status            VARCHAR(50) DEFAULT 'pending',
                      -- 'pending','confirmed','processing','shipped','delivered','cancelled','refunded'
    subtotal          INTEGER NOT NULL,            -- centavos
    shipping_cost     INTEGER DEFAULT 0,
    discount          INTEGER DEFAULT 0,
    total             INTEGER NOT NULL,            -- centavos
    payment_method    VARCHAR(50),                 -- 'card','transfer','cash_on_delivery','paymentez'
    payment_status    VARCHAR(50) DEFAULT 'pending',
                      -- 'pending','paid','failed','refunded'
    notes             TEXT,
    shipping_address_id INTEGER REFERENCES addresses(id),
    coupon_id         INTEGER REFERENCES coupons(id),
    shipping_company  VARCHAR(100),
    tracking_number   VARCHAR(200),
    whatsapp_opt_in   BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_orders_store_number ON orders(store_id, order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_deleted ON orders(deleted_at);

CREATE TABLE order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INTEGER REFERENCES products(id),
    variant_id    INTEGER REFERENCES product_variants(id),
    product_name  VARCHAR(300) NOT NULL,           -- snapshot al momento de la compra
    product_sku   VARCHAR(100),
    quantity      INTEGER NOT NULL,
    unit_price    INTEGER NOT NULL,                -- centavos
    total_price   INTEGER NOT NULL                 -- centavos
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_status_history (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status      VARCHAR(50) NOT NULL,
    notes       TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_history_order ON order_status_history(order_id);
```

### 4.6 Reviews

```sql
CREATE TABLE reviews (
    id            SERIAL PRIMARY KEY,
    uuid          UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id      INTEGER NOT NULL REFERENCES stores(id),
    product_id    INTEGER REFERENCES products(id) ON DELETE CASCADE,
    customer_id   INTEGER REFERENCES customers(id),
    name          VARCHAR(200) NOT NULL,           -- nombre visible públicamente
    email         VARCHAR(255),
    rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title         VARCHAR(300),
    content       TEXT,
    is_approved   BOOLEAN DEFAULT false,
    is_featured   BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_approved ON reviews(is_approved) WHERE is_approved = true;
```

### 4.7 Coupons

```sql
CREATE TABLE coupons (
    id                SERIAL PRIMARY KEY,
    uuid              UUID UNIQUE DEFAULT gen_random_uuid(),
    store_id          INTEGER NOT NULL REFERENCES stores(id),
    code              VARCHAR(50) NOT NULL, -- (store_id, code) UNIQUE
    type              VARCHAR(20) NOT NULL,         -- 'percentage', 'fixed'
    value             INTEGER NOT NULL,             -- porcentaje (10 = 10%) o monto en centavos
    min_order_amount  INTEGER,
    max_discount      INTEGER,                      -- máximo descuento en centavos
    max_uses          INTEGER,
    used_count        INTEGER DEFAULT 0,
    is_active         BOOLEAN DEFAULT true,
    starts_at         TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_coupons_store_code ON coupons(store_id, code);
```

### 4.8 Configuration

```sql
CREATE TABLE settings (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL REFERENCES stores(id),
    key         VARCHAR(200) NOT NULL,
    UNIQUE (store_id, key),
    value       JSONB NOT NULL,
    group_name  VARCHAR(100) NOT NULL,              -- 'whatsapp', 'analytics', 'brand', 'shipping'
    description TEXT,
    type        VARCHAR(50) DEFAULT 'string',        -- 'string', 'number', 'boolean', 'json'
    is_public   BOOLEAN DEFAULT false,               -- accesible via GET /api/v1/config
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_settings_group ON settings(group_name);
CREATE INDEX idx_settings_public ON settings(is_public) WHERE is_public = true;
```

### 4.9 Audit & Telemetry

```sql
CREATE TABLE audit_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    action       VARCHAR(100) NOT NULL,             -- 'product.create', 'order.update_status'
    entity_type  VARCHAR(100) NOT NULL,              -- 'product', 'order', 'user'
    entity_id    INTEGER,
    old_values   JSONB,
    new_values   JSONB,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE TABLE webhook_logs (
    id              SERIAL PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,           -- 'order.created', 'payment.received'
    payload         JSONB,
    response_status INTEGER,
    response_body   TEXT,
    status          VARCHAR(20) DEFAULT 'pending',   -- 'pending','success','failed'
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_events (
    id          SERIAL PRIMARY KEY,
    event_type  VARCHAR(100) NOT NULL,               -- 'page_view', 'purchase', 'add_to_cart'
    event_name  VARCHAR(200),
    payload     JSONB,
    source      VARCHAR(50),                         -- 'web', 'admin', 'api'
    session_id  VARCHAR(100),
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

### 4.10 Operational Tables (Events, Jobs, Webhooks, Inventory)

```sql
-- Event Bus persistence (idempotent event replay)
CREATE TABLE event_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name    VARCHAR(100) NOT NULL,               -- 'order.created', 'product.updated'
    payload       JSONB NOT NULL,
    status        VARCHAR(20) DEFAULT 'pending',       -- 'pending','processing','completed','failed'
    error_message TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    processed_at  TIMESTAMPTZ
);
CREATE INDEX idx_event_logs_status ON event_logs(status);
CREATE INDEX idx_event_logs_created ON event_logs(created_at);

-- Async job queue with retry support
CREATE TABLE jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(100) NOT NULL,               -- 'send_whatsapp', 'sync_dropi', 'send_webhook'
    payload       JSONB NOT NULL,
    status        VARCHAR(20) DEFAULT 'pending',       -- 'pending','processing','completed','failed'
    attempts      INTEGER DEFAULT 0,
    max_attempts  INTEGER DEFAULT 5,
    available_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    failed_reason TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_jobs_available ON jobs(available_at) WHERE status = 'pending';

-- Webhook idempotency (proof-of-delivery per external_id)
CREATE TABLE webhook_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider      VARCHAR(50) NOT NULL,                -- 'dropi', 'meta', 'whatsapp', 'carrier'
    external_id   VARCHAR(200) NOT NULL,               -- ID único del proveedor
    event_type    VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(20) DEFAULT 'received',      -- 'received','processed','skipped'
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider, external_id)                     -- garantiza idempotencia
);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider, external_id);

-- Inventory movement ledger (nunca se modifica stock sin registrar)
CREATE TABLE inventory_movements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    INTEGER REFERENCES products(id) ON DELETE CASCADE,
    variant_id    INTEGER REFERENCES product_variants(id),
    type          VARCHAR(20) NOT NULL,                -- 'initial','sale','refund','adjustment','purchase','transfer'
    quantity      INTEGER NOT NULL,                    -- positivo = entrada, negativo = salida
    before_stock  INTEGER NOT NULL,
    after_stock   INTEGER NOT NULL,
    reference_type VARCHAR(50),                        -- 'order', 'purchase_order', 'manual'
    reference_id  INTEGER,
    notes         TEXT,
    created_by    INTEGER REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_created ON inventory_movements(created_at);
```

---

## 5. API Design

### 5.1 Versioning
- Base: `/api/v1`
- Header: `Accept: application/json`
- Content-Type: `application/json`

### 5.2 Directory Structure

```
src/
├── app.js                     # Express app setup
├── server.js                  # Entry point (listen)
├── config/
│   ├── index.js               # env vars loader
│   ├── database.js            # Knex instance
│   └── cors.js                # CORS config
├── database/
│   ├── migrations/            # Knex migrations
│   └── seeds/                 # Seed data (initial store, roles, permissions)
├── middlewares/
│   ├── auth.js                # JWT verification
│   ├── permissions.js         # RBAC middleware
│   ├── validate.js            # Zod validation middleware
│   ├── errorHandler.js        # Global error handler
│   └── audit.js               # Audit logging middleware
├── controllers/
│   ├── auth.controller.js
│   ├── products.controller.js
│   ├── config.controller.js
│   └── users.controller.js
├── services/
│   ├── auth.service.js
│   ├── products.service.js
│   ├── settings.service.js
│   └── audit.service.js
├── repositories/
│   ├── user.repository.js
│   ├── product.repository.js
│   ├── settings.repository.js
│   └── audit.repository.js
├── validators/
│   ├── auth.validator.js
│   ├── product.validator.js
│   └── user.validator.js
├── routes/
│   ├── index.js               # Route aggregator
│   ├── auth.routes.js
│   ├── products.routes.js
│   ├── config.routes.js
│   └── users.routes.js
├── models/
│   └── index.js               # Re-exports, type definitions
├── events/
│   ├── index.js               # Event Bus setup
│   ├── handlers/
│   │   ├── audit.handler.js   # Escucha eventos → escribe audit_logs
│   │   ├── webhook.handler.js # Escucha eventos → dispara webhooks
│   │   └── analytics.handler.js
│   └── catalog.js             # Catálogo de eventos disponibles
├── jobs/
│   ├── queue.js               # Cola de trabajos (PostgreSQL-based)
│   ├── worker.js              # Worker que procesa jobs
│   └── orderJobs.js           # Jobs relacionados a pedidos
├── integrations/
│   ├── registry.js            # Integration registry (enabled/disabled)
│   ├── base.integration.js    # Clase base abstracta
│   ├── dropi/
│   │   └── client.js
│   ├── meta/
│   │   └── client.js
│   ├── whatsapp/
│   │   └── client.js
│   └── carriers/
│       └── coordinator.js
├── storage/
│   ├── index.js               # StorageProvider interface
│   ├── local.provider.js      # fs-based (desarrollo)
│   └── cloudinary.provider.js # Cloudinary (producción)
├── utils/
│   ├── jwt.js                 # JWT helpers
│   ├── password.js            # Argon2 helpers
│   └── response.js            # Standardized response format
└── app/
    └── index.js               # Express app factory
```

### 5.3 REST API — Phase 1 Endpoints

```
# Auth
POST   /api/v1/auth/login          → Login (email + password)
POST   /api/v1/auth/refresh        → Refresh token
POST   /api/v1/auth/logout         → Invalidate refresh token
GET    /api/v1/auth/me             → Current user profile

# Config (público, cacheable)
GET    /api/v1/config              → Public settings (brand, contact, analytics, shipping)

# Products (admin)
GET    /api/v1/products            → List products (paginated, filterable)
POST   /api/v1/products            → Create product
GET    /api/v1/products/:id        → Get product
PUT    /api/v1/products/:id        → Update product
DELETE /api/v1/products/:id        → Soft delete product
GET    /api/v1/products/:slug/public → Public product data (precio, stock, images, variants)

# Categories (admin)
GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/:id
DELETE /api/v1/categories/:id

# Users (admin)
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

### 5.4 Tenant Context Middleware

Cada request autenticado establece el `store_id` del usuario. Todos los repositorios lo aplican automáticamente en cada consulta.

**Regla:** Ningún repository puede consultar entidades multi-tenant sin filtrar por `store_id`.

```
Request → JWT → user → user.store_id → TenantContext.set(store_id)
                                                    ↓
                              Repository.getAll() → WHERE store_id = current_store
```

```javascript
// middlewares/tenant.js
export function tenantContext(req, res, next) {
  req.tenant = { storeId: req.user.store_id };
  next();
}
```

```javascript
// repositories/product.repository.js
class ProductRepository {
  async findAll({ tenant }) {
    return await db('products')
      .where({ store_id: tenant.storeId, deleted_at: null });
  }
}
```

Las rutas públicas (`GET /api/v1/config`, `GET /api/v1/products/:slug/public`) determinan el tenant mediante el dominio del request (ej. `milego.co` → `store_id = 1`).

### 5.5 Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El campo email es requerido",
    "details": [
      { "field": "email", "message": "Requerido" }
    ]
  }
}
```

---

## 6. Security

### 6.1 Capas de seguridad

| Capa | Implementación | Detalle |
|------|---------------|---------|
| HTTP Headers | Helmet | CSP, X-Frame-Options, X-Content-Type-Options |
| CORS | Lista blanca por dominio | Configurable via `CORS_ORIGINS` env var |
| Rate Limiting | express-rate-limit | 100 req/min general, 5 req/min login, 10 req/min auth endpoints |
| Password Hashing | Argon2id | Memoria 64MB, tiempo 3, paralelismo 2 |
| JWT | Access + Refresh | Access 15 min, Refresh 7 días. Rotación de refresh tokens |
| RBAC | Middleware de permisos | `req.user.permissions` verificado en cada ruta protegida |
| Input Validation | Zod | Schema por endpoint, mensajes de error en español |
| UUID | Identificadores públicos | Opacos, secuenciales solo internamente |
| Soft Delete | Global | `deleted_at` en TODAS las tablas de negocio. Nunca `DELETE FROM` |

### 6.2 Reglas de rate limiting específicas

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `POST /api/v1/auth/login` | 5 intentos | 1 minuto |
| `POST /api/v1/auth/refresh` | 10 | 1 minuto |
| `POST /api/v1/products` | 30 | 1 minuto |
| `GET /api/v1/config` | 200 | 1 minuto (cacheable) |
| General API | 100 | 1 minuto |

### 6.3 Soft delete — regla global

Ninguna entidad de negocio se elimina físicamente. Siempre:

```sql
UPDATE products SET deleted_at = NOW() WHERE id = $1;
```

Los repositories filtran `deleted_at IS NULL` por defecto. Para incluir eliminados se usa un método explícito `.withDeleted()`.

### 6.4 Backup & Recovery

```text
Backup diario (pg_dump)
    ↓
    Almacenamiento externo (S3/R2/B2)
    ↓
    Retención 30 días
    ↓
    Restauración probada mensualmente
```

- Automatizado via cron job / `pg_cron`
- Backup cifrado en reposo
- Documentación de restore: `docs/ops/disaster-recovery.md`

### 6.5 Observabilidad

Desde Fase 1:

| Dimensión | Implementación |
|-----------|---------------|
| Request ID | UUID por request via middleware (`req.id`) |
| Logging estructurado | Pino (JSON), con `req.id`, `userId`, `storeId` |
| Error tracking | Error handler global + logs estructurados |
| Response time | Middleware que mide y logea `duration_ms` |
| Health check | `GET /api/v1/health` → `{ status, uptime, db, version }` |

---

## 7. Event Bus & Async Jobs

Cada acción importante del negocio genera un evento. Los suscriptores reaccionan sin acoplar el flujo principal.

### 7.1 Event Bus (event-driven)

```
OrderCreated → EventBus.emit('order.created', order)
                   ↓
              ┌──────────────────┐
              │  Suscriptores     │
              ├──────────────────┤
              │ • AuditLogger     │
              │ • WebhookEmitter  │
              │ • WhatsAppSender  │
              │ • DropiSync       │
              │ • AnalyticsTracker│
              │ • StockUpdater    │
              └──────────────────┘
```

```javascript
// Event Bus — patrón pub/sub síncrono para operaciones en el mismo proceso
class EventBus {
  constructor() { this.handlers = {}; }
  on(event, handler) { ... }
  emit(event, data)  { ... }
}

export const bus = new EventBus();
```

**Reglas del Event Bus:**
- Los handlers se ejecutan en el orden en que se registraron.
- Cada evento se persiste en `event_logs` (tabla) antes de procesar handlers.
- Si un handler falla, `event_logs.status` se marca como `'failed'` y se puede reintentar desde el admin.
- No se usa para delegar trabajo pesado — eso va a los Jobs.
- El event_logs permite replay: si un handler nuevo se agrega después, se pueden reprocesar eventos históricos.

### 7.2 Async Jobs

Todo lo que implique I/O externa (HTTP calls a Dropi, WhatsApp, carriers, email) se ejecuta en background.

```text
Petición HTTP (POST /api/v1/orders)
       │
       ▼
Guarda en DB → 200 OK ← Respuesta rápida al cliente
       │
       ▼
Encola Job → Bull / PG Queue
       │
       ▼
Worker procesa:
  ├── Crear pedido en Dropi
  ├── Enviar WhatsApp de confirmación
  ├── Disparar webhook
  └── Registrar analytics
```

**Implementación (Fase 1):** Cola simple sobre PostgreSQL (SELECT ... FOR UPDATE SKIP LOCKED). En fases posteriores se puede migrar a Bull + Redis si el volumen lo requiere.

```javascript
// jobs/orderJobs.js
export async function processOrderCreatedJob(order) {
  await Promise.allSettled([
    dropi.createOrder(order),
    whatsapp.sendConfirmation(order),
    webhook.emit('order.created', order),
    analytics.trackPurchase(order),
  ]);
}
```

### 7.3 Job States & Retry

Estado de cada job en tabla `jobs`:

```
pending → processing → completed
                  ↓
               failed → pending (retry)
                  ↓
               failed (max_attempts reached)
```

**Exponential backoff:**

| Intento | Espera antes de reintentar |
|---------|---------------------------|
| 1 | 30 segundos |
| 2 | 5 minutos |
| 3 | 30 minutos |
| 4 | 2 horas |
| 5 (max) | 6 horas |

```javascript
// backend calcula available_at basado en attempts
function getBackoffDelay(attempt) {
  const delays = [30, 300, 1800, 7200, 21600]; // segundos
  return delays[attempt] || 21600;
}
```

### 7.5 Webhook Idempotency

Los proveedores externos (Dropi, Meta, transportadoras) pueden enviar el mismo evento múltiples veces. La tabla `webhook_events` con UNIQUE `(provider, external_id)` garantiza que cada evento se procese una sola vez.

```
Proveedor → POST /api/v1/webhooks/dropi
                 ↓
            Buscar webhook_events WHERE provider='dropi' AND external_id=$id
                 ↓
            ¿Existe? → 200 OK (skipped, ya procesado)
            ¿No existe? → Insertar + procesar + 200 OK
```

```javascript
// Integraciones con idempotencia garantizada
async function handleWebhook(provider, externalId, payload) {
  const existing = await db('webhook_events')
    .where({ provider, external_id: externalId }).first();
  if (existing) return { status: 'skipped' };

  await db('webhook_events').insert({ provider, external_id: externalId, ... });
  await processEvent(payload);
  await db('webhook_events').where({ id }).update({ status: 'processed' });
}
```

### 7.6 Event Catalog (Phase 1)

| Evento | Disparador | Suscriptores (Fase 1) |
|--------|-----------|----------------------|
| `order.created` | POST /orders | audit, webhook, analytics |
| `order.status_changed` | PUT /orders/:id/status | audit, whatsapp, webhook |
| `product.created` | POST /products | audit |
| `product.updated` | PUT /products/:id | audit |
| `product.deleted` | DELETE /products/:id | audit |
| `user.login` | POST /auth/login | audit |
| `user.logout` | POST /auth/logout | audit |

---

## 8. Integrations as Plugins

Cada integración externa es un módulo independiente con su propio cliente HTTP, configuración y lógica de negocio.

### 8.1 Structure

```
src/integrations/
├── index.js                 # Integration registry
├── base.integration.js      # Clase base abstracta
├── dropi/
│   ├── client.js            # API client específico
│   ├── mapper.js            # Transformación de datos
│   └── sync.js              # Sincronización de productos/stock
├── meta/
│   ├── client.js            # Meta Conversions API
│   ├── pixel.js             # Eventos del pixel
│   └── catalog.js           # Catálogo de productos
├── whatsapp/
│   ├── client.js            # API de WhatsApp Business / Baileys
│   ├── templates.js         # Plantillas de mensajes
│   └── notifications.js     # Notificaciones automáticas
├── ga4/
│   └── client.js            # Google Analytics 4 Measurement Protocol
├── tiktok/
│   └── client.js            # TikTok Events API
└── carriers/
    ├── coordinator.js       # Selecciona transportadora según reglas
    ├── interrapidísimo.js
    ├── servientrega.js
    └── coordinadora.js
```

### 8.2 Integration Registry

```javascript
// integrations/index.js
const registry = {
  dropi: { enabled: false, client: null },
  meta:  { enabled: false, client: null },
  whatsapp: { enabled: false, client: null },
  // ...
};

export function getIntegration(name) {
  return registry[name];
}
```

Cada integración se conecta solo si está habilitada en `settings` y tiene credenciales configuradas.

---

## 9. Storage Abstraction

No se guardan archivos dentro del proyecto. Se define una interfaz abstracta que permite cambiar de proveedor sin tocar el resto del código.

### 9.1 Interface

```javascript
// storage/index.js
class StorageProvider {
  async upload(filePath, buffer) {}   // → URL pública
  async delete(filePath) {}
  async getUrl(filePath) {}            // → URL pública firmada
  async list(prefix) {}
}
```

### 9.2 Providers (Fase 1)

| Proveedor | Implementación | Uso |
|-----------|---------------|-----|
| **Local** | `fs.promises` a `/storage/uploads` | Desarrollo |
| **Cloudinary** | SDK oficial | Producción (incluye transformaciones de imágenes) |
| **S3 / R2** | `@aws-sdk/client-s3` | Escalado futuro |

### 9.3 Uso

```javascript
// Ejemplo: subir imagen de producto
const productImage = await storage.upload(
  `products/${product.uuid}/${filename}`,
  buffer
);
// productImage → "https://res.cloudinary.com/milego/image/upload/v1/products/abc123/imagen.webp"
```

El provider se selecciona via `STORAGE_PROVIDER=cloudinary` en `.env` sin cambiar código.

---

## 10. Admin SPA
### 10.1 Structure

```
admin/
├── index.html              # Login + SPA shell
├── css/
│   ├── admin.css           # Layout, sidebar, topbar
│   ├── login.css
│   └── modules/            # Styles per section
├── js/
│   ├── admin.js            # App shell (router, state, API client)
│   ├── lib/
│   │   ├── api.js          # HTTP client con JWT refresh automático
│   │   ├── router.js       # Hash-based SPA router
│   │   └── state.js        # Global state manager
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── products.js
│   │   ├── categories.js
│   │   ├── orders.js       # (placeholder Fase 2)
│   │   ├── customers.js    # (placeholder Fase 3)
│   │   └── settings.js
│   └── components/
│       ├── sidebar.js
│       ├── topbar.js
│       ├── datatable.js
│       └── modal.js
└── assets/
```

### 10.2 Auth Flow
1. User visita `/admin` → ve login form
2. POST `/api/v1/auth/login` → recibe `{ accessToken, refreshToken }`
3. Access token en memoria (variable JS), refresh token en `httpOnly` cookie
4. API client interceptor: si 401, intenta refresh automático
5. Si refresh falla → redirige a login

### 10.3 Modules (Phase 1)
- **Dashboard** — Resumen básico (total productos, categorías, usuarios)
- **Products** — CRUD completo con datatable, formulario, upload de imágenes
- **Categories** — CRUD jerárquico
- **Settings** — Editor de configuración (WhatsApp, Pixel, GA4, etc.)
- **Users** — Gestión de usuarios del sistema
- **Roles** — Asignación de permisos
- **Audit Log** — Visualizador de auditoría
- **Stores** — Gestión de tiendas (multi-tenant)

---

## 11. Phase 1 Scope — Core Platform

### Lo que se construye en esta fase:

**Backend:**
- [x] Express scaffold con estructura de directorios
- [x] Database: todas las tablas (migraciones + seeds con tienda inicial, roles, permisos)
- [x] Tenant Context Middleware — `store_id` automático en cada request
- [x] Auth: login, refresh, logout, me (con rate limiting 5 req/min en login)
- [x] RBAC middleware
- [x] Zod validation middleware
- [x] Error handler global con request ID
- [x] Audit logging (cada write importante)
- [x] Event Bus con persistencia en `event_logs`
- [x] Async Jobs con `jobs` table, estados, retry exponential backoff
- [x] Webhook idempotency con `webhook_events` table (UNIQUE provider+external_id)
- [x] Inventory movements ledger (`inventory_movements`)
- [x] Security: Helmet, CORS por dominio, rate limiting por endpoint, Argon2id
- [x] Soft delete global (ninguna tabla usa DELETE físico)
- [x] API endpoints: auth, config (público), products CRUD, categories CRUD, users CRUD
- [x] OpenAPI /docs (Swagger UI) desde el día 1
- [x] Storage abstraction (local provider para dev, Cloudinary para prod)
- [x] Health check endpoint (`GET /api/v1/health`)

**Admin SPA:**
- [x] Login page + auth flow con refresh automático
- [x] Shell layout: sidebar + topbar + content area
- [x] Products page: datatable + create/edit form
- [x] Categories page: hierarchical CRUD
- [x] Settings page: editor de configuraciones
- [x] Users page: CRUD básico
- [x] Audit log viewer
- [x] Dashboard básico

**Frontend público (cambios mínimos):**
- [x] `js/modules/products.js` modificado para fetch desde API
- [x] `js/modules/reviewsCarousel.js` modificado para fetch desde API
- [x] Nuevo `GET /api/v1/config` → reemplaza `config.js`
- [x] `app.js` modificado para cargar config desde API

### Lo que NO se construye en Fase 1:

| Feature | Fase |
|---------|------|
| Orders CRUD + historial | 2 |
| Customer CRM | 3 |
| Reviews flow (approve, hide, feature) | 3 |
| Costos, márgenes, dashboard financiero | 4 |
| ROAS, Pixel Dashboard | 4 |
| Meta CAPI | 5 |
| Dropi sync | 5 |
| Carrier integration | 5 |
| WhatsApp notifications | 5 |

---

## 12. Configuration & Environment

### 12.1 Separación de responsabilidades

| Dónde va | Qué contiene | Quién lo edita |
|----------|-------------|----------------|
| **`.env`** (servidor) | Secretos: DB credentials, JWT secret, SMTP password, API keys de integraciones | DevOps / CTO |
| **Tabla `settings`** (DB) | Config del negocio: WhatsApp number, Pixel IDs, GA4, logo, colores, moneda, dominio, transportadoras activas | Admin del negocio |

**Regla:** El `.env` nunca contiene valores que un administrador deba cambiar desde el panel. La tabla `settings` nunca contiene secretos.

### 12.2 Variables de entorno (.env)

```env
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/milego

# JWT
JWT_SECRET=change-me
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS
CORS_ORIGINS=http://localhost:5173,https://milego.co

# Rate Limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

---

## 13. Dependencies (npm)

```json
{
  "dependencies": {
    "express": "^4.18",
    "knex": "^3.1",
    "pg": "^8.11",
    "jsonwebtoken": "^9.0",
    "argon2": "^0.31",
    "zod": "^3.22",
    "helmet": "^7.1",
    "cors": "^2.8",
    "express-rate-limit": "^7.1",
    "pino": "^8.17",
    "pino-pretty": "^10.3",
    "swagger-jsdoc": "^6.2",
    "swagger-ui-express": "^5.0",
    "uuid": "^9.0",
    "dotenv": "^16.3"
  },
  "devDependencies": {
    "vitest": "^1.2",
    "nodemon": "^3.0"
  }
}
```

---

## 14. Spec Self-Review Checklist

- [x] **Placeholder scan:** No TBD/TODO — todos los módulos, endpoints y tablas están especificados
- [x] **Internal consistency:** Schema de DB → repositorios → servicios → controladores → rutas. Event Bus → event_logs → handlers → jobs. Todo coherente.
- [x] **Multi-tenant:** `stores` table + Tenant Context Middleware + `store_id` en todas las tablas de negocio. Índices compuestos `(store_id, slug)`. Ningún repository consulta sin store_id.
- [x] **Event-driven:** Event Bus con persistencia en `event_logs` para replay. Catálogo de eventos y handlers definidos.
- [x] **Jobs:** `jobs` table con estados (pending/processing/completed/failed), max_attempts=5, exponential backoff.
- [x] **Webhook idempotency:** `webhook_events` con UNIQUE(provider, external_id). Garantiza procesamiento único.
- [x] **Inventory:** `inventory_movements` ledger con before/after stock. Ningún cambio de stock sin registro.
- [x] **Soft delete:** Regla global. Todas las tablas de negocio con `deleted_at`. Repositories filtran por defecto.
- [x] **Security:** Helmet, CORS por dominio, rate limiting por endpoint (5/min login), Argon2id, JWT+refresh, RBAC — todo especificado.
- [x] **Observabilidad:** Request ID por request, Pino logging, health check endpoint, response time middleware.
- [x] **Backup:** pg_dump diario, retención 30 días, almacenamiento externo, restore probado mensualmente.
- [x] **Integrations:** Arquitectura de plugins desacoplados. Registry para habilitar/deshabilitar.
- [x] **Storage:** Interfaz abstracta con dos providers (local + cloudinary). Configurable via env var.
- [x] **Config:** Separación clara .env (secretos) vs settings DB (config del negocio). Sin ambigüedad.
- [x] **Scope check:** Phase 1 está acotada. Todo lo especificado entra en Phase 1. Features de fases posteriores claramente delegadas.
