# LIAM Architecture Freeze — Specification Document

> **Estado:** Draft
> **Versión:** 1.0
> **Fecha:** 2026-07-10
> **Clasificación:** Architecture Freeze — No modificar sin aprobación del equipo de arquitectura.

---

# Capítulo 1: Filosofía de LIAM

## 1.1 ¿Qué es LIAM?

LIAM no es un chatbot. No es un wrapper de Gemini. No es un generador de textos.

LIAM es un **AI Commerce Operating System** cuyo objetivo es **maximizar la probabilidad de éxito comercial** minimizando el costo de inferencia y automatizando decisiones repetitivas.

LIAM toma decisiones comerciales fundamentadas, propone acciones, ejecuta cambios sobre el Blueprint y explica cada decisión en lenguaje humano.

## 1.2 ¿Qué NO es LIAM?

| No es | Porque |
|-------|--------|
| Un chatbot conversacional | No está diseñado para mantener conversaciones abiertas. Su interfaz es goal-oriented. |
| Un wrapper de APIs | El Provider Router es una capa de transporte, no el núcleo del sistema. |
| Un generador de texto | La generación de lenguaje es un efecto secundario, no su propósito. |
| Un reemplazo del juicio humano | Es un asistente de decisión. El humano siempre tiene la última palabra. |
| Un sistema batch | Opera en tiempo real como parte del flujo de trabajo del usuario. |

## 1.3 Principios Inmutables

Estos principios no pueden ser violados por ningún desarrollador, sprint o feature. Son la constitución del sistema.

1. **El LLM nunca toma decisiones comerciales.** El LLM solo genera lenguaje. Las decisiones deben ser tomadas antes de llamar al LLM, por motores deterministas.

2. **Toda lógica determinista vive en código.** No pueden existir reglas de negocio dentro de prompts, system prompts, ni cadenas de texto. Si una decisión puede ser codificada, debe ser codificada.

3. **Toda decisión debe ser explicable.** El sistema debe poder generar una explicación legible para cualquier decisión comercial que tome, sin depender del LLM para dicha explicación.

4. **Cada acción debe ser trazable mediante eventos.** Toda ejecución de tool, patch al blueprint, decisión del Decision Engine, y llamada al LLM debe generar un evento persistente.

5. **El Runtime debe funcionar con cualquier proveedor de IA.** No puede existir una dependencia directa de Gemini, OpenAI, Claude ni ningún proveedor específico. El Provider Router es el único punto de contacto.

6. **El Blueprint es la única fuente de verdad del lanzamiento.** No pueden existir estados duplicados en memoria, cache, o stores paralelas. Si no está en el Blueprint, no existe.

7. **Todo cambio al Blueprint debe ser incremental (JSON Patch), nunca una sobreescritura completa.** Esto garantiza trazabilidad, undo, y merge sin conflictos.

8. **Cada componente debe tener una única responsabilidad.** No puede existir un componente que razone, ejecute tools y genere texto. Si un componente hace más de una cosa, debe dividirse.

9. **El sistema debe poder operar parcialmente incluso sin acceso a un LLM.** El pipeline determinista (Reasoning → Scoring → Decision → Execution) debe funcionar con LLM opcional. Sin API key, LIAM sigue siendo útil.

10. **Ningún componente puede depender directamente de un proveedor específico.** La abstracción `generate({ prompt, schema, tools, temperature, systemPrompt })` es el único contrato entre el negocio y los proveedores de IA.

## 1.4 Objetivos del Sistema

| Objetivo | Métrica | Prioridad |
|----------|---------|-----------|
| Maximizar Confidence Score de lanzamientos | Confidence Score promedio > 80 | P0 |
| Minimizar uso de LLM | % de requests que requieren LLM < 20% | P0 |
| Velocidad de respuesta del Advisor | < 500ms sin LLM, < 5s con LLM | P1 |
| Trazabilidad de decisiones | 100% de decisiones con eventos asociados | P1 |
| Zero regresiones en tests | 100% tests verdes en cada commit | P0 |

## 1.5 Estilo Arquitectónico

- **Clean Architecture** con capas bien definidas: Routes → Controllers → Services → Engines → Providers
- **Event Driven** con Event Bus persistente para toda comunicación asíncrona
- **Domain Driven Design ligero** con bounded contexts: Commerce, Intelligence, Runtime, Integrations
- **Provider Pattern** para todas las dependencias externas (IA, dropshipping, storage)
- **JSON Patch (RFC 6902)** como único mecanismo de mutación del Blueprint

---

# Capítulo 2: Arquitectura del Runtime

## 2.1 Pipeline Oficial

El siguiente diagrama representa el pipeline de ejecución completo de LIAM. Este pipeline está congelado y no debe modificarse en su estructura fundamental. Solo se permite agregar nuevos motores dentro del pipeline, no reordenar ni eliminar etapas.

```
Goal
  │
  ▼
Planner ───────────────────► Interpreta objetivo, divide en tasks
  │
  ▼
Blackboard ─────────────────► Lee estado actual del mundo
  │
  ▼
Reasoning Engine ──────────► Calcula hechos y findings deterministas
  │
  ▼
Scoring Engine ────────────► Calcula Confidence Score y dimensiones
  │
  ▼
Decision Engine ───────────► Decide: ¿qué hacer? ¿necesito LLM?
  │                      │
  │                   ┌──┘
  │                   ▼
  │              Provider Router ──► Solo si Decision Engine determina LLM necesario
  │                   │
  │                   ▼
  │              LLM Response ─────► Texto generado + validación
  │                   │
  └───────────────────┘
  │
  ▼
Tool Planner ──────────────► Selecciona herramientas según plan
  │
  ▼
Execution Engine ──────────► Ejecuta tools, registra eventos
  │
  ▼
Blueprint Patch ───────────► Aplica JSON Patch incremental
  │
  ▼
Quality Evaluator ─────────► Evalúa calidad del resultado
  │
  ▼
Memory ────────────────────► Persiste en memorias según tipo
  │
  ▼
Event Bus ─────────────────► Emite eventos de todo el ciclo
  │
  ▼
Review Workspace ──────────► Renderiza resultado al usuario
```

## 2.2 Flujo de Decisión del Decision Engine

El Decision Engine es el corazón del pipeline. Decide si el pipeline necesita LLM o puede completarse solo con lógica determinista.

```
Decision Engine recibe:
  - Goal actual
  - Blackboard (estado del mundo)
  - Product + Blueprint
  - ReasoningResult (facts + findings)
  - ScoringResult (confidence + scores)

Decisión:
  ┌─ ¿El Goal requiere generación de lenguaje? ─┐
  │                                              │
  │  No ─────────────────────────────────────────┤
  │  → Plan = tools deterministas                │
  │  → NeedLLM = false                           │
  │  → Costo = 0 tokens                          │
  │                                              │
  │  Sí → ¿Existe en AI Cache? ─────────────────┤
  │       │                                      │
  │       Sí → Usar cache                        │
  │       │   → NeedLLM = false (cached)         │
  │       │                                      │
  │       No → ProviderRouter.generate()         │
  │           → NeedLLM = true                   │
  │           → Costo = tokens consumidos        │
  └──────────────────────────────────────────────┘

  Retorna:
  - Plan (lista de acciones + tools)
  - NeedLLM (boolean)
  - EstimatedTokens (number)
  - Reasoning (por qué tomó esta decisión)
```

## 2.3 Componentes del Sistema

| Componente | Responsabilidad Única | ¿Genera eventos? |
|------------|----------------------|-------------------|
| **Planner** | Interpreta objetivos, divide en tasks | `GOAL_CREATED`, `PLAN_GENERATED` |
| **Blackboard** | Estado global compartido (lectura/escritura) | `BLACKBOARD_UPDATED` |
| **Reasoning Engine** | Calcula hechos y findings deterministas | `REASONING_COMPLETE` |
| **Scoring Engine** | Calcula Confidence Score y dimensiones | `SCORING_COMPLETE` |
| **Decision Engine** | Decide acciones, selecciona tools | `DECISION_COMPLETED` |
| **Tool Planner** | Ordena y valida herramientas del plan | `TOOL_SELECTED` |
| **Execution Engine** | Ejecuta tools, maneja errores/retry | `TOOL_STARTED`, `TOOL_COMPLETED`, `TOOL_FAILED` |
| **Provider Router** | Selecciona proveedor IA, maneja fallback | `LLM_REQUEST`, `LLM_RESPONSE` |
| **Quality Evaluator** | Valida calidad del output | `QUALITY_PASSED`, `QUALITY_FAILED` |
| **AI Cache** | Cachea respuestas del LLM por SHA-256 | `CACHE_HIT`, `CACHE_MISS` |
| **Memory Manager** | Persiste en memorias según tipo | `MEMORY_UPDATED` |
| **Event Bus** | Canal de eventos asíncronos | (es el canal mismo) |

## 2.4 Dependencias Entre Componentes

```
Planner → Blackboard
Blackboard → Reasoning Engine
Reasoning Engine → Scoring Engine
Scoring Engine → Decision Engine
Decision Engine → ProviderRouter (condicional)
Decision Engine → Tool Planner
Tool Planner → Execution Engine
Execution Engine → Blueprint Patch
Blueprint Patch → Quality Evaluator → Memory → Event Bus
```

Ningún componente puede saltarse esta cadena. No está permitido que un componente llame a otro que no sea su inmediato superior o inferior en el pipeline.

## 2.5 Modos de Operación

### Modo Full (LLM disponible)
Pipeline completo incluyendo Provider Router → LLM → Quality Evaluator.

### Modo Determinista (sin LLM)
El pipeline se detiene en Decision Engine → Tool Planner. Las herramientas que requieren generación de lenguaje se marcan como "no disponibles".

### Modo Read-Only (solo análisis)
El pipeline se detiene después de Scoring Engine. No se ejecutan tools ni patches. Usado para el Advisor Workspace cuando el usuario solo está explorando.

## 2.6 Estados del Pipeline

