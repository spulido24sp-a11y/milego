# Walkthrough: Epic 1 — Real Product Import Engine (Dropi)

Este documento detalla la implementación y validación del motor de importación real de **Dropi** completado con éxito durante el **Epic 1**.

---

## 1. Estructura y Código Desarrollado

### A. Capa de Integración Desacoplada (`integrations/`)
*   **[provider.interface.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/provider.interface.js):** Define la clase base abstracta `CommerceProvider` estableciendo las firmas estándar para desacoplar el resto de la aplicación de los detalles específicos del proveedor.
*   **[client.js (DropiClient)](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/client.js):** Cliente Axios/fetch oficial para consumir endpoints de Dropi (`https://api.dropi.co` o `test.api.dropi.co`). Soporta reintentos, timeouts de 10s, excepciones y registra logs en base de datos.
*   **[mapper.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/mapper.js):** Mapeador estático de campos para asegurar el contrato interno de MIleGo.
*   **[errors.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/errors.js):** Encapsulación de excepciones del proveedor (`DropiAPIError`, `DropiAuthError`, `DropiConnectionError`).
*   **[health.service.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/health.service.js):** Servicio para diagnosticar si el canal está habilitado, autenticado, responder latencia (ms) y última verificación.
*   **[sync.service.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/sync.service.js):** Orquestador de la importación idempotente y la re-sincronización protegida de stock, costo, variantes e imágenes.

### B. Rutas de la API & Base de Datos
*   **[integration.routes.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/routes/integration.routes.js):** Endpoints `/health/providers`, `/products/import` y `/products/:id/sync` protegidos por autenticación de inquilinos y control de permisos (RBAC).
*   **[020_create_integration_requests_log.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/database/migrations/020_create_integration_requests_log.js):** Tabla de telemetría para registrar la observabilidad de llamadas por integración.
*   **[021_add_provider_metadata_to_products.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/database/migrations/021_add_provider_metadata_to_products.js):** Incorporación de las columnas `provider_product_id`, `provider_id`, `provider_last_sync` y `sync_status` en la tabla `products` para soportar idempotencia multi-proveedor.

---

## 2. Pruebas y Cobertura de Tests

*   Creamos pruebas exhaustivas en:
    *   **[dropi-contract.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/dropi-contract.test.js):** Valida la exactitud del payload `dropi-product.json`.
    *   **[dropi-integration.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/dropi-integration.test.js):** Verifica de extremo a extremo la importación en base de datos, la idempotencia de duplicados y el bloqueo de datos modificados por el usuario.
*   Confirmamos que **los 71 tests de la plataforma pasaron con éxito (100% en verde)**:
    ```bash
    Test Files  12 passed (12)
    Tests       71 passed (71)
    Duration    2.08s
    ```

---

## 3. Resultados de la Beta Técnica & Benchmark de Rendimiento

Ejecutamos el script de benchmark `npm run benchmark` para validar la escalabilidad de importación e idempotencia con **50 productos de catálogo reales/estructurados**:

```bash
=== MIleGo OS Beta Technical Benchmark: Importing 50 Products ===

[Progress] Imported 10/50...
[Progress] Imported 20/50...
[Progress] Imported 30/50...
[Progress] Imported 40/50...
[Progress] Imported 50/50...

=== Performance Results ===
- Total Duration: 0.16 seconds (162 ms)
- Avg Time per Product: 3.24 ms
- Throughput: 308.64 products/sec
- Memory Heap Allocation: 2.54 MB
- SQL Database Operations Executed: 400 queries

=== Validating Idempotency & Data Lock ===
Executing resynchronization on custom product...
✅ DATA LOCK VERIFIED: Custom launch blueprints and copies were protected and NOT overwritten.

=== Beta Benchmark Successful ===
```

### Hallazgos Clave:
*   **Idempotencia Robusta:** Al re-sincronizar productos que ya existían, el sistema actualizó costo y stock sin duplicar registros.
*   **Data Lock Protegido:** El Launch Blueprint, la descripción personalizada del usuario y las copias publicitarias de IA permanecieron intactos durante la sincronización, aislando exitosamente los parámetros logísticos.
*   **Alta Eficiencia:** El procesamiento secuencial se realiza a una velocidad de **308 productos por segundo**, consumiendo menos de **3 MB de memoria Heap**.

---

## 4. Epic 2 — Launch Review Workspace (Completado)

