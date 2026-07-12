import { BaseProvider } from './base.provider.js';

export class ClaudeProvider extends BaseProvider {
  async generateText(prompt) {
    // Interface ready for Sprint 3 Claude integration
    return JSON.stringify({
      provider: 'claude',
      message: 'Real Anthropic Claude API call placeholder. Use MockProvider for now.'
    });
  }
}
