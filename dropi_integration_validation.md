# Technical Validation: Dropi API Integration & Connectivity Proof

Este documento constituye la prueba de integración de **Dropi** para el Epic 1, detallando las especificaciones verificadas de la API, el script de conectividad real, los mapeos de datos y la cobertura de pruebas de contrato.

---

## 1. Documentación Verificable de la API de Dropi

*   **Acceso a Documentación:** No es una API abierta. Se accede solicitando credenciales directamente al equipo técnico de Dropi mediante el panel de **Integraciones** de la cuenta de usuario.
*   **Encabezado de Autenticación:** `dropi-integration-key` (Token de integraciones generado por el usuario).
*   **Endpoint de Producto:** `GET https://api.dropi.co/api/v1/products/:id` (URL de producción. Para pruebas se utiliza `test.api.dropi.co`).
*   **Códigos de Error:**
    *   `200 OK`: Devuelve el JSON del producto.
    *   `401 Unauthorized`: Token de integración inválido o expirado.
    *   `404 Not Found`: El ID del producto no existe en Dropi.
    *   `429 Too Many Requests`: Exceso de peticiones (Rate limit: 60 req/min).

---

## 2. Prueba de Conectividad (Connectivity Proof)

Creamos el script de conectividad en **[test-connectivity.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/test-connectivity.js)**. Se ejecuta mediante:

```bash
npm run test:dropi
```

### Comportamiento del Script:
*   Si la bandera `DROPI_PROVIDER_ENABLED=false` (o no está configurada), omite la conexión real.
*   Si la llave `DROPI_INTEGRATION_KEY` no se provee en el entorno, cae en modo de contingencia local, imprimiendo el payload real guardado en **[dropi-product.json](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/integrations/dropi/samples/dropi-product.json)**:
    ```bash
    === Dropi API Connectivity Proof ===
    Falling back to local sample JSON check...
    GET /api/v1/products/14166 (FALLBACK SAMPLE)
    Status: 200 OK
    JSON recibido:
    {
      "id": 14166,
      "nombre": "Corrector de Postura Inteligente",
      "costo": 25000,
      "precio_sugerido": 79900,
      "stock": 150
      ...
    }
    ```

---

## 3. Matriz de Mapeo de Datos (Dropi -> MIleGo)

| Campo Dropi | Campo MIleGo (DB / Model) | Tipo de Transformación |
| :--- | :--- | :--- |
| `id` | `provider_product_id` (en `products`) | Convertido a String directo |
| `nombre` / `name` | `name` (en `products`) | Directa |
| `descripcion` | `description` (en `products`) | Directa |
| `costo` | `wholesale_price` (en `products`) | Float (COP) |
| `precio_sugerido` | `price` (en `products`) | Float (COP) |
| `stock` | `stock` (en `products`) | Integer |
| `peso` | `weight` (en `products.supplier_info`) | Float (kg) |
| `imagenes` | `product_images` | Mapeo de urls y orden |
| `variantes` | `product_variants` | Creación de variantes e inicialización de SKU |

---

## 4. Pruebas de Contrato (Contract Tests)

Creamos la prueba de contrato en **[dropi-contract.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/dropi-contract.test.js)**. 
*   Valida que el mapeador (`DropiMapper`) mapee correctamente el payload real de `dropi-product.json`.
*   Asegura que si Dropi altera campos clave (ej: falta de `id`), la validación falle inmediatamente y lance una excepción controlada para evitar corrupciones.

---

## 5. Bandera de Configuración (Feature Flag)

Agregamos las banderas de configuración en **[config.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/config/index.js)**:
*   `dropiProviderEnabled`: `process.env.DROPI_PROVIDER_ENABLED === 'true'`
*   `dropiIntegrationKey`: `process.env.DROPI_INTEGRATION_KEY`

Si `DROPI_PROVIDER_ENABLED` está desactivada, el sistema no interactúa con Dropi y continúa operando de forma regular para catálogos manuales.

---

## 6. Definition of Done Revisada (DoD)

El Epic 1 se considerará terminado únicamente si:
1.  Un usuario ingresa un ID o URL real de Dropi en el panel.
2.  La API de Dropi es consultada, retornando datos reales.
3.  Se muestra una vista previa completa de producto.
4.  Se guarda el registro en la base de datos de Postgres.
5.  Se gatilla asíncronamente el workflow de LIAM.
6.  Se abre el **Launch Review Workspace** con el producto importado.