| Estado | Significado |
|--------|-------------|
| `PENDING` | Goal recibido, no procesado |
| `PLANNING` | Planner trabajando |
| `REASONING` | Reasoning Engine trabajando |
| `SCORING` | Scoring Engine trabajando |
| `DECIDING` | Decision Engine trabajando |
| `WAITING_FOR_LLM` | Esperando respuesta del LLM |
| `EXECUTING` | Execution Engine trabajando |
| `PATCHING` | Aplicando cambios al Blueprint |
| `COMPLETED` | Pipeline terminado exitosamente |
| `FAILED` | Pipeline terminó con error |
| `BLOCKED` | Pipeline bloqueado por regla de negocio |

---

# Capítulo 3: Capas y Responsabilidades

## 3.1 Arquitectura en Capas

El sistema se organiza en **5 capas verticales**. Ningún componente puede saltarse una capa para acceder a otra.

```
────────────────────────────────────────────
Presentation Layer
Review Workspace | Chat | Dashboard | Admin SPA
────────────────────────────────────────────
       │
       ▼
────────────────────────────────────────────
Application Layer
Planner | Decision Engine | Execution Engine |
Policy Engine | State Manager | Scheduler
────────────────────────────────────────────
       │
       ▼
────────────────────────────────────────────
Intelligence Layer
Reasoning | Scoring | Recommendation |
Explainability | Simulator | Quality Evaluator
────────────────────────────────────────────
       │
       ▼
────────────────────────────────────────────
Knowledge Layer
Blackboard | Memory Store | Memory Manager |
Knowledge Base | Prompt Registry
────────────────────────────────────────────
       │
       ▼
────────────────────────────────────────────
Infrastructure Layer
Inference Router | Dropi | Database |
Queue | Event Bus | AI Cache
────────────────────────────────────────────
```

### Reglas entre capas
- **Presentation** llama a **Application** (nunca directo a Intelligence o Knowledge)
- **Application** orquesta **Intelligence + Knowledge**
- **Intelligence** lee/escribe **Knowledge** (nunca directo a Infrastructure)
- **Knowledge** persiste en **Infrastructure**
- **Infrastructure** no conoce reglas de negocio

---

## 3.2 Regla Fundamental

Cada componente del sistema tiene **una y solo una responsabilidad**. Si un componente hace más de una cosa, debe dividirse. Si dos componentes comparten responsabilidad, deben fusionarse.

Esta regla no es negociable. Cualquier violación debe ser corregida antes de agregar nueva funcionalidad.

---

## 3.3 Capa: Application Layer

### 3.3.1 Planner

**Capa:** Application

**Propósito:** Interpreta objetivos del usuario o del sistema y los divide en un plan de trabajo ejecutable.

**Responsabilidades:**
- Recibir un `Goal` (texto del usuario o intención del sistema)
- Clasificar el tipo de goal (analizar, optimizar, publicar, simular, etc.)
- Dividir el goal en una secuencia de tareas atómicas
- Asignar a cada tarea un motor o herramienta responsable
- Retornar un `Plan` estructurado

**NO hace:**
- No ejecuta herramientas
- No accede a la base de datos
- No llama al LLM
- No modifica el Blackboard (solo lo lee)
- No toma decisiones de negocio

**Contrato:**

```
Entrada:  Goal { text, type, constraints?, context? }
Salida:   Plan { intent, tasks[], requiresLLM, estimatedComplexity }
```

**Eventos:** `GOAL_CREATED`, `PLAN_GENERATED`

---

### 3.3.2 State Manager ⭐ NUEVO

**Capa:** Application

**Propósito:** Único componente autorizado para mutar el Blackboard. Garantiza consistencia, versionado y detección de conflictos.

**Responsabilidades:**
- Validar todo cambio de estado antes de aplicarlo
- Aplicar mutaciones mediante JSON Patch (nunca asignación directa)
- Versionar cada cambio de estado
- Detectar conflictos de escritura concurrente
- Emitir eventos por cada mutación

**NO hace:**
- No implementa lógica de negocio
- No decide qué cambiar (eso es Decision Engine)
- No almacena estado (eso es Blackboard)

**Contrato:**

```
Entrada:  PatchRequest { path: string, value: any, patch: JSONPatch[], version?: number }
Salida:   PatchResult { success: boolean, newVersion: number, conflictos?: string[] }
```

**Regla estricta:** Ningún componente fuera de State Manager puede mutar el Blackboard. Si un componente necesita cambiar estado, debe hacerlo a través de State Manager.

```js
// ❌ NUNCA
blackboard.product.price = 59900;

// ✅ SIEMPRE
stateManager.apply({ op: 'replace', path: '/product/offer/price_unit', value: 59900 });
```

**Eventos:** `STATE_CHANGED`, `STATE_CONFLICT_DETECTED`

---

### 3.3.3 Decision Engine v3

**Capa:** Application

**Propósito:** Corazón del pipeline. Recibe el análisis completo y decide qué hacer: ejecutar herramientas deterministas, llamar al LLM, o ambas.

**Responsabilidades:**
- Evaluar si el goal requiere generación de lenguaje
- Verificar AI Cache antes de decidir llamar al LLM
- Construir el plan de ejecución (tools a invocar, orden, parámetros)
- Decidir modo de operación (Full, Determinista, Read-Only)
- Calcular costo estimado en tokens
- Retornar trazabilidad de la decisión

**NO hace:**
- No implementa lógica de negocio
- No llama APIs externas directamente
- No ejecuta tools (eso es Execution Engine)
- No modifica datos

**Contrato:**

```
Entrada:
  Goal, Blackboard, Product, Blueprint,
  ReasoningResult, ScoringResult, MemoryContext

Salida:
  Decision {
    plan: Action[],
    selectedTools: string[],
    needLLM: boolean,
    llmReason: string | null,
    estimatedTokens: number,
    confidenceDelta: number | null,
    reasoning: string
  }
```

**Eventos:** Solo `DECISION_COMPLETED`. Los eventos de estados intermedios los emiten los componentes respectivos.

---

### 3.3.4 Policy Engine ⭐ NUEVO

**Capa:** Application

**Propósito:** Centralizar todas las restricciones y políticas del sistema antes de permitir la ejecución de herramientas.

**Responsabilidades:**
- Validar presupuesto de IA disponible
- Verificar estado de proveedores externos
- Validar permisos del usuario
- Verificar bloqueos de producto
- Controlar cuotas de IA (tokens/día)
- Validar horarios permitidos
- Evaluar feature flags
- Detener el pipeline si alguna política se viola

**NO hace:**
- No ejecuta herramientas
- No implementa lógica de negocio del producto
- No modifica datos

**Reglas actuales:**

| Política | Qué valida | Acción si falla |
|----------|-----------|----------------|
| Budget | Tokens consumidos vs presupuesto diario | Degradar a modo Determinista |
| Provider health | ¿El proveedor está respondiendo? | Fallback automático |
| User permissions | ¿El usuario tiene permiso para esta acción? | Bloquear pipeline |
| Product block | ¿El producto está bloqueado por reglas? | Retornar BLOCK |
| Rate limit | ¿Se excedió la cuota por minuto? | Encolar para después |
| Feature flag | ¿La feature está activa para este tenant? | Ocultar tool |

**Eventos:** `POLICY_CHECKED`, `POLICY_VIOLATED`, `POLICY_BLOCKED`

---

### 3.3.5 Tool Planner

**Capa:** Application

**Propósito:** Recibir el plan del Decision Engine (ya validado por Policy Engine) y convertirlo en una secuencia ejecutable de llamadas a herramientas.

**Responsabilidades:**
- Mapear acciones del plan a herramientas registradas en el Tool Registry
- Validar que cada herramienta tenga los permisos necesarios
- Ordenar herramientas respetando dependencias entre ellas
- Detectar conflictos entre herramientas (dos tools modificando el mismo path)
- Marcar herramientas no disponibles en modo Determinista

**NO hace:**
- No ejecuta herramientas
- No modifica el Blackboard
- No decide qué herramientas usar (eso es Decision Engine)

**Contrato:**

```
Entrada:  Decision.plan, ToolRegistry
Salida:   ToolPlan { calls: ToolCall[], conflicts[], unavailableTools[], estimatedDuration }
```

**Eventos:** `TOOL_SELECTED`

---

### 3.3.6 Execution Engine + Rollback Manager ⭐ MEJORADO

**Capa:** Application

**Propósito:** Ejecutar herramientas de forma confiable con manejo de errores, reintentos, timeouts y capacidad de rollback.

**Responsabilidades:**
- Ejecutar cada ToolCall en el orden definido por Tool Planner
- Manejar timeouts por herramienta
- Implementar reintentos con backoff exponencial
- Detectar fallos y decidir: continuar, reintentar, compensar, o hacer rollback
- Registrar outputs de cada tool en el Blackboard
- Emitir eventos por cada tool ejecutada

**Rollback Manager (sub-componente):**
- Mantiene un stack de herramientas ejecutadas exitosamente
- Cuando una herramienta falla, evalúa si el plan requiere compensación
- Ejecuta herramientas de compensación en orden inverso
- No restaura snapshots — ejecuta acciones de deshacer específicas

**Modos de fallo:**

| Modo | Comportamiento | Cuándo usarlo |
|------|---------------|---------------|
| `continue` | Ignora el error, sigue con la siguiente tool | Fallo no crítico (ej: cache miss) |
| `retry` | Reintenta con backoff | Error transitorio (ej: timeout de red) |
| `compensate` | Ejecuta tool de compensación | Error parcial (ej: se actualizó precio pero falló SEO) |
| `rollback` | Revierte todas las tools ejecutadas | Error crítico (ej: DB corruption) |
| `abort` | Detiene todo inmediatamente | Error irrecuperable (ej: proveedor caído) |

**NO hace:**
- No selecciona herramientas
- No implementa lógica de negocio

**Contrato:**

```
Entrada:  ToolPlan
Salida:   ExecutionResult { results[], failed[], durationMs, mode: string, rollbackApplied: boolean }
```

**Timeouts:**

| Tipo de Tool | Timeout | Reintentos |
|-------------|---------|------------|
| Lectura DB | 5s | 1 |
| Escritura DB | 10s | 2 |
| API externa (Dropi) | 30s | 3 |
| Inferencia (LLM) | 60s | 2 |
| Cálculo local | 2s | 0 |

