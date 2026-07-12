# Lista de Tareas (Task Checklist) - Epic 2: Launch Review Workspace

- [x] **Fase 1: Base de Datos & Historial de Auditoría (P0)**
  - [x] Crear migración `022_create_launch_versions` para la tabla de versiones
  - [x] Ejecutar Knex migrations en Postgres local

- [x] **Fase 2: Endpoints del Backend & Reglas Financieras**
  - [x] Desarrollar `launch.controller.js` con endpoints de lectura, parche, regeneración, aprobación y rechazo
  - [x] Impedir que se guarden ofertas con precios inferiores al costo
  - [x] Desarrollar `launch.routes.js` con todos los endpoints bajo protección de RBAC y tenant isolation
  - [x] Registrar la ruta `launchRoutes` en el enrutador de API global

- [x] **Fase 3: Workspace de Revisión Frontend (Centro de Control)**
  - [x] Desarrollar la página `review.js` con visualización completa del Launch Blueprint
  - [x] Implementar panel de Triple DNA (Product, Market, Customer)
  - [x] Implementar Offer Builder con recálculo dinámico de margen, ROAS y CPA
  - [x] Implementar Copy & SEO Studio con regeneración e inputs editables
  - [x] Desarrollar vista previa responsive (Móvil / Desktop) simulada
  - [x] Vincular la tabla de `Products Intelligence` incorporando el botón `🔍 Revisar`

- [x] **Fase 4: Pruebas y Validación (DoD)**
  - [x] Crear suite de pruebas de integración en `launch-review.test.js`
  - [x] Confirmar que el 100% de la suite de Vitest pase en verde (`npm test`)
