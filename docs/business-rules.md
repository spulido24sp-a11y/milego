# Reglas de Negocio (Business Rules) — MIleGo Platform

Este documento reúne las reglas y restricciones del dominio comercial y operativo del ecosistema **MIleGo**. Todo cambio en los servicios o base de datos debe validar y respetar estrictamente esta lógica de negocio.

---

## 📦 Inventario y Stock

1. **El stock nunca puede ser negativo:** El inventario físico disponible en bodega representa el límite real. Ninguna venta ni ajuste manual puede forzar que el stock de una variante quede en cantidades inferiores a `0`.
2. **Retorno automático de existencias:**
    *   Un pedido **cancelado** debe revertir y reingresar al inventario variante por variante las unidades retenidas.
    *   Un pedido **devuelto** (con novedad o devolución posventa) debe ingresar nuevamente las unidades al inventario físico una vez retorne a bodega.
3. **Bloqueo preventivo de existencias:** Durante el checkout, la consulta de existencias y posterior débito de stock sobre la fila de la base de datos debe realizarse mediante bloqueos exclusivos (`FOR UPDATE`) para evitar condiciones de carrera (ventas simultáneas sin inventario real).

---

## 🏷️ Precios y Combos de Venta

1. **Congelamiento de precios en compra:** Una vez que el cliente hace clic en "Confirmar Pedido contra Entrega", el precio unitario del producto, el costo de envío y el descuento del combo seleccionado en ese instante exacto se congelan y guardan en la orden de forma inmutable. 
2. Si el precio del producto o de la variante cambia en el catálogo general posteriormente, el pedido existente debe mantener intactos los valores pactados en el checkout original.

---

## 🔒 Clientes y Control de Abuso

1. **Duración de Magic Links:** Los tokens generados para autenticar clientes mediante Magic Link expiran de manera absoluta a los **15 minutos** de haber sido creados.
2. **Prevenir Pedidos Duplicados (Idempotencia):** Un cliente no puede registrar dos pedidos idénticos (mismo cliente, dirección y variantes seleccionadas) en un intervalo inferior a **30 segundos**. Esto previene el envío de pedidos por error debido a doble clic o recargas accidentales en móviles.
3. **No duplicación de perfiles:** Si un cliente ingresa su correo electrónico durante un checkout de invitado, el sistema debe asociar el pedido al registro del cliente existente si ya existe en la base de datos (confrontando por email), en lugar de crear un cliente nuevo duplicado.

---

## 🔄 Transición de Estados de Pago y Envío

1. **Inmutabilidad del estado de entrega:** Un pedido marcado como **Entregado (Delivered)** ha finalizado su ciclo comercial. No se permite revertir un pedido entregado a estados anteriores como `pending` o `processing`.
2. **Conciliación automática de cobro contra entrega (COD):** En transacciones COD, el registro de pago (`payments`) se genera inicialmente como `pending`. Al marcar el estado del pedido como `delivered`, el estado del pago debe actualizarse automáticamente a `completed`.
