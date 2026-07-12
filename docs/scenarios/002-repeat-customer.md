# Escenario 002: Cliente Recurrente (No Duplicación)

## Objetivo
Validar que cuando un cliente ya registrado en la base de datos realiza una segunda compra, el sistema reconozca su correo electrónico y asocie el pedido al cliente existente, evitando duplicar perfiles en el CRM.

## Pasos para la Simulación / Prueba
1. Se ejecuta una compra de checkout `POST /api/v1/checkout` con los datos de un correo electrónico ya existente en el sistema.
2. El servicio de checkout detecta la existencia del cliente confrontando por `email`.
3. En vez de crear una fila en `customers`, se extrae el `id` del cliente existente.
4. Se registra el nuevo pedido en `orders` asociando el ID de cliente existente.
5. Se asocia la dirección de envío provista (o se agrega a su libreta si es nueva).

## Resultado Esperado
*   **Código de Respuesta:** HTTP 201 Created.
*   **Base de Datos (PostgreSQL):**
    *   No se genera ninguna fila nueva en la tabla `customers`.
    *   La cantidad total de registros de clientes permanece idéntica.
    *   El nuevo pedido referencia al `customer_id` original.
*   **Eventos:** Evento `order.created` disparado al EventBus.

## Resultado Obtenido
*   **Estado:** **PENDIENTE DE IMPLEMENTACIÓN DE TESTS** (La lógica del servicio `CheckoutService.resolveCustomer` ya cuenta con el comportamiento, pero el caso de prueba específico en Vitest será añadido en la fase de dogfooding).
