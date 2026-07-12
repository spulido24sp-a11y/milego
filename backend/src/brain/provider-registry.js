import { MockProvider } from './providers/mock.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { ClaudeProvider } from './providers/claude.provider.js';

/**
 * Registro dinámico de proveedores de IA.
 *
 * Resuelve el hallazgo P1/P2 de PROJECT_AUDIT.md:
 * "Open/Closed Principle (OCP): El ProviderRouter está forzado a importar
 * manualmente cada clase de proveedor. Debería usar registro dinámico para
 * permitir añadir proveedores (ej. Grok, DeepSeek) sin tocar el archivo
 * del enrutador."
 *
 * Para añadir un nuevo proveedor (ej. Grok, DeepSeek) en el futuro:
 *   1. Crear src/brain/providers/<nombre>.provider.js extendiendo BaseProvider.
 *   2. Llamar registerProvider('<nombre>', new NuevoProvider()) una vez,
 *      típicamente en este mismo archivo o en un bootstrap de arranque.
 * El ProviderRouter nunca necesita modificarse.
 */
const registry = new Map();

export function registerProvider(name, instance) {
  registry.set(name.toLowerCase(), instance);
}

export function getProvider(name) {
  return registry.get(name.toLowerCase()) || null;
}

export function listProviders() {
  return Array.from(registry.keys());
}

// Bootstrap de los proveedores conocidos hoy. Añadir nuevos proveedores
// aquí (o desde cualquier módulo de arranque) sin tocar provider-router.js.
registerProvider('mock', new MockProvider());
registerProvider('openai', new OpenAIProvider());
registerProvider('gemini', new GeminiProvider());
registerProvider('claude', new ClaudeProvider());
