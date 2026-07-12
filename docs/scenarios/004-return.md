# Escenario 004: Devolución / Novedad Logística

## Objetivo
Validar que cuando una transportadora reporta una devolución o novedad de entrega sobre un pedido enviado, el sistema retorna la mercancía al stock disponible e inactiva/reembolsa el pago.

## Pasos para la Simulación / Prueba
1. El operador actualiza el estado del pedido a `returned` enviando una petición HTTP al endpoint administrativo de estados.
2. El sistema actualiza el estado de la orden a `returned` en PostgreSQL.
3. Se realiza la devolución del stock de bodega insertando registros de inventario de tipo `restock`.
4. El pago asociado se actualiza a `refunded` en la tabla `payments`.

## Resultado Esperado
*   **Código de Respuesta:** HTTP 200 OK.
*   **Base de Datos (PostgreSQL):**
    *   Pedido con estado `returned`.
    *   Pago asociado con estado `refunded`.
    *   Stock disponible de las variantes aumentado en la cantidad devuelta.
*   **Eventos:** Evento `order.status_changed` y `payment.status_changed` disparados.

## Resultado Obtenido
*   **Estado:** **VALIDADO (Green)**
*   **Evidencia:** Comportamiento transaccional implementado y verificado en `OrderService` e `InventoryService`.
