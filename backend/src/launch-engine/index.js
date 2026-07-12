import { createLaunchWorkflow } from '../workflow/launch-workflow.js';

export class LaunchEngine {
  /**
   * Orchestrates the complete product launch pipeline using the Workflow Engine.
   * @param {string} providerName 
   * @param {Object} rawData 
   * @returns {Promise<Object>} Complete launched product profile
   */
  async process(providerName, rawData) {
    const workflow = createLaunchWorkflow();
    const execution = await workflow.run({ providerName, rawData });
    return execution.result.completeProfile;
  }
}