**Eventos:** `TOOL_STARTED`, `TOOL_COMPLETED`, `TOOL_FAILED`, `ROLLBACK_EXECUTED`, `EXECUTION_COMPLETED`, `EXECUTION_FAILED`

---

### 3.3.7 Scheduler ⭐ NUEVO

**Capa:** Application

**Propósito:** Ejecutar tareas recurrentes sin intervención humana. Responsable de la autonomía del sistema.

**Responsabilidades:**
- Mantener un registro de tareas programadas (cron-like)
- Ejecutar tareas en el momento definido
- Reintentar tareas fallidas según política
- Emitir eventos por cada ejecución programada
- Proveer API para registrar/cancelar tareas

**NO hace:**
- No define qué tareas programar (eso es configuración del usuario o del sistema)
- No implementa lógica de negocio
- No ejecuta herramientas directamente (las delega al Execution Engine)

**Tareas planificadas de ejemplo:**

| Tarea | Frecuencia | Propósito |
|-------|-----------|-----------|
| Recalcular Confidence | Cada 24h | Actualizar scores de productos activos |
| Sincronizar inventario | Cada 6h | Sync con Dropi |
| Revisar campañas | Cada 1h | Monitoreo de rendimiento |
| Limpiar cache | Cada 12h | Purga de AI Cache expirado |

**Eventos:** `SCHEDULED_TASK_REGISTERED`, `SCHEDULED_TASK_STARTED`, `SCHEDULED_TASK_COMPLETED`, `SCHEDULED_TASK_FAILED`

---

## 3.4 Capa: Intelligence Layer

### 3.4.1 Reasoning Engine

**Capa:** Intelligence

**Propósito:** Analizar el producto y el contexto usando reglas deterministas para producir hechos cuantificables.

**Responsabilidades:**
- Calcular métricas financieras: margen, ROAS, CPA máximo
- Evaluar logística: peso, dimensiones, fragilidad
- Evaluar calidad de datos: imágenes, descripción, metadata
- Clasificar hallazgos por severidad (critical, high, medium, low, ok)
- Generar recomendaciones estructuradas desde reglas
- Decidir si el producto debe ser bloqueado (BLOCK)

**NO hace:**
- No genera texto
- No calcula Confidence Score (eso es Scoring)
- No ejecuta herramientas
- No modifica el Blueprint

**Contrato:**

```
Entrada:  Product, Blackboard
Salida:   ReasoningResult { facts, findings[], recommendations[], blockers[], recommendation }
```

**Reglas actuales:**

| Regla | Archivo | Qué calcula |
|-------|---------|-------------|
| Margin | `reasoning/rules/margin.rule.js` | Margen bruto, precio mínimo |
| ROAS | `reasoning/rules/roas.rule.js` | ROAS esperado, viabilidad de pauta |
| Logistics | `reasoning/rules/logistics.rule.js` | Peso, costo de envío, fragilidad |
| Data Quality | `reasoning/rules/data-quality.rule.js` | Imágenes, descripción, metadata |

**Eventos:** `REASONING_COMPLETE`

---

### 3.4.2 Scoring Engine

**Capa:** Intelligence

**Propósito:** Convertir los hechos del Reasoning Engine en un Confidence Score cuantificable con desglose por dimensión.

**Responsabilidades:**
- Calcular score por dimensión (viabilidad, logística, calidad de datos, SEO, oferta)
- Calcular Confidence Score ponderado (0–100)
- Asignar calificación por letra (A+, A, B+, B, C, D)
- Detectar blockers que impiden el lanzamiento
- Determinar `isLaunchReady`

**NO hace:**
- No genera explicaciones en lenguaje natural (eso es Explainability)
- No modifica datos
- No ejecuta herramientas
- No toma decisiones de negocio

**Contrato:**

```
Entrada:  Product, ReasoningResult
Salida:   ScoringResult { scores{}, confidence, grade, explanations, blockers[], isLaunchReady }
```

**Pesos actuales:**

| Dimensión | Peso |
|-----------|------|
| Viabilidad | 25% |
| Logística | 20% |
| Calidad de Datos | 20% |
| SEO | 15% |
| Oferta | 20% |

**Eventos:** `SCORING_COMPLETE`

---

### 3.4.3 Recommendation Engine

**Capa:** Intelligence

**Propósito:** Generar recomendaciones priorizadas a partir de los hallazgos y scores.

**Responsabilidades:**
- Priorizar recomendaciones por expectedConfidenceGain
- Generar recomendaciones estratégicas (bundles, price optimization)
- Mapear cada recomendación a un `simulationKey` para simulación
- Limitar a top 5 recomendaciones

**NO hace:**
- No ejecuta simulaciones
- No modifica datos
- No genera hallazgos nuevos

**Contrato:**

```
Entrada:  Product, ReasoningResult, ScoringResult
Salida:   RecommendationResult { recommendations[], currentConfidence, projectedConfidence, projectedConfidenceGain }
```

---

### 3.4.4 Scenario Simulator

**Capa:** Intelligence

**Propósito:** Ejecutar simulaciones "what-if" sin consumir tokens ni modificar datos.

**Responsabilidades:**
- Simular cambios de precio
- Simular bundles (x2, x3)
- Simular envío gratis
- Calcular impacto en ROAS, margen y Confidence Score
- Ejecutar `optimizeBest()` para encontrar el mejor escenario automáticamente

**NO hace:**
- No modifica el Blueprint
- No persiste resultados
- No usa el LLM
- No ejecuta herramientas

**Contrato:**

```
Entrada:  Product, Scenario { type, value?, quantity?, shippingCost? }
Salida:   SimulationResult { before, after, delta, scenario, scoring }
```

**Escenarios Soportados:**

| Tipo | Parámetros | Cálculo |
|------|------------|---------|
| `price` | `value: number` | Cambia retail, recalcula margen y ROAS |
| `bundle` | `quantity: 2-5` | Escala cost/retail, reduce % ad spend |
| `free_shipping` | `shippingCost: number` | Suma costo de envío al retail |

---

### 3.4.5 Quality Evaluator

**Capa:** Intelligence

**Propósito:** Evaluar la calidad del output generado (por LLM o por herramientas) antes de permitir que se aplique al Blueprint.

**Responsabilidades:**
- Validar que el output cumpla con estándares mínimos de calidad
- Ejecutar evaluación rápida (fast) para la mayoría de los casos
- Ejecutar evaluación profunda (deep) si la rápida falla
- Detectar alucinaciones, contradicciones y datos no válidos
- Decidir si el output pasa o debe ser regenerado

**NO hace:**
- No modifica el output
- No ejecuta herramientas
- No toma decisiones de negocio

**Contrato:**

```
Entrada:  text, context, mode: 'fast' | 'deep'
Salida:   QualityResult { passed, overall, details{}, failures[], requiresRegeneration }
```

**Reglas de calidad (fast evaluator):**

| Regla | Qué valida |
|-------|-----------|
| Longitud mínima | Output > 10 caracteres |
| Perspectiva del CTA | Incluye llamado a la acción |
| Compliance | No contiene lenguaje prohibido |
| Coherencia | No contradice el contexto del producto |

**Eventos:** `QUALITY_PASSED`, `QUALITY_FAILED`, `QUALITY_DEEP_EVALUATED`

---

### 3.4.6 Explainability Engine ⭐ MEJORADO

**Capa:** Intelligence

**Propósito:** Consumir TODO el pipeline (Reasoning, Scoring, Decision, Simulator, Recommendations) y producir explicaciones en lenguaje natural.

**Responsabilidades:**
- Generar Executive Summary a partir de confidence, grade, blockers y decisión tomada
- Desglosar cada dimensión del scoring con su contribución al total
- Explicar hallazgos críticos en lenguaje humano
- Explicar por qué el Decision Engine tomó su decisión (si aplicó o no LLM, por qué)
- Explicar resultados de simulación (antes vs después)
- Generar top actions recomendadas

**NO hace:**
- No calcula scores (eso es Scoring Engine)
- No genera hallazgos (eso es Reasoning Engine)
- No recomienda acciones nuevas (solo formatea las existentes)
- No toma decisiones

**Contrato:**

```
Entrada:
  ReasoningResult, ScoringResult, Decision?, SimulationResult?, RecommendationResult

Salida:
  ExplainabilityReport {
    executiveSummary: string,
    scoreBreakdown: { [dimension]: { score, contribution, explanation } },
    decisionExplanation: string | null,   // por qué se tomó la decisión
    simulationExplanation: string | null, // qué cambió con la simulación
    dimensionExplanations: object,
    topActions: { label, gain, roasGain, simulationKey }[],
    isLaunchReady: boolean,
    confidence: number,
    grade: string
  }
```

**Eventos:** `EXPLANATION_GENERATED`

---

## 3.5 Capa: Knowledge Layer

### 3.5.1 Blackboard

**Capa:** Knowledge

**Propósito:** Estado global compartido y única fuente de verdad durante el ciclo de ejecución de un goal.

**Responsabilidades:**
- Mantener el estado actual del producto, mercado, lanzamiento y usuario
- Proveer acceso de LECTURA a todos los motores del pipeline
- Garantizar consistencia: si dos motores leen el mismo path, ven el mismo valor
- No retener estado entre ejecuciones de goals distintos

**NO hace:**
- No implementa lógica de negocio
- No acepta mutaciones directas (solo a través de State Manager)
- No persiste datos (es transitorio, la persistencia la maneja Memory)
- No emite decisiones

**Contrato:**

```
Blackboard {
  product: ProductState
  business: BusinessState
  launch: LaunchState
  market: MarketState
  user: UserPreferences
  goals: Goal[]
  tasks: ActiveTask[]
  memory: MemoryReferences
  toolOutputs: Map<string, any>
  constraints: Constraint[]
}
```

**Estructura del estado:**

