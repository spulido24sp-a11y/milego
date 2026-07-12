import db from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptRegistryService {
  /**
   * Resolves a prompt template by name.
   * Cays back to reading the markdown prompt files locally if not found in db.
   * @param {string} name 
   * @param {string} [version=null] Specific version (optional)
   * @returns {Promise<Object>} Prompt details containing version, template, temperature, schema_version, provider
   */
  async resolvePrompt(name, version = null) {
    let query = db('prompt_registry').where({ name, is_active: true });
    if (version) {
      query = query.where({ version });
    }
    
    const registryEntry = await query.orderBy('created_at', 'desc').first();

    if (registryEntry) {
      return {
        name: registryEntry.name,
        version: registryEntry.version,
        template: registryEntry.prompt_template,
        schema_version: registryEntry.schema_version,
        temperature: parseFloat(registryEntry.temperature),
        provider: registryEntry.provider
      };
    }

    // Fallback: Read file locally
    const localPath = path.join(__dirname, 'prompts', `${name}.md`);
    let template = `Dado el producto {{name}}, analiza viabilidad.`;
    try {
      if (fs.existsSync(localPath)) {
        template = fs.readFileSync(localPath, 'utf-8');
      }
    } catch (err) {
      console.warn(`[Prompt Registry] Local prompt file ${name}.md fallback read failed:`, err.message);
    }

    return {
      name,
      version: '1.0.0-file',
      template,
      schema_version: '1.0.0-zod',
      temperature: 0.7,
      provider: 'mock'
    };
  }

  /**
   * Registers a new prompt version in the database.
   */
  async registerPrompt({ name, version, template, schemaVersion, temperature = 0.7, provider = 'gemini' }) {
    // Deactivate previous active version of this prompt name
    await db('prompt_registry').where({ name }).update({ is_active: false });

    const [inserted] = await db('prompt_registry').insert({
      name,
      version,
      prompt_template: template,
      schema_version: schemaVersion,
      temperature,
      provider,
      is_active: true
    }).returning('*');

    return inserted;
  }
}
