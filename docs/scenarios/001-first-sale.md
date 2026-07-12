# Escenario 001: Primera Venta (P0)

## Objetivo
Validar que un cliente nuevo pueda realizar una compra mediante el formulario de Pago Contra Entrega (COD), creando de forma atómica y transaccional todos los registros asociados en el sistema (cliente, dirección, orden, ítems de orden, logs de pago e inventario).

## Pasos para la Simulación / Prueba
1. Un cliente nuevo accede al endpoint público de checkout `POST /api/v1/checkout` con los detalles de la compra (datos de contacto, dirección de entrega en Colombia y la variante del producto seleccionada).
2. El sistema intercepta el checkout, ejecuta el bloqueo de stock (`FOR UPDATE`) sobre la variante y verifica existencias disponibles.
3. Se crea el registro del cliente (`customers`) y su dirección (`customer_addresses`).
4. Se registra el pedido (`orders`) en estado `pending` y los artículos (`order_items`).
5. Se descuenta el stock de bodega insertando un registro en la bitácora logística (`inventory_movements`) de tipo `sale`.
6. Se crea un registro de cobro (`payments`) en estado `pending`.
7. El sistema publica el evento `order.created` al bus de integración asíncrono.

## Resultado Esperado
*   **Código de Respuesta:** HTTP 201 Created.
*   **Base de Datos (PostgreSQL):**
    *   Cliente y dirección registrados con ID único.
    *   Pedido con estado `pending` referenciando al cliente creado.
    *   Inventario de la variante decrementado en las unidades compradas.
    *   Pago creado en estado `pending` con método `cash_on_delivery`.
*   **Eventos:** Evento `order.created` disparado al EventBus para procesamiento de Jobs.

## Resultado Obtenido
*   **Estado:** **VALIDADO (Green)**
*   **Evidencia:** Verificado mediante tests automatizados en [commerce-core.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/integration/commerce-core.test.js#L112-L157) (`should process a guest checkout and record order, client and payment log`).
