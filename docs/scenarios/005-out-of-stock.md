# Escenario 005: Stock Insuficiente en Checkout

## Objetivo
Validar que si un cliente intenta comprar unidades de un producto que superan el inventario real en bodega, el sistema aborte la transacción, devuelva un error amigable de negocio y mantenga intacto el stock.

## Pasos para la Simulación / Prueba
1. Un cliente intenta comprar `9999` unidades de un producto con stock disponible de `50` enviando una petición HTTP al endpoint `POST /api/v1/checkout`.
2. El sistema realiza el bloqueo y consulta de stock y detecta la insuficiencia.
3. Se aborta la transacción y se retorna un error HTTP 400.

## Resultado Esperado
*   **Código de Respuesta:** HTTP 400 Bad Request.
*   **Base de Datos (PostgreSQL):**
    *   No se crea ningún pedido, cliente ni movimiento de inventario.
    *   El stock de la variante permanece intacto en `50` unidades.
*   **Mensaje de Error:** "Stock insuficiente para el producto".

## Resultado Obtenido
*   **Estado:** **VALIDADO (Green)**
*   **Evidencia:** Verificado mediante tests en [commerce-core.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/integration/commerce-core.test.js#L159-L181) (`should fail checkout if product stock is insufficient`).