| Sección | Contenido | Quién lo escribe |
|---------|-----------|-----------------|
| `product` | Datos del producto + Blueprint | State Manager (vía Review Workspace o Execution Engine) |
| `business` | Métricas de negocio (margen, ROAS) | Reasoning Engine (vía State Manager) |
| `launch` | Estado del lanzamiento (draft, review, approved) | State Manager |
| `market` | Información de mercado y competencia | Hunter (World Intelligence) |
| `user` | Preferencias del usuario actual | Planner (al inicio del goal) |
| `goals` | Goals activos y su estado | Planner |
| `tasks` | Tareas del plan actual | Planner → Decision Engine |
| `toolOutputs` | Outputs de herramientas ejecutadas | Execution Engine |
| `constraints` | Restricciones activas | Policy Engine |

**Eventos:** `BLACKBOARD_READ` (solo lectura, sin mutaciones directas)

**Nota de implementación:** Actualmente el Blackboard no existe como entidad separada. Los datos se pasan como parámetros entre motores. La implementación del Blackboard es el **Sprint 3** del roadmap. Hasta entonces, el contrato se mantiene mediante interfaces compartidas.

---

### 3.5.2 Memory Store ⭐ NUEVO (separado de Memory Manager)

**Capa:** Knowledge

**Propósito:** Capa de almacenamiento puro para memoria. Solo sabe guardar y leer.

**Responsabilidades:**
- Persistir datos de memoria en DB
- Leer datos de memoria por query (store_id, type, key, launch_id)
- Aplicar TTLs y purgar datos expirados
- Proveer API CRUD básica: get, set, delete, query

**NO hace:**
- No decide qué recordar
- No decide qué olvidar
- No resume ni transforma datos
- No implementa lógica de negocio

**Contrato:**

```
Entrada:  { storeId, type, key, value, ttl? }
Salida:   { success: boolean }
```

---

### 3.5.3 Memory Manager ⭐ REFINADO

**Capa:** Knowledge (inteligencia sobre Memory Store)

**Propósito:** Decide qué recordar, qué olvidar, qué resumir y cuándo consultar memoria.

**Responsabilidades:**
- Decidir qué información merece ser persistida
- Decidir qué información debe ser olvidada (por irrelevante o expirada)
- Resumir memorias largas antes de persistirlas
- Decidir cuándo consultar memoria histórica
- Priorizar memorias por relevancia al goal actual
- Usar Memory Store para persistencia real

**NO hace:**
- No almacena datos directamente (delega en Memory Store)
- No implementa reglas de negocio del producto

**Tipos de memoria:**

| Tipo | TTL | Store | Propósito | Gestión |
|------|-----|-------|-----------|---------|
| Working | Duración del goal | En memoria | Estado transitorio del pipeline | Memory Manager la crea y destruye |
| Session | 24h | Memory Store | Preferencias y contexto de sesión | Memory Manager la resume al inicio |
| Long-term | 90d | Memory Store | Preferencias persistentes del usuario | Memory Manager decide qué promover aquí |
| Event | 90d | Memory Store | Trazabilidad de decisiones pasadas | Siempre se persiste |
| Knowledge | ∞ | Memory Store | Base de conocimiento del negocio | Solo se modifica por revisión explícita |

**Eventos:** `MEMORY_STORED`, `MEMORY_RETRIEVED`, `MEMORY_SUMMARIZED`, `MEMORY_PURGED`

---

### 3.5.4 AI Cache

**Capa:** Knowledge

**Propósito:** Evitar llamadas redundantes al LLM cacheando respuestas por hash del prompt.

**Responsabilidades:**
- Calcular SHA-256 del prompt completo (incluyendo systemPrompt, tools, schema)
- Almacenar respuestas del LLM con su hash como key
- Devolver respuestas cacheadas cuando el hash coincide
- Invalidar cache cuando el producto o blueprint cambian

**NO hace:**
- No decide si se necesita LLM
- No modifica respuestas
- No almacena datos sensibles sin encriptar

**Contrato:**

```
Entrada:  key: string (SHA-256 del prompt)
Salida:   CacheResult { hit, data?, age? }
```

**Tabla en DB:** `ai_cache` — key (SHA-256), response, created_at, ttl

---

## 3.6 Capa: Infrastructure Layer

### 3.6.1 Inference Router ⭐ RENOMBRADO (antes Provider Router)

**Capa:** Infrastructure

**Propósito:** Único punto de contacto entre el sistema y todos los proveedores de inferencia (no solo LLM). Aísla al negocio de los detalles de implementación de cada proveedor.

**Responsabilidades:**
- Seleccionar proveedor según disponibilidad y prioridad configurada
- Manejar fallback entre proveedores
- Traducir la llamada genérica `generate()` al formato de cada proveedor
- Verificar AI Cache antes de enviar la solicitud
- Reportar métricas de uso (tokens, latency, costo)
- Validar respuesta contra schema Zod

**Tipos de inferencia soportados (ahora y en el futuro):**

| Tipo | Estado |
|------|--------|
| Text Generation (LLM) | ✅ Hoy |
| Cache | ✅ Hoy |
| Embeddings | 🚧 Preparado |
| Vision | 🔮 Futuro |
| Speech-to-Text | 🔮 Futuro |
| OCR | 🔮 Futuro |

**NO hace:**
- No conoce reglas de negocio
- No decide si se necesita IA (eso es Decision Engine)
- No modifica datos
- No almacena respuestas (excepto en cache)

**Contrato:**

```
Entrada:
  InferenceRequest {
    type: 'llm' | 'embedding' | 'vision' | ...,
    prompt?: string,
    schema?: ZodSchema,
    tools?: ToolDefinition[],
    temperature?: number,
    systemPrompt?: string,
    maxTokens?: number
  }

Salida:
  InferenceResponse {
    text: string,
    parsed?: object,
    provider: string,
    model: string,
    tokensUsed: { prompt, completion, total },
    latencyMs: number,
    cached: boolean
  }
```

**Proveedores Soportados:**

| Proveedor | Estado | Prioridad |
|-----------|--------|-----------|
| Mock | ✅ Siempre disponible | 0 (default sin API key) |
| Gemini | ✅ Configurado | 1 |
| OpenAI | 🚧 Provider creado | 2 |
| Claude | 🚧 Provider creado | 3 |
| DeepSeek | 🔮 Futuro | 4 |
| Local (Ollama) | 🔮 Futuro | 5 |

**Eventos:** `INFERENCE_REQUEST`, `INFERENCE_RESPONSE`, `INFERENCE_ERROR`, `INFERENCE_FALLBACK`, `CACHE_HIT`, `CACHE_MISS`

---

## 3.7 Pipeline Oficial con Capas

```
Goal (Presentation)
  │
  ▼
Planner (Application) ───────────────► Interpreta objetivo, divide en tasks
  │
  ▼
State Manager (Application) ─────────► Valida y aplica mutaciones al Blackboard
  │
  ▼
Blackboard (Knowledge) ──────────────► Estado global compartido
  │
  ▼
Reasoning Engine (Intelligence) ─────► Hechos deterministas
  │
  ▼
Scoring Engine (Intelligence) ───────► Confidence Score
  │
  ▼
Decision Engine (Application) ───────► ¿Qué hacer? ¿LLM?
  │                      │
  │                   ┌──┘
  │                   ▼
  │              Inference Router (Infrastructure) ──► Solo si aplica
  │                   │
  │                   ▼
  │              AI Cache (Knowledge) ──────────────► Cache check
  │                   │
  └───────────────────┘
  │
  ▼
Policy Engine (Application) ─────────► Restricciones y permisos
  │
  ▼
Tool Planner (Application) ──────────► Tools a ejecutar + orden
  │
  ▼
Execution Engine (Application) ──────► Ejecuta con retry, rollback
  │
  ▼
State Manager (Application) ─────────► Aplica JSON Patch al Blackboard
  │
  ▼
Quality Evaluator (Intelligence) ────► Calidad del resultado
  │
  ▼
Memory Manager (Knowledge) ──────────► Decide qué persistir
  │
  ▼
Memory Store (Knowledge) ────────────► Persiste
  │
  ▼
Event Bus (Infrastructure) ──────────► Emite eventos de todo el ciclo
  │
  ▼
Review Workspace (Presentation) ─────► Renderiza al usuario
```

---

## 3.8 Resumen General de Componentes

| Componente | Capa | Entrada | Salida | Eventos | Dependencias |
|-----------|------|---------|--------|---------|-------------|
| **Planner** | Application | Goal | Plan | GOAL_CREATED, PLAN_GENERATED | Blackboard |
| **State Manager** | Application | PatchRequest | PatchResult | STATE_CHANGED, STATE_CONFLICT | Blackboard |
| **Decision Engine** | Application | Goal, Blackboard, Reasoning, Scoring | Decision | DECISION_COMPLETED | Policy Engine, Inference Router |
| **Policy Engine** | Application | Decision, Constraints | PolicyVeredict | POLICY_CHECKED, POLICY_VIOLATED | Blackboard |
| **Tool Planner** | Application | Decision, ToolRegistry | ToolPlan | TOOL_SELECTED | Tool Registry |
| **Execution Engine** | Application | ToolPlan | ExecutionResult | TOOL_STARTED/COMPLETED/FAILED, ROLLBACK | Tool Registry, State Manager |
| **Scheduler** | Application | Cron config | Task resultado | SCHEDULED_TASK_* | Execution Engine |
| **Reasoning Engine** | Intelligence | Product, Blackboard | ReasoningResult | REASONING_COMPLETE | — |
| **Scoring Engine** | Intelligence | Product, Reasoning | ScoringResult | SCORING_COMPLETE | — |
| **Recommendation Engine** | Intelligence | Product, Reasoning, Scoring | RecommendationResult | — | — |
| **Simulator** | Intelligence | Product, Scenario | SimulationResult | — | — |
| **Quality Evaluator** | Intelligence | text, context | QualityResult | QUALITY_PASSED/FAILED | — |
| **Explainability Engine** | Intelligence | Reasoning, Scoring, Decision, Simulator, Recs | ExplainabilityReport | EXPLANATION_GENERATED | — |
| **Blackboard** | Knowledge | — | Estado actual | BLACKBOARD_READ | State Manager |
| **Memory Store** | Knowledge | { storeId, type, key, value } | { success } | — | DB |
| **Memory Manager** | Knowledge | Goal, Context | Memoria relevante | MEMORY_STORED, MEMORY_PURGED | Memory Store |
| **AI Cache** | Knowledge | SHA-256 key | CacheResult | CACHE_HIT, CACHE_MISS | DB |
| **Inference Router** | Infrastructure | InferenceRequest | InferenceResponse | INFERENCE_* | AI Cache, Proveedores |
| **Event Bus** | Infrastructure | Event | — | (canal) | DB |

