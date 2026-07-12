# MIleGo — Plataforma completa (Next.js + Prisma)

Esta es la versión de producción de todo lo que construimos en el chat: el Panel LIAM,
la Tienda, y las dos plantillas de landing (editorial estilo ALIVIA, y PagePilot estilo NUVA),
ahora con base de datos real y backend funcional en vez de datos en memoria.

## Qué incluye

- **Panel LIAM** (`/admin`) — evalúa candidatos con los 3 criterios de scoring, aprueba y elige
  la plantilla de landing, ve el registro de `LaunchDecision`.
- **Tienda** (`/tienda`) — catálogo de productos activos.
- **Landing por producto** (`/producto/[id]`) — usa automáticamente la plantilla asignada:
  - `editorial` → patrón ALIVIA (hero narrativo + bundles)
  - `pagepilot` → patrón NUVA (galería + buy box + selector de cantidad)
- **Carrito** (`/carrito`) y **Órdenes** (`/ordenes`) — checkout real contra la base de datos,
  con simulación del ciclo de Dropi (comisión 5%, payout al confirmar entrega).

## Instalación local

```bash
npm install
cp .env.example .env      # completa DATABASE_URL como mínimo
npx prisma migrate dev --name init
npm run seed              # carga ALIVIA y NUVA de ejemplo
npm run dev
```

Abre `http://localhost:3000`.

## Conectar Dropi de verdad

1. Consigue tu API key en tu panel de Dropi (Integraciones > API).
2. Complétala en `.env` como `DROPI_API_KEY` y `DROPI_STORE_ID`.
3. En `lib/dropi.ts`, descomenta el `fetch` real dentro de `createDropiOrder()`.
4. Crea `app/api/dropi/webhook/route.ts` usando `parseDropiWebhookPayload()` como base,
   para que Dropi actualice el estado de la orden automáticamente (en vez de cambiarlo
   manualmente desde `/ordenes`).

## Conectar pagos (Wompi)

Agrega tus llaves `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` en `.env` e integra el widget de
checkout de Wompi en `app/carrito/page.tsx` antes de llamar a `POST /api/orders`.

## Desplegar en producción

1. Sube este proyecto a un repositorio de GitHub.
2. Crea una base de datos Postgres gratuita en [Supabase](https://supabase.com) o
   [Neon](https://neon.tech) y copia su `DATABASE_URL`.
3. Importa el repo en [Vercel](https://vercel.com), agrega las variables de entorno de `.env`,
   y despliega.
4. Corre `npx prisma migrate deploy` contra la base de datos de producción (Vercel te da esta
   opción en el build command, o hazlo una vez desde tu máquina apuntando al `DATABASE_URL` real).

## Siguiente paso recomendado

Conecta primero Dropi (Parte 2 del PDF de estrategia) para que el estado de las órdenes deje de
actualizarse a mano. El WhatsApp bot (Baileys) y la automatización de campañas (LIAM media buyer)
son la capa siguiente, una vez que el flujo de venta -> fulfillment ya esté validado con datos
reales.
