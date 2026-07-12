# MIleGo Platform Development Rules & Roadmap Directive

Este documento define las reglas de desarrollo, gobernanza de arquitectura y roadmap estricto para el proyecto **MIleGo**. Todo agente de desarrollo debe cumplir rigurosamente con estas directrices.

---

## 🚫 Directiva de Roadmap y Control de Alcance (Scope Locking)

1. **Roadmap Congelado:** Ninguna fase de desarrollo puede incorporar funcionalidades pertenecientes a fases futuras.
2. **Propuestas Fuera de Alcance:** Cualquier propuesta, idea o requerimiento que no pertenezca a la fase activa debe documentarse únicamente como propuesta futura en un archivo de documentación en la carpeta `docs/superpowers/plans/` (ej. como "Future Work" o "RFC") y no debe verse reflejada en código de producción, migraciones, base de datos, APIs, frontend, panel administrativo ni tests de la fase actual.
3. **Fases Oficiales del Ecosistema:**

### **V7.2 — Commerce Core (Fase Activa)**
*   Customers (CRUD y Perfiles)
*   Customer Addresses (Múltiples direcciones de envío)
*   Customer Notes (Auditoría de staff sobre clientes)
*   Magic Link (Login sin contraseña)
*   Orders & Order Items
*   Order Status History (Historial inmutable de estados de envío)
*   Payments (Modelo abstracto transaccional)
*   Inventory Movements (Logs de stock y ajustes)
*   Checkout (Procesamiento transaccional de carrito)
*   Eventos y Jobs (EventBus de integración asíncrona)
*   Vitest Integration Tests

### **V7.3 — Integrations (Fase Futura)**
*   WhatsApp (Chatbots, notificaciones automatizadas)
*   Dropi / Triidy (Conexiones API con proveedores)
*   Meta Conversions API & Pixel
*   Google Analytics 4 (GA4)
*   TikTok Pixel
*   Transportadoras locales (Servientrega, Envía, Interrapidísimo)
*   Webhooks salientes de tiendas

### **V7.4 — AI Commerce (Fase Futura)**
*   Gemini / OpenAI (Modelos de lenguaje LLM)
*   AI Product Launcher (Onboarding automático de productos por ID de Dropi)
*   AI Landing Builder (Renderizado dinámico de páginas de venta en Express)
*   AI Copywriting & AI Pricing
*   Automatizaciones por IA

---

## 💾 Gobernanza del Esquema de Base de Datos

1. **Esquema Congelado Fuera de Alcance:** No se permite modificar el esquema de base de datos para acomodar campos de fases futuras.
2. Si surge una necesidad de persistir datos de una fase posterior (ej. copies sintéticos, logs de analíticas, identificadores de chatbot), **está estrictamente prohibido** agregar columnas o tablas al esquema.
3. Cualquier cambio estructural debe justificar su pertenencia exclusiva al sprint aprobado y limitarse a los campos de dominio indispensables para el Core transaccional.

---

## 🏛️ Architecture Decision Records (ADRs)

Toda decisión arquitectónica permanente debe registrarse formalmente como un ADR en el directorio `docs/adr/` utilizando el formato:
`docs/adr/NNNN-nombre-del-registro.md`

### ADRs Activos e Históricos:
*   `0001-api-first.md`: Arquitectura desacoplada basada en servicios REST JSON.
*   `0002-multi-tenant.md`: Aislamiento a nivel lógico mediante columna `store_id` (Tenant Shared Database model).
*   `0003-event-bus.md`: Integración de servicios asíncronos y desacoplados basados en eventos in-app.
*   `0004-jobs.md`: Procesamiento asíncrono para transacciones lentas (envío de correos, integraciones externas).
*   `0005-storage-provider.md`: Abstracción de carga y persistencia de archivos estáticos (Local filesystem fallback a S3).
*   `0006-magic-link-customers.md`: Autenticación segura *passwordless* para clientes utilizando tokens de un solo uso firmados criptográficamente.

---

## 🏷️ Política de Versiones y Parches (Release Management)

1.  **Versiones del Parche / Sprint Activo (v7.2.x):**
    *   Exclusivamente restringidas a:
        *   Correcciones de errores (*bugfixes*) detectados en tests o QA.
        *   Ajustes de seguridad y optimizaciones de rendimiento del Core.
        *   Nuevos casos de prueba automatizados.
        *   Mejoras de documentación y ADRs.
    *   **Prohibición Absoluta:** No se permite introducir nuevas funciones comerciales en parches `v7.2.x`.
2.  **Versión Menor de Integraciones (v7.3.0):**
    *   Apertura para nuevas integraciones externas, analíticas y transportadoras aprobadas en el roadmap.
