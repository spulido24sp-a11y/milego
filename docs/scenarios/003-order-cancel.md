# Escenario 003: Cancelación de Pedido (Retorno de Stock)

## Objetivo
Validar que cuando el operador cancela un pedido que estaba en proceso, el sistema actualiza inmutablemente el historial de estado de la orden y retorna inmediatamente todas las unidades físicas reservadas al inventario de variantes.

## Pasos para la Simulación / Prueba
1. Un operador (staff) llama al endpoint administrativo `PUT /api/v1/orders/:id/status` enviando `{ "status": "cancelled", "notes": "Cliente desiste de la compra" }` y sus credenciales JWT de staff.
2. El sistema actualiza el estado del pedido a `cancelled`.
3. Se inserta un registro en la tabla `order_status_history` con las notas del operador.
4. Se ejecuta el reingreso de stock insertando un movimiento de inventario `in` (tipo `restock`) por cada ítem.
5. Se actualiza el stock físico disponible en las variantes del producto.

## Resultado Esperado
*   **Código de Respuesta:** HTTP 200 OK.
*   **Base de Datos (PostgreSQL):**
    *   Pedido con estado `cancelled`.
    *   Historial de estados con registro de la cancelación.
    *   Stock disponible de las variantes aumentado en la cantidad de ítems del pedido.
*   **Eventos:** Evento `order.status_changed` (nuevo estado: `cancelled`) disparado al EventBus.

## Resultado Obtenido
*   **Estado:** **VALIDADO (Green)**
*   **Evidencia:** Verificado mediante tests en [order.controller.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/controllers/order.controller.js) y validaciones transaccionales en el servicio `OrderService.updateStatus`.
