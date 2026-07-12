# Implementation Plan: LIAM Runtime v1 (Cognitive Operating System)

Este plan redefine la arquitectura de IA de MIleGo transformándola en **LIAM Runtime v1**, un sistema operativo cognitivo robusto y desacoplado de proveedores de lenguaje específicos.

---

## 🛠️ Especificación de Arquitectura

```
                LIAM Runtime
                     │
        ┌────────────┼────────────┐
        │            │            │
    Planner      Memory      ToolRegistry
        │            │            │
        └────────────┼────────────┘
                     │
              Execution Engine
                     │
              Provider Router
                     │
      Gemini | Claude | GPT | DeepSeek
```

### 1. Enrutador del Proveedor Desacoplado (`ProviderRouter`)
*   Se refacciona la firma de `generate` en `GeminiProvider` para cumplir con la firma universal:
    `generate({ prompt, schema, tools, temperature, systemPrompt })`
*   Garantiza que ninguna herramienta dependa directamente de la API de Gemini.

### 2. Planner Determinista (Heurístico)
*   El `Planner` resolverá intenciones mediante código determinista y expresiones regulares rápidas para evitar latencia y consumo innecesario de tokens en intenciones simples (ej. actualizar copies, sincronizar stock).

### 3. Execution Engine & JSON Patching (RFC 6902)
*   El `ExecutionEngine` correrá las secuencias del plan paso a paso.
*   En lugar de sobreescribir el `launch_blueprint`, aplicará parches incrementales seguros usando el estándar **JSON Patch (RFC 6902)** o **JSON Merge Patch**.

### 4. Memoria por Especialidad & Event Memory
*   Se crea la tabla `liam_memory` segmentando en 3 dimensiones:
    *   `Knowledge`: Sabiduría comercial destilada.
    *   `Experience`: Historial de ROAS y métricas previas.
    *   `Preferences`: Ajustes de estilo del usuario (ej: "Sebastián prefiere landings minimalistas").
*   **Event Memory:** Tabla `liam_event_memory` para auditar la trazabilidad de razonamiento y decisiones de LIAM.

### 5. Evaluador de Calidad en Dos Niveles (Fast / Deep)
*   **Fast Evaluator:** Rápido chequeo sintáctico, presencia de CTAs y límites de caracteres.
*   **Deep Evaluator:** Ejecutado selectivamente mediante LLM cuando el Fast Evaluator no sea suficiente o el score baje de 85.

---

## Proposed Changes

### 1. Base de Datos & Migraciones
*   #### [NEW] [024_create_liam_agent_tables.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/database/migrations/024_create_liam_agent_tables.js)
    Crea las tablas `liam_memory` (con tipo segmentado) y `liam_event_memory`.

### 2. Capa del Agente & Herramientas
*   #### [NEW] [tool-registry.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/tools/tool-registry.js)
    Registro de herramientas desacoplado.
*   #### [NEW] [liam-runtime.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/liam-runtime.js)
    Orquestador que implementa el Planner heurístico, el Execution Engine y la memoria segmentada.

### 3. Proveedores & Rutas
*   #### [MODIFY] [gemini.provider.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/brain/providers/gemini.provider.js)
    Alinear con la firma universal desacoplada.
*   #### [MODIFY] [launch.routes.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/routes/launch.routes.js)
    Añadir el endpoint conversacional `/launches/:id/chat`.

---

## Verification Plan

### Automated Tests
*   `liam-runtime.test.js`: Suite para validar:
    1.  Planner heurístico resolviendo intenciones sin LLM.
    2.  Parchado JSON RFC 6902 selectivo.
    3.  Evaluador Fast & Deep.
    4.  Auditoría e historial de Event Memory.