Hemos diseñado e implementado el **Centro de Control del Lanzamiento** conectando la base de datos de versiones con la interfaz de usuario en el panel administrativo.

### A. Endpoints e Historial de Auditoría:
*   **[`launch_versions`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/database/migrations/022_create_launch_versions.js):** Nueva tabla Postgres para archivar un snapshot cada vez que se actualiza el blueprint.
*   **[`launch.routes.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/routes/launch.routes.js):** Provee endpoints para revisar, actualizar por sección (`PATCH`), regenerar de forma selectiva (`/regenerate`) y transicionar estados del lanzamiento (`approve`/`reject`).
*   **Validación de Margen:** El backend bloquea de forma inmediata cualquier guardado que intente establecer un precio de venta unitario inferior al costo del proveedor, devolviendo un error `INVALID_OFFER`.

### B. Interfaz de Usuario Visual:
*   **[`review.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/admin/js/pages/review.js):** Panel de control premium de 3 columnas:
    1.  **ADN Panel:** Muestra el Product, Market y Customer DNA explicados en lenguaje natural.
    2.  **Offer Builder:** Permite ajustar sugerencias de combos e inputs de precio. Calcula en tiempo real el Margen Bruto %, ROAS de equilibrio y CPA límite permitido.
    3.  **Copy Studio & SEO:** Inputs para ganchos, ganchos de Anuncio Meta/TikTok, plantilla de WhatsApp y SEO con contador de caracteres vivo.
    4.  **Landing Preview (Responsive):** Renderiza una previsualización interactiva con alternador de vista móvil y escritorio.
    5.  **Score and Versions:** Barra de progreso para cada dimensión de Commerce Confidence y auditoría de versiones de cambios.
*   **Integración del Listado:** En la pantalla **Products Intelligence**, agregamos el botón `🔍 Revisar` que abre de forma directa el Workspace del producto seleccionado.

### C. Cobertura de Pruebas:
*   **[`launch-review.test.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/launch-review.test.js):** Suite de pruebas que verifica la integridad de la carga del review, validaciones financieras, regeneración de secciones, historial de versiones en Knex y transiciones de estados del lanzamiento.
*   **Vitest Suite:** El 100% de los tests (`77 en total`) pasan correctamente en verde.

---

## 5. Sprint RC — Core Hardening & AI Runtime Prep (Completado)

Hemos endurecido el motor de IA y robustecido la infraestructura operacional para prepararla para múltiples proveedores en producción.

### A. Estructura de Datos e Infraestructura:
*   **[`023_create_sprint_rc_tables.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/database/migrations/023_create_sprint_rc_tables.js):** Crea las tablas `ai_cache` (caché de respuestas), `ai_usage` (registro detallado de consumo de tokens y costos por tenant) y `prompt_registry` (registro de prompts versionados).
*   **[`prompt-registry.service.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/prompt-registry.service.js):** Servicio para versionar prompts en la base de datos con temperatura, modelo y proveedor sugeridos, manteniendo compatibilidad de fallback local.
*   **[`ai-cache.service.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/ai-cache.service.js):** Sistema de firma SHA-256 (hashing versionado de prompt + esquema + temperatura) para evitar redundancias y consumo innecesario de tokens.
*   **[`schemas.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/schemas.js):** Validación de estructura JSON de salida con **Zod** para evitar respuestas corruptas.
*   **[`provider-router.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/provider-router.js):** Enrutador re-estructurado que evalúa cuotas de presupuesto, chequea caché, ejecuta llamadas e implementa una política de reintentos automáticos con retroceso exponencial (exponential backoff).

### B. Observabilidad y Rutas:
*   **Endpoint `/health/ai`:** Retorna latencia promedio, P95, tasa de Cache Hits, llamadas exitosas/fallidas, costos acumulados diarios/mensuales y conteo de tokens consumidos por store.

### C. Cobertura de Pruebas:
*   **[`ai-runtime-hardening.test.js`](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/ai-runtime-hardening.test.js):** Valida de forma estructurada el versionado de prompts, los reintentos automáticos ante salidas corruptas de Zod, la caché inteligente de costo cero y el bloqueo de llamadas ante sobrepasar límites de presupuesto diario ($1.00 USD) y mensual ($10.00 USD).
*   **Vitest Suite:** El 100% de los tests (`81 en total`) están en verde.