---

---

# Capítulo 4: Blackboard

## 4.1 Filosofía

El Blackboard es **la única fuente de verdad del estado cognitivo de LIAM durante la resolución de un objetivo.**

No es una base de datos. No es un caché. No es un objeto de configuración. Es el **contexto compartido y vivo** sobre el cual todos los motores toman decisiones.

### Arquitectura radial

A diferencia de un pipeline secuencial donde cada motor pasa datos al siguiente, el Blackboard establece una **arquitectura radial**: todos los motores leen del mismo lugar y escriben en el mismo lugar. Ningún motor habla directamente con otro.

```
                    ┌─────────────────┐
                    │    Planner       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Reasoning     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Scoring       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Simulator     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Decision      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Explainability  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │                  │
                    │   BLACKBOARD     │
                    │                  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐ ┌──────▼──────┐ ┌─────▼──────┐
     │   Memory    │ │    Dropi    │ │    DB      │
     └─────────────┘ └─────────────┘ └────────────┘
                           │
                    ┌──────▼──────┐
                    │    LLM      │
                    └─────────────┘
```

### Implicaciones de la arquitectura radial

| Implicación | Descripción |
|-------------|-------------|
| **Acoplamiento cero entre motores** | Reasoning no necesita saber que Scoring existe. Ambos escriben en Blackboard. |
| **Orden relajado** | Mientras el pipeline define un orden preferido, los motores podrían ejecutarse en paralelo si no hay dependencias de datos. |
| **Depuración centralizada** | Para entender qué pasó en una ejecución, solo hay que inspeccionar el Blackboard. No hay mensajes entre componentes que rastrear. |
| **Extensibilidad** | Agregar un nuevo motor no requiere modificar ningún otro motor. Solo necesita leer del Blackboard y escribir en él. |
| **Testing simplificado** | Cada motor se prueba con un Blackboard de entrada y verifica un Blackboard de salida. No hay mocking de otros motores. |

### Principios del Blackboard

1. **Todo motor lee del Blackboard.** Ningún motor recibe datos directamente de otro motor. La única excepción es el Goal inicial, que llega desde Presentation Layer.

2. **Solo el State Manager escribe en el Blackboard.** Ningún motor tiene permiso de escritura directa. Esto garantiza que toda mutación pase por validación, versionado y auditoría.

3. **El Blackboard es transitorio por goal.** No retiene estado entre ejecuciones de goals distintos. La persistencia de largo plazo es responsabilidad de Memory.

4. **El Blackboard no duplica la base de datos.** Contiene solo el contexto necesario para la toma de decisiones actual. No es un espejo de PostgreSQL.

---

## 4.2 Capas del Blackboard

El Blackboard no es un objeto plano. Se organiza en **6 estados explícitos**, cada uno con una responsabilidad específica, un ciclo de vida propio y un conjunto de reglas de escritura.

```
Blackboard {
  product:   ProductState   ← Estado del producto y su blueprint
  business:  BusinessState  ← Configuración del negocio y restricciones
  launch:    LaunchState    ← Estado del lanzamiento (el más crítico)
  market:    MarketState    ← Contexto competitivo y de mercado
  user:      UserState      ← Preferencias y permisos del usuario
  runtime:   RuntimeState   ← Estado vivo de la ejecución actual
}
```

---

### 4.2.1 Product State

**Propósito:** Representar el producto tal como existe en el sistema, incluyendo su blueprint, proveedor, variantes, logística y media.

**Ciclo de vida:** Se carga al inicio del goal desde la base de datos (o desde Dropi si es un producto nuevo). Puede ser modificado por Execution Engine a través del State Manager.