3.  **Versión Menor de Automatización e IA (v7.4.0):**
    *   Apertura para el ecosistema de inteligencia artificial y automatización de marketing.

---

## 📝 Request for Comments (RFC) Workflow

Todo cambio de diseño grande o nueva funcionalidad que requiera alterar de forma transversal la plataforma o el modelo de datos debe proponerse y aprobarse antes de escribir código.

### Estructura de Archivos:
`docs/rfc/NNNN-nombre-de-la-propuesta.md`

### Plantilla de Contenido:
*   **Problema:** ¿Qué dolor del negocio o limitación técnica estamos resolviendo?
*   **Objetivo:** ¿Cómo se ve el éxito de esta implementación?
*   **Opciones Evaluadas:** Comparativa de alternativas técnicas.
*   **Pros & Contras:** Ventajas y riesgos asociados de la opción recomendada.
*   **Impacto:** Base de datos, rendimiento, isolation de tenant, seguridad y dependencias.
*   **Decisión:** Aprobación explícita del Product Owner.

---

## ✅ Definition of Done (DoD)

Antes de dar por completada y cerrar cualquier tarea o sprint, se debe verificar rigurosamente la siguiente checklist:

*   [ ] **Tests pasan:** Todos los tests de regresión y nuevos tests de integración pasan en verde (`npm test`).
*   [ ] **OpenAPI actualizado:** La documentación de endpoints y schemas en `docs/openapi.yml` refleja el estado real de la API.
*   [ ] **Auditoría implementada:** Logs de eventos clave y auditoría de staff en base de datos.
*   [ ] **Eventos emitidos:** Disparo de eventos correctos a través de `EventBus`.
*   [ ] **Jobs registrados:** Las tareas asíncronas lentas están encoladas y registradas.
*   [ ] **Tenant Isolation verificado:** Queries encapsuladas usando `store_id` (comprobadas en tests de aislamiento).
*   [ ] **Soft Delete:** Asegurada la cláusula `deleted_at: null` en lecturas de entidades lógicas.
*   [ ] **ADR actualizado:** Si el cambio introduce un nuevo pilar de diseño, existe su Architecture Decision Record.
*   [ ] **Documentación actualizada:** Walkthrough y diagramas de arquitectura reflejan el cambio.

---

## 📦 Release Checklist

Checklist de ejecución manual u obligatoria antes de desplegar versiones estables del ecosistema (v7.x.x):

*   [ ] **npm test:** Toda la suite de pruebas locales pasa con éxito.
*   [ ] **Linting & Code Styles:** Análisis estático sin advertencias ni errores.
*   [ ] **Production Build:** Generación correcta del build optimizado de la base de código.
*   [ ] **Migrate Up:** Migraciones de base de datos probadas y aplicadas.
*   [ ] **Rollback Test:** Validación de que `knex migrate:rollback` revierte el último lote sin pérdida de consistencia.
*   [ ] **Database Backup:** Respaldo completo de la base de datos de producción/staging.
*   [ ] **Changelog:** Actualización inmutable del log de cambios en `CHANGELOG.md`.
*   [ ] **Git Tag:** Etiquetado de versión estable en el repositorio.
*   [ ] **Release Notes:** Resumen de valor de negocio y correcciones técnicas de la entrega.
*   [ ] **Deploy Staging:** Despliegue en ambiente sandbox/staging de pruebas.
*   [ ] **Smoke Tests:** Pruebas rápidas de humo para endpoints críticos en Staging (Healthcheck, Auth, Checkout).
*   [ ] **Despliegue a Producción:** Aplicar cambios de forma controlada en entorno productivo.

---

## 🧊 Congelamiento de Documentación (Doc Freeze)

A partir del inicio del desarrollo de **V7.2**, queda estrictamente prohibido generar nuevas especificaciones generales, planes de arquitectura extensos o diagramas conceptuales redundantes, a menos que exista un cambio de arquitectura mayor aprobado mediante el flujo de RFC.

Toda documentación nueva debe limitarse exclusivamente a:
1.  **Architecture Decision Records (ADRs):** Justificaciones técnicas de arquitectura permanentes.
2.  **Request for Comments (RFCs):** Propuestas de diseño antes de codificar.
3.  **API Specs:** OpenAPI schemas o contratos de red en `docs/openapi.yml`.
4.  **Manual Operativo:** Instrucciones de uso para el staff y operadores.
5.  **Changelog / Release Notes:** Logs de cambios entregados por versión.
6.  **Reglas de Negocio:** Actualizaciones al archivo `docs/business-rules.md`.
