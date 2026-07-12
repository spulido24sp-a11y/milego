export class BaseProvider {
  /**
   * Generates text/analysis from the AI LLM model.
   * @param {string} prompt 
   * @returns {Promise<string>} LLM Response
   */
  async generateText(prompt) {
    throw new Error('generateText method must be implemented');
  }
}