```
ProductState {
  product: {
    id: string,
    name: string,
    description: string,
    category: string,
    tags: string[],
    status: 'draft' | 'analyzing' | 'ready' | 'published' | 'blocked'
  },
  provider: {
    id: string,
    name: string,
    type: 'dropi' | 'manual' | 'api',
    connectionStatus: 'connected' | 'disconnected' | 'error'
  },
  variants: [{
    id: string,
    sku: string,
    name: string,
    attributes: Record<string, string>,
    stock: number,
    price: {
      cost: number,
      retail: number,
      compareAt: number | null,
      margin: number
    },
    weight: number,
    dimensions: { width: number, height: number, depth: number }
  }],
  pricing: {
    costTotal: number,
    retailTotal: number,
    marginTotal: number,
    marginPercent: number,
    minPrice: number,
    maxPrice: number,
    suggestedPrice: number | null
  },
  inventory: {
    totalStock: number,
    lowStockThreshold: number,
    isLowStock: boolean,
    isOutOfStock: boolean,
    estimatedRestockDays: number | null
  },
  logistics: {
    weight: number,
    dimensions: { width: number, height: number, depth: number },
    volumetricWeight: number,
    fragility: 'low' | 'medium' | 'high',
    shippingCost: number,
    shippingMethods: string[],
    restrictions: string[]
  },
  media: {
    images: [{ url: string, alt: string, isPrimary: boolean }],
    videos: [{ url: string, type: string }],
    documents: [{ url: string, type: string }],
    imageCount: number,
    hasPrimaryImage: boolean,
    qualityIssues: string[]
  },
  attributes: Record<string, string>,
  supplier: {
    id: string,
    name: string,
    fulfillmentTime: number,
    returnPolicy: string,
    rating: number
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `product` | State Manager (vía carga inicial) | Al inicio del goal |
| `provider` | State Manager (vía carga inicial) | Al inicio del goal |
| `variants` | State Manager (vía Dropi sync) | Durante ejecución |
| `pricing` | Reasoning Engine (vía State Manager) | Durante reasoning |
| `inventory` | State Manager (vía Dropi sync) | Durante ejecución |
| `logistics` | Reasoning Engine (vía State Manager) | Durante reasoning |
| `media` | State Manager (vía carga inicial) | Al inicio del goal |
| `attributes` | State Manager (vía carga inicial) | Al inicio del goal |
| `supplier` | State Manager (vía carga inicial) | Al inicio del goal |

---

### 4.2.2 Business State

**Propósito:** Representar la configuración del negocio, restricciones financieras, presupuestos, cuotas y reglas fiscales del tenant.

**Ciclo de vida:** Se carga al inicio del goal y solo cambia si el usuario modifica su configuración de negocio. No se espera que cambie durante una ejecución normal.

```
BusinessState {
  store: {
    id: string,
    name: string,
    domain: string,
    platform: string,
    timezone: string,
    operatingHours: { open: string, close: string }
  },
  budgets: {
    monthlyAdBudget: number,
    maxBid: number,
    dailyBudget: number,
    remainingDailyBudget: number,
    budgetPeriod: 'daily' | 'weekly' | 'monthly'
  },
  tokenBudget: {
    dailyLimit: number,
    usedToday: number,
    remainingToday: number,
    monthlyLimit: number,
    usedThisMonth: number,
    costPerToken: number,
    estimatedDailyCost: number
  },
  providerHealth: {
    gemini: { status: 'healthy' | 'degraded' | 'down', lastCheck: string, latencyMs: number },
    openai: { status: 'healthy' | 'degraded' | 'down' | 'unconfigured', lastCheck: string, latencyMs: number },
    claude: { status: 'healthy' | 'degraded' | 'down' | 'unconfigured', lastCheck: string, latencyMs: number },
    dropi: { status: 'healthy' | 'degraded' | 'down', lastCheck: string, latencyMs: number }
  },
  quotas: {
    maxProductsPerLaunch: number,
    maxVariantsPerProduct: number,
    maxImagesPerProduct: number,
    maxToolsPerExecution: number,
    concurrentGoals: number
  },
  currency: {
    code: string,
    symbol: string,
    decimalPlaces: number,
    exchangeRate: number
  },
  country: {
    code: string,
    name: string,
    region: 'latam' | 'europe' | 'asia' | 'na' | 'other'
  },
  shippingRules: {
    freeShippingThreshold: number | null,
    flatRate: number | null,
    weightBased: { from: number, to: number, cost: number }[],
    expeditedAvailable: boolean,
    internationalAvailable: boolean
  },
  taxes: {
    taxIncluded: boolean,
    taxRate: number,
    taxId: string | null,
    taxRules: { region: string, rate: number }[]
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `store` | Configuración del tenant | Al inicio del goal |
| `budgets` | Configuración del tenant | Al inicio del goal |
| `tokenBudget` | Policy Engine (vía State Manager) | Al inicio y tras cada consumo |
| `providerHealth` | Policy Engine (vía State Manager) | Periódicamente |
| `quotas` | Configuración del tenant | Al inicio del goal |
| `currency` | Configuración del tenant | Al inicio del goal |
| `country` | Configuración del tenant | Al inicio del goal |
| `shippingRules` | Configuración del tenant | Al inicio del goal |
| `taxes` | Configuración del tenant | Al inicio del goal |

---

### 4.2.3 Launch State

**Propósito:** Representar el estado completo del lanzamiento. Es el estado más importante del Blackboard porque contiene el **Blueprint** (la única fuente de verdad del lanzamiento) y todos los artefactos generados durante el pipeline.

**Ciclo de vida:** Comienza vacío al inicio del goal y se construye incrementalmente a medida que el pipeline avanza. Al finalizar, contiene el Blueprint completo, el Confidence Score, las recomendaciones aplicadas y el historial de versiones.

```
LaunchState {
  launch: {
    id: string,
    productId: string,
    storeId: string,
    createdAt: string,
    updatedAt: string,
    completedAt: string | null
  },
  status: {
    current: 'initializing' | 'analyzing' | 'optimizing' | 'review' | 'approved' | 'published' | 'failed',
    previous: string[],
    blockedBy: string[],
    isBlocked: boolean,
    blockReason: string | null
  },
  blueprint: {
    version: number,
    patches: JSONPatch[],
    current: object,
    history: { version: number, patch: JSONPatch[], timestamp: string, source: string }[]
  },
  offer: {
    title: string | null,
    description: string | null,
    highlights: string[],
    cta: string | null,
    price: {
      retail: number,
      compareAt: number | null,
      discount: number | null,
      discountPercent: number | null
    },
    shipping: {
      type: 'free' | 'flat' | 'calculated',
      cost: number,
      handlingTime: string
    },
    warranty: string | null,
    paymentMethods: string[]
  },
  copies: {
    short: string | null,
    medium: string | null,
    long: string | null,
    bulletPoints: string[],
    seoDescription: string | null,
    adCopies: {
      facebook: string | null,
      google: string | null,
      tiktok: string | null
    }
  },
  seo: {
    title: string | null,
    metaDescription: string | null,
    slug: string | null,
    keywords: string[],
    url: string | null,
    score: number | null
  },
  landing: {
    layout: string | null,
    sections: { type: string, content: any }[],
    theme: string | null,
    preview: string | null
  },
  confidence: {
    current: number,
    initial: number,
    delta: number,
    history: { timestamp: string, score: number, reason: string }[]
  },
  score: {
    overall: number,
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D',
    dimensions: {
      viability: { score: number, weight: number },
      logistics: { score: number, weight: number },
      dataQuality: { score: number, weight: number },
      seo: { score: number, weight: number },
      offer: { score: number, weight: number }
    },
    isLaunchReady: boolean,
    blockers: { reason: string, severity: 'critical' | 'high' | 'medium' | 'low' }[]
  },
  recommendations: {
    applied: { key: string, label: string, expectedGain: number, actualGain: number | null }[],
    pending: { key: string, label: string, expectedGain: number, reason: string }[],
    ignored: { key: string, label: string, reason: string, timestamp: string }[]
  },
  simulations: {
    executed: { key: string, type: string, params: object, before: number, after: number, delta: number }[],
    bestScenario: { type: string, params: object, projectedConfidence: number } | null
  },
  versions: {
    current: number,
    list: { version: number, timestamp: string, source: string, description: string }[]
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `launch` | State Manager | Al inicio del goal |
| `status` | State Manager (vía Decision Engine) | Durante todo el pipeline |
| `blueprint` | State Manager (vía Execution Engine) | Al finalizar cada tool |
| `offer` | Execution Engine (vía State Manager) | Durante optimización |
| `copies` | Execution Engine (vía State Manager) | Durante generación de copies |
| `seo` | Execution Engine (vía State Manager) | Durante optimización SEO |
| `landing` | Execution Engine (vía State Manager) | Durante construcción de landing |
| `confidence` | Scoring Engine (vía State Manager) | Después de scoring y tras cada cambio |
| `score` | Scoring Engine (vía State Manager) | Después de scoring |
| `recommendations` | Recommendation Engine (vía State Manager) | Después de recomendaciones |
| `simulations` | Simulator (vía State Manager) | Después de simulaciones |
| `versions` | State Manager | En cada cambio del blueprint |

---

### 4.2.4 Market State

**Propósito:** Representar el contexto competitivo y de mercado en el que opera el producto. Es la información que LIAM recopila del exterior para contextualizar sus decisiones.

**Ciclo de vida:** Se carga o actualiza al inicio del goal y puede refrescarse durante la ejecución si el Hunter (World Intelligence) entrega nuevos datos.

```
MarketState {
  market: {
    id: string,
    name: string,
    category: string,
    subcategory: string,
    maturity: 'emerging' | 'growing' | 'mature' | 'declining',
    saturation: 'low' | 'medium' | 'high'
  },
  competitors: [{
    id: string,
    name: string,
    url: string,
    price: number,
    rating: number,
    reviewCount: number,
    estimatedSales: number | null,
    strengths: string[],
    weaknesses: string[]
  }],
  pricing: {
    competitorMin: number,
    competitorMax: number,
    competitorAverage: number,
    ourPrice: number,
    pricePosition: 'premium' | 'competitive' | 'budget' | 'undercut',
    priceElasticity: 'elastic' | 'inelastic' | 'unknown',
    suggestedPrice: number | null
  },
  seasonality: {
    isSeasonal: boolean,
    currentSeason: string | null,
    peakMonths: string[],
    lowMonths: string[],
    upcomingEvent: { name: string, date: string, expectedDemand: 'low' | 'medium' | 'high' } | null
  },
  trends: {
    searchVolume: number | null,
    trend_direction: 'rising' | 'stable' | 'declining' | 'unknown',
    relatedKeywords: string[],
    socialMentions: number | null,
    newsArticles: { title: string, url: string, sentiment: 'positive' | 'neutral' | 'negative' }[]
  },
  country: {
    code: string,
    name: string,
    language: string,
    currency: string
  },
  audience: {
    primaryAgeRange: string,
    primaryGender: string | null,
    interests: string[],
    incomeLevel: 'low' | 'medium' | 'high',
    buyingBehavior: 'impulsive' | 'considered' | 'loyal'
  },
  codAvailability: {
    codSupported: boolean,
    codFee: number | null,
    codRegions: string[]
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `market` | Hunter (World Intelligence) vía State Manager | Al inicio del goal |
| `competitors` | Hunter (vía State Manager) | Durante análisis competitivo |
| `pricing` | Reasoning + Hunter (vía State Manager) | Durante análisis de pricing |
| `seasonality` | Hunter (vía State Manager) | Al inicio del goal |
| `trends` | Hunter (vía State Manager) | Durante análisis de tendencias |
| `country` | Configuración del tenant | Al inicio del goal |
| `audience` | Hunter + configuración (vía State Manager) | Durante análisis de audiencia |
| `codAvailability` | Configuración + Dropi (vía State Manager) | Al inicio del goal |

---

### 4.2.5 User State

**Propósito:** Representar las preferencias, historial de decisiones, estilo de escritura y permisos del usuario actual. Permite que LIAM adapte sus outputs al estilo y preferencias del usuario sin necesitar configuración explícita en cada goal.

**Ciclo de vida:** Se carga al inicio de la sesión y se mantiene durante toda la interacción del usuario. Memory Manager puede actualizarlo entre goals para reflejar aprendizaje.

```
UserState {
  user: {
    id: string,
    name: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer',
    tenantId: string
  },
  preferences: {
    language: string,
    defaultCurrency: string,
    defaultCountry: string,
    tonePreference: 'formal' | 'neutral' | 'casual',
    autoApplyRecommendations: boolean,
    maxConfidenceThreshold: number,
    preferredProviders: string[]
  },
  writingStyle: {
    vocabulary: 'basic' | 'intermediate' | 'advanced',
    sentenceLength: 'short' | 'medium' | 'long',
    emojiUsage: 'never' | 'rarely' | 'sometimes' | 'frequently',
    ctaStyle: 'direct' | 'soft' | 'urgent' | 'question',
    brandVoice: string | null,
    learnedPatterns: { pattern: string, frequency: number }[]
  },
  approvalHistory: [{
    launchId: string,
    action: 'approved' | 'rejected' | 'modified',
    timestamp: string,
    modifications: JSONPatch[] | null,
    reason: string | null
  }],
  manualEdits: [{
    launchId: string,
    field: string,
    originalValue: any,
    newValue: any,
    timestamp: string
  }],
  ignoredRecommendations: [{
    launchId: string,
    recommendationKey: string,
    reason: string | null,
    timestamp: string
  }],
  permissions: {
    canLaunch: boolean,
    canEditBlueprint: boolean,
    canConfigureProviders: boolean,
    canManageUsers: boolean,
    canViewAnalytics: boolean,
    maxDailyBudget: number,
    allowedTools: string[]
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `user` | Auth + Session | Al inicio de la sesión |
| `preferences` | Usuario (vía Settings) | Cuando el usuario cambia preferencias |
| `writingStyle` | Memory Manager (vía State Manager) | Aprendizaje progresivo entre goals |
| `approvalHistory` | State Manager | Cada vez que el usuario aprueba/rechaza |
| `manualEdits` | State Manager | Cada edición manual del usuario |
| `ignoredRecommendations` | State Manager | Cada recomendación ignorada |
| `permissions` | Auth + Policy Engine | Al inicio de la sesión |

---

### 4.2.6 Runtime State

**Propósito:** Representar el estado vivo de la ejecución actual. Es el único estado del Blackboard que **no debe persistirse** entre ejecuciones. Contiene el plan activo, la cola de herramientas, los errores, warnings y el progreso del pipeline.

**Ciclo de vida:** Se crea al recibir un nuevo goal, se actualiza constantemente durante la ejecución, y se destruye al finalizar el goal.

```
RuntimeState {
  runtime: {
    startedAt: string,
    updatedAt: string,
    mode: 'full' | 'deterministic' | 'readonly',
    pipelineId: string,
    executionId: string
  },
  currentGoal: {
    id: string,
    text: string,
    type: 'analyze' | 'optimize' | 'publish' | 'simulate' | 'custom',
    priority: 'low' | 'medium' | 'high',
    status: 'pending' | 'active' | 'completed' | 'failed',
    createdAt: string
  },
  activePlan: {
    id: string,
    intent: string,
    tasks: [{
      id: string,
      description: string,
      engine: string,
      dependsOn: string[],
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
      startedAt: string | null,
      completedAt: string | null
    }],
    requiresLLM: boolean,
    llmPhase: 'not_needed' | 'pending' | 'running' | 'completed' | 'failed'
  },
  toolQueue: [{
    id: string,
    name: string,
    parameters: object,
    status: 'queued' | 'running' | 'completed' | 'failed',
    retryCount: number,
    maxRetries: number,
    timeout: number,
    startedAt: string | null,
    completedAt: string | null,
    error: string | null
  }],
  executedTools: [{
    id: string,
    name: string,
    durationMs: number,
    success: boolean,
    output: any,
    error: string | null,
    compensated: boolean,
    compensatedBy: string | null
  }],
  currentStep: {
    phase: 'planning' | 'reasoning' | 'scoring' | 'deciding' | 'waiting_llm' | 'executing' | 'patching' | 'evaluating' | 'persisting',
    startedAt: string,
    progress: number  // 0-100
  },
  errors: [{
    source: string,
    message: string,
    severity: 'warning' | 'error' | 'critical',
    timestamp: string,
    recoverable: boolean,
    recovered: boolean | null
  }],
  warnings: [{
    source: string,
    message: string,
    code: string,
    timestamp: string,
    dismissed: boolean
  }],
  retryCount: {
    total: number,
    byTool: Record<string, number>,
    maxReached: boolean
  }
}
```

**Quién escribe:**

| Sección | Escritor | ¿Cuándo? |
|---------|----------|----------|
| `runtime` | Pipeline inicializador | Al inicio del goal |
| `currentGoal` | Planner (vía State Manager) | Al recibir el goal |
| `activePlan` | Planner (vía State Manager) | Después de planificar |
| `toolQueue` | Tool Planner (vía State Manager) | Después de planificar tools |
| `executedTools` | Execution Engine (vía State Manager) | Después de cada tool |
| `currentStep` | Cada motor (vía State Manager) | Al iniciar/completar cada fase |
| `errors` | Cualquier motor (vía State Manager) | Cuando ocurre un error |
| `warnings` | Cualquier motor (vía State Manager) | Cuando se genera un warning |
| `retryCount` | Execution Engine (vía State Manager) | En cada reintento |

**Regla de persistencia:** Runtime State **nunca se persiste** en base de datos. Es el único estado del Blackboard que vive exclusivamente en memoria y se destruye al finalizar el goal. Si el sistema se reinicia durante una ejecución, el goal debe reiniciarse desde el principio.

---

## 4.3 Reglas del Blackboard

### R1 — Único escritor

**Solo el State Manager puede modificar el Blackboard.**

Ningún motor, servicio o componente tiene permiso de escritura directa sobre el Blackboard. Cuando un motor necesita actualizar el estado, debe enviar un `PatchRequest` al State Manager y esperar su validación.

```
// ❌ VIOLACIÓN — Escritura directa
blackboard.launch.status.current = 'approved';

// ✅ CORRECTO — A través de State Manager
stateManager.apply({
  patches: [{ op: 'replace', path: '/launch/status/current', value: 'approved' }],
  source: 'DecisionEngine',
  goalId: currentGoal.id
});
```

### R2 — JSON Patch obligatorio

Toda modificación al Blackboard debe realizarse mediante **JSON Patch (RFC 6902)**. No se permiten asignaciones directas ni mutaciones in-place.

Operaciones soportadas:

| Operación | Uso |
|-----------|-----|
| `add` | Agregar un nuevo campo o elemento a un array |
| `remove` | Eliminar un campo o elemento |
| `replace` | Reemplazar el valor de un campo existente |
| `move` | Mover un valor de una ruta a otra |
| `copy` | Copiar un valor de una ruta a otra |
| `test` | Validar que un valor existe antes de modificarlo |

### R3 — Versionado incremental

Cada cambio exitoso al Blackboard incrementa un contador de versión global. La versión se incluye en cada evento y en cada snapshot.

```
BlackboardVersion {
  major: number,   // Cambios estructurales (agregar/quitar secciones)
  minor: number,   // Cambios de contenido significativos
  patch: number    // Cambios menores o correcciones
}
```

### R4 — Trazabilidad total

Cada cambio al Blackboard debe incluir:

- **Timestamp** preciso (ISO 8601)
- **Origen** (componente que solicita el cambio)
- **Goal ID** (contexto de la ejecución)
- **Descripción** legible del cambio
- **Parches aplicados** (lista completa de JSON Patches)

### R5 — Eventos por cada cambio

Cada mutación exitosa debe emitir un evento `BLACKBOARD_UPDATED` con el snapshot parcial y la metadata del cambio. Esto permite:

- Notificar en tiempo real al Review Workspace
- Alimentar el Event Bus para audit logging
- Permitir que otros componentes reaccionen al cambio (ej: Quality Evaluator tras un patch)

### R6 — Consistencia de lectura

En cualquier momento del pipeline, si dos motores leen la misma ruta del Blackboard, deben recibir el mismo valor. No se permiten lecturas inconsistentes ni estados intermedios visibles.

**Implementación:** El Blackboard procesa las escrituras de forma síncrona y no expone el estado hasta que la mutación se ha completado y versionado.

### R7 — Sin mutaciones concurrentes

El State Manager debe serializar todas las solicitudes de patch. No pueden existir dos mutaciones simultáneas sobre el Blackboard. Si dos motores intentan escribir al mismo tiempo, el segundo debe esperar a que el primero complete.

**Excepción:** Si los patches afectan rutas completamente distintas (ej: `/launch/blueprint` y `/market/competitors`), pueden ejecutarse en paralelo. El State Manager determina esto mediante análisis de prefijos de ruta.

### R8 — Rollback de estado

Si una herramienta falla y el Rollback Manager decide compensar, debe poder revertir los cambios al estado anterior usando los propios JSON Patches (aplicando las operaciones inversas).

---

## 4.4 Ciclo de Vida del Blackboard

El Blackboard evoluciona a través de etapas claras durante la resolución de un goal. Cada etapa agrega información, transforma el estado y prepara el terreno para la siguiente.

```
Goal recibido
     │
     ▼
┌─────────────────────────────────────────────┐
│ 1. BLACKBOARD INICIAL                        │
│                                              │
│ Se cargan los datos base:                    │
│ • ProductState desde DB/Dropi                │
│ • BusinessState desde config del tenant      │
│ • MarketState desde Hunter                   │
│ • UserState desde sesión                     │
│ • RuntimeState vacío listo para ejecución    │
│ • LaunchState mínimo (id, status)            │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 2. PLANNING                                  │
│                                              │
│ Planner escribe:                             │
│ • RuntimeState.currentGoal                   │
│ • RuntimeState.activePlan (tasks, orden)     │
│ • LaunchState.status → 'analyzing'           │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 3. REASONING                                 │
│                                              │
│ Reasoning Engine escribe:                    │
│ • ProductState.pricing (margen, minPrice)    │
│ • ProductState.logistics (costos, fragilidad)│
│ • MarketState.pricing (posición competitiva) │
│ • LaunchState.score.blockers (si aplica)     │
│ • LaunchState.status → blocked? o continúa   │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 4. SCORING                                   │
│                                              │
│ Scoring Engine escribe:                      │
│ • LaunchState.score (overall, dimensions)    │
│ • LaunchState.confidence (current, initial)  │
│ • LaunchState.confidence.grade               │
│ • LaunchState.score.isLaunchReady            │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 5. RECOMMENDATION + SIMULATION               │
│                                              │
│ Recommendation Engine escribe:               │
│ • LaunchState.recommendations (pending)      │
│                                              │
│ Simulator escribe:                           │
│ • LaunchState.simulations (executed, best)   │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 6. DECISION                                  │
│                                              │
│ Decision Engine escribe:                     │
│ • RuntimeState.currentStep → 'deciding'      │
│ • LaunchState.status → 'optimizing'          │
│ • (si aplica) Plan de ejecución final        │
│ • (si aplica) NeedLLM flag                   │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 7. EXECUTION                                 │
│                                              │
│ Execution Engine escribe:                    │
│ • RuntimeState.toolQueue (cada tool)         │
│ • RuntimeState.executedTools (resultados)    │
│ • LaunchState.blueprint (patches aplicados)  │
│ • LaunchState.offer (si se optimizó)         │
│ • LaunchState.copies (si se generaron)       │
│ • LaunchState.seo (si se optimizó)           │
│ • LaunchState.landing (si se construyó)      │
│ • RuntimeState.errors/warnings (si falla)    │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 8. QUALITY EVALUATION                        │
│                                              │
│ Quality Evaluator escribe:                   │
│ • LaunchState.status → 'review' o 'failed'   │
│ • RuntimeState.currentStep → 'evaluating'    │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 9. MEMORY + PERSISTENCE                      │
│                                              │
│ Memory Manager escribe:                      │
│ • Persiste en Memory Store lo necesario      │
│ • Actualiza UserState si aprendió algo nuevo │
│                                              │
│ State Manager escribe:                       │
│ • LaunchState.versions (versión final)       │
│ • LaunchState.status → 'review' o 'approved' │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ 10. BLACKBOARD FINAL                         │
│                                              │
│ El Blackboard contiene:                      │
│ • ProductState completo con análisis         │
│ • LaunchState con blueprint, scores, recs    │
│ • MarketState con contexto competitivo       │
│ • RuntimeState con trazabilidad total        │
│ • UserState actualizado con aprendizaje      │
│                                              │
│ El Blackboard se entrega a:                  │
│ • Review Workspace (renderizado al usuario)  │
│ • Event Bus (eventos de finalización)        │
│ • Memory Store (persistencia selectiva)      │
└─────────────────────────────────────────────┘
     │
     ▼
         BLACKBOARD DESTRUIDO
         (tras finalizar el goal)
```

### Estados posibles del Blackboard

| Estado | Significado |
|--------|-------------|
| `initializing` | Carga de datos base en progreso |
| `planning` | Planner trabajando en el plan |
| `reasoning` | Reasoning Engine analizando |
| `scoring` | Scoring Engine calculando |
| `recommending` | Recommendation Engine procesando |
| `simulating` | Scenario Simulator ejecutando |
| `deciding` | Decision Engine tomando decisiones |
| `waiting_llm` | Esperando respuesta del Inference Router |
| `executing` | Execution Engine ejecutando tools |
| `evaluating` | Quality Evaluator validando |
| `persisting` | Memory Manager guardando |
| `completed` | Goal completado exitosamente |
| `failed` | Goal falló irrecuperablemente |
| `blocked` | Goal bloqueado por Policy Engine |

---

## 4.5 Contratos

### 4.5.1 Blackboard

Estructura completa del Blackboard como se expone a los motores.

```
Blackboard {
  // Versión actual para control de concurrencia
  version: BlackboardVersion,

  // Timestamp de la última modificación
  updatedAt: string,

  // Goal asociado a esta instancia del Blackboard
  goalId: string,

  // Estados del dominio
  product: ProductState,
  business: BusinessState,
  launch: LaunchState,
  market: MarketState,
  user: UserState,
  runtime: RuntimeState,

  // Metadata de auditoría
  audit: {
    changes: BlackboardPatch[],
    lastReadBy: string[],
    lastWrittenBy: string
  }
}
```

### 4.5.2 BlackboardVersion

```
BlackboardVersion {
  major: number,      // Incrementa con cambios estructurales
  minor: number,      // Incrementa con cambios de contenido
  patch: number,      // Incrementa con correcciones

  // Representación string para comparación rápida
  toString(): string  // ej: "2.14.3"
}
```

Reglas de versionado:

| Cambio | major | minor | patch |
|--------|-------|-------|-------|
| Nueva sección agregada | +1 | 0 | 0 |
| Sección eliminada | +1 | 0 | 0 |
| Nuevo campo obligatorio | +1 | 0 | 0 |
| Nuevo campo opcional | 0 | +1 | 0 |
| Valor de campo cambiado | 0 | 0 | +1 |
| Corrección de typo en valor | 0 | 0 | +1 |

### 4.5.3 BlackboardPatch

Registro de un cambio atómico al Blackboard.

```
BlackboardPatch {
  id: string,                    // UUID del cambio
  goalId: string,                // Contexto del goal
  source: string,                // Componente que originó el cambio
  timestamp: string,             // ISO 8601
  version: BlackboardVersion,    // Versión resultante

  // JSON Patches aplicados
  patches: [{
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test',
    path: string,                // Ruta en notación JSON Pointer
    value?: any,                 // Valor (para add/replace)
    from?: string                // Ruta origen (para move/copy)
  }],

  // Metadata
  description: string,           // Descripción legible del cambio
  durationMs: number,            // Tiempo de procesamiento
  conflicts: string[] | null,    // Conflictos detectados (si los hay)
  rolledBack: boolean,           // ¿Fue revertido?
  rolledBackBy: string | null    // Patch ID que lo revirtió
}
```

### 4.5.4 BlackboardDiff

Diferencia entre dos versiones del Blackboard. Útil para auditoría, rollback y renderizado en el Review Workspace.

```
BlackboardDiff {
  fromVersion: BlackboardVersion,
  toVersion: BlackboardVersion,
  fromTimestamp: string,
  toTimestamp: string,

  // Diferencias agrupadas por sección
  sections: {
    [section: string]: {
      added: string[],        // Campos nuevos
      removed: string[],      // Campos eliminados
      modified: [{            // Campos modificados
        path: string,
        oldValue: any,
        newValue: any
      }]
    }
  },

  // Resumen ejecutivo del diff
  summary: {
    totalChanges: number,
    sectionsAffected: string[],
    criticalChanges: string[],  // Cambios en paths críticos
    isSignificant: boolean      // ¿Requiere atención del usuario?
  }
}
```

### 4.5.5 BlackboardSnapshot

Snapshot completo del Blackboard en un punto específico del tiempo.

```
BlackboardSnapshot {
  id: string,                    // UUID del snapshot
  goalId: string,
  timestamp: string,
  version: BlackboardVersion,
  phase: string,                 // Fase del pipeline en que se tomó

  // Estado completo (todos los 6 estados)
  data: Blackboard,

  // Metadata
  size: number,                  // Tamaño aproximado en bytes
  createdBy: string,             // Componente que solicitó el snapshot
  reason: string,                // Por qué se tomó el snapshot
  parentSnapshotId: string | null, // Snapshot anterior (si aplica)
  tags: string[]                 // Tags para búsqueda (ej: ["pre-execution", "post-scoring"])
}
```

**¿Cuándo se toman snapshots?**

| Momento | Razón |
|---------|-------|
| Al inicio del goal | Línea base para comparación |
| Antes de ejecutar una tool | Punto de restauración para rollback |
| Después de cada fase del pipeline | Trazabilidad progresiva |
| Antes de llamar al LLM | Contexto para el proveedor |
| Después de recibir respuesta del LLM | Comparación pre/post generación |
| Al finalizar el goal | Estado final completo |
| En caso de error | Diagnóstico |

---

## 4.6 Persistencia

No todo el Blackboard debe persistirse entre goals. Distinguir entre estado **persistente** y **temporal** es fundamental para evitar convertir el Blackboard en un duplicado de la base de datos.

### Estado Persistente

Este sí debe guardarse en base de datos (a través de Memory Store) porque representa información que trasciende un goal.

| Sección | Subsección | ¿Qué se persiste? | Store | TTL |
|---------|-----------|-------------------|-------|-----|
| **LaunchState** | `blueprint` | Blueprint completo | Memory Store (Launch) | ∞ |
| **LaunchState** | `confidence` | Historial de confidence | Memory Store (Launch) | ∞ |
| **LaunchState** | `score` | Score final del launch | Memory Store (Launch) | ∞ |
| **LaunchState** | `versions` | Historial de versiones | Memory Store (Launch) | ∞ |
| **LaunchState** | `status` | Estado final del launch | DB (launches table) | ∞ |
| **MarketState** | `competitors` | Datos competitivos | Memory Store (Market) | 7d |
| **MarketState** | `pricing` | Análisis de pricing | Memory Store (Market) | 7d |
| **MarketState** | `trends` | Tendencias del mercado | Memory Store (Market) | 24h |
| **UserState** | `preferences` | Preferencias del usuario | Memory Store (User) | ∞ |
| **UserState** | `writingStyle` | Estilo de escritura aprendido | Memory Store (User) | ∞ |
| **UserState** | `approvalHistory` | Historial de aprobaciones | Memory Store (User) | 90d |
| **UserState** | `manualEdits` | Ediciones manuales | Memory Store (User) | 90d |
| **UserState** | `ignoredRecommendations` | Recomendaciones ignoradas | Memory Store (User) | 90d |
| **ProductState** | `product` | Datos del producto | DB (products table) | ∞ |

### Estado Temporal

Este **nunca debe persistirse**. Solo existe durante la ejecución del goal.

| Sección | Subsección | ¿Por qué no se persiste? |
|---------|-----------|-------------------------|
| **RuntimeState** | *Todo* | Es el estado vivo de la ejecución. Al terminar el goal, se destruye. |
| **LaunchState** | `recommendations.pending` | Son recomendaciones no procesadas. Pierden validez tras el goal. |
| **LaunchState** | `simulations` | Son cálculos "what-if". No tienen valor persistido. |
| **ProductState** | `pricing` | Se recalcula en cada goal. Persistir es redundante. |
| **ProductState** | `logistics` | Se recalcula en cada goal. Persistir es redundante. |
| **BusinessState** | `providerHealth` | Es información en tiempo real. Persistirla la vuelve obsoleta. |
| **BusinessState** | `tokenBudget.usedToday` | Se resetea diariamente. La DB es la fuente de verdad. |
| **MarketState** | `seasonality` | Depende del momento. Persistirla es engañoso. |

### Reglas de persistencia

1. **Runtime State nunca se persiste.** Es el contrato más importante. Si el sistema se reinicia, el goal se reinicia.

2. **Blueprints se persisten siempre.** Son la única fuente de verdad del lanzamiento y deben sobrevivir a cualquier reinicio.

3. **Preferencias de usuario se persisten con TTL ∞.** Reflejan decisiones explícitas del usuario.

4. **Datos de mercado tienen TTL corto.** La información competitiva caduca rápidamente.

5. **Simulaciones y recomendaciones pendientes no se persisten.** Solo se persisten las recomendaciones aplicadas (como parte del blueprint).

6. **El Blackboard completo no se persiste como blob.** Cada sección se persiste en su store correspondiente. No hay un "dump" del Blackboard.

---

## 4.7 Principio Fundamental

> **El Blackboard representa el estado compartido del razonamiento, no la base de datos del negocio.**

Este principio debe guiar cada decisión de diseño sobre el Blackboard.

### Errores comunes que este principio previene

| Error | Por qué es peligroso |
|-------|---------------------|
| **Convertir el Blackboard en un espejo de PostgreSQL** | Si el Blackboard duplica tablas de la DB, crece sin control, se vuelve inconsistente y su mantenimiento duplica el esfuerzo. |
| **Persistir todo el Blackboard como JSON blob** | Impide consultas, versionado granular y auditoría. Es una trampa de "simplicidad" que se paga caro después. |
| **Poner reglas de negocio en el Blackboard** | El Blackboard es estado, no lógica. Las reglas de negocio viven en los motores, no en el contexto. |
| **Usar el Blackboard como caché de la DB** | Si un dato está en la DB, no se duplica en el Blackboard. Se referencia, no se copia. |
| **Hacer que los motores dependan de paths específicos** | Los motores leen del Blackboard, pero no deben hardcodear rutas. El acceso debe ser a través de getters/setters semanticos. |

### Señales de que el Blackboard está mal diseñado

- El Blackboard pesa más de 1MB en una ejecución típica
- Hay más de 3 niveles de anidamiento en las rutas
- Los motores necesitan leer 10+ paths para hacer su trabajo
- El Blackboard contiene datos que no se usan en el goal actual
- Existen dos formas de representar la misma información
- Un cambio en la DB requiere un cambio en la estructura del Blackboard

### Señales de que el Blackboard está bien diseñado

- El Blackboard pesa menos de 100KB en una ejecución típica
- Cada motor necesita exactamente los datos que necesita, ni más ni menos
- Las rutas son planas (máximo 3 niveles: `/launch/blueprint/title`)
- Agregar un nuevo motor no requiere cambiar la estructura del Blackboard
- El Blackboard se puede inspeccionar visualmente en el Review Workspace
- No hay datos duplicados entre el Blackboard y la base de datos

---

*Fin del Capítulo 4 — Continuará con Capítulo 5: Decision Engine v3*
