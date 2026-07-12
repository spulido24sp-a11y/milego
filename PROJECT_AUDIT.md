# Project Audit: MIleGo V7.2 — Architecture 1.0 Freeze

Este documento constituye la auditoría técnica integral y el reporte de deuda técnica de la plataforma **MIleGo**, evaluando la arquitectura del sistema nervioso y los motores de inteligencia artificial de **LIAM** antes de avanzar a la Fase 2.

---

## 1. Auditoría de Arquitectura (SOLID, Clean, DDD)

### A. Estructura y Capas (Separación de Responsabilidades)
*   **Commerce Core (Backend):** Estructura en 3 capas estándar (Controladores -> Servicios -> Repositorios). Es sólida, pero existe una fuga de abstracción en algunos servicios que ejecutan consultas Knex directas en lugar de usar sus respectivos repositorios.
*   **AI Brain & World Intelligence:** Los 9 motores de World Intelligence están bien encapsulados bajo `brain/world-intelligence/`, delegando la orquestación a `DecisionEngine`.
*   **SOLID & Clean Architecture Violations:**
    *   **Single Responsibility Principle (SRP):** `ProductService` ahora coordina la base de datos y la llamada asíncrona a `LaunchEngine` para generar el blueprint. Esto mezcla la lógica de persistencia del CRUD con el pipeline de IA de LIAM. Debe desacoplarse mediante un suscriptor de eventos (`product.created` -> encolar análisis de LIAM en segundo plano).
    *   **Open/Closed Principle (OCP):** El `ProviderRouter` está forzado a importar manualmente cada clase de proveedor. Debería usar registro dinámico para permitir añadir proveedores (ej. Grok, DeepSeek) sin tocar el archivo del enrutador.

---

## 2. Auditoría de Base de Datos y Persistencia

### A. Concurrencia y Bloqueos (Row-Level Locking)
*   La inyección de bloqueos exclusivos de fila (`SELECT ... FOR UPDATE` vía `.forUpdate()`) en transacciones de Knex de checkout e inventario previene de forma exitosa las sobreventas concurrentes en base de datos.

### B. Rendimiento del JSONB (`launch_blueprint`)
*   Persistir el Launch Blueprint en un campo JSONB es la decisión correcta para la flexibilidad de esquemas no estructurados (hooks, FAQs, audiencias).
*   **Riesgo de Rendimiento:** A medida que crezcan las consultas en Mission Control para filtrar productos por palabras clave del blueprint, la base de datos se ralentizará.
*   **Mitigación P1:** Añadir índices GIN sobre la columna `products.launch_blueprint` antes de la Fase 2.

---

## 3. Reporte de Deuda Técnica (Technical Debt Assessment)

### P0 (Crítico - Resolver Inmediatamente)
*   **Procesamiento Síncrono del Launch Engine en Creación:** Al insertar un producto en `ProductService.create`, se detiene el hilo de ejecución para llamar a la IA (Mock). Si la API externa real tarda 8 segundos, el request del usuario se congelará.
    *   *Solución:* El análisis del Launch Blueprint debe ejecutarse en segundo plano delegándolo al **Job Queue** mediante el bus de eventos (`product.created`).

### P1 (Alto Impacto)
*   **Índices GIN Faltantes:** Consultas rápidas sobre `launch_blueprint` y metadatos de los nodos del Knowledge Graph carecen de indexación especializada en JSONB.
*   **Falta de Registro Dinámico de Proveedores de IA:** El acoplamiento en `ProviderRouter` con importaciones estáticas de modelos de IA.

### P2 (Medio Impacto)
*   **Duplicaciones de Normalización de Monedas:** Variaciones logísticas en Dropi y manuales calculan márgenes y conversión monetaria en múltiples clases adaptadoras por separado.

---

## 4. Propuesta de Refactorización (Refactor Proposal)

| Módulo a Refactorizar | Impacto | Riesgo | Beneficio Principal |
| :--- | :---: | :---: | :--- |
| **ProductService.create (Desacoplar IA)** | **P0** | **Bajo** | Hace que la API de creación sea instantánea (< 100ms) y delega el análisis pesado a la cola de jobs. |
| **GIN Indexes en JSONB** | **P1** | **Bajo** | Previene caídas por CPU en Postgres ante millones de lecturas sobre blueprints. |
| **Dynamic Provider Registry** | **P2** | **Bajo** | Cumple con SOLID (OCP) permitiendo inyectar nuevos LLMs sin alterar el enrutador. |

---

## 5. El Nuevo Roadmap Redefinido (Fases 1 a 5)

```text
FASE 1: Foundation (✅ Completada)
├── S1: OS Foundation & UI Layout
├── S2: LIAM Launch Engine
├── S3: LIAM Brain Layering
├── S4: AI Commerce Intelligence
└── S5: LIAM World Intelligence Engine

FASE 2: Commerce Intelligence (Sprints 6-8)
├── S6: Customer & Behavioral Intelligence (Avatares, dolores, LTV dinámico)
├── S7: Local Market & Competitor Scraping (Ojos reales del World Scanner)
└── S8: Content & Creative Automation Studio (Generación automatizada de copias y creativos)

FASE 3: Autonomous Growth (Sprints 9-11)
├── S9: Campaign Manager & Automated Media Buying (Conexión de Ads API)
├── S10: Experiment Engine & Real-time Landing A/B Testing
└── S11: Budget & CPA Growth Optimizer

FASE 4: Autonomous Company (Sprints 12-13)
├── S12: Multi-Tenant Enterprise & Cross-border Operations (Monedas locales)
└── S13: Collaborative Multi-Agent Mesh (LIAMs especializados conversando)

FASE 5: LIAM Enterprise (Sprints 14-15)
├── S14: Auto-Learning Feedback loop with real Google Analytics
└── S15: Agent Marketplace & Integration Store
```

---

## 6. Recomendación del Chief Architect (CTO Directive)

Como CTO de una startup diseñada para recibir millones de eventos diarios y operar de forma autónoma:

1.  **El Grafo Comercial es el activo prioritario:** Las tablas `knowledge_graph_nodes` y `knowledge_graph_edges` deben optimizarse con índices combinados `(source_node_id, target_node_id, relationship)`.
2.  **Transiciones Event-Driven Obligatorias:** Ninguna ruta de la API debe esperar respuestas de APIs externas de LLMs de forma síncrona. Todo debe ocurrir asíncronamente en el Job Queue, notificando al frontend por WebSockets o Server-Sent Events (SSE).
3.  **Monitoreo del Coste de IA:** Utilizar el `ai_requests_log` para definir alertas de gasto límite en tiempo real por Tenant.
