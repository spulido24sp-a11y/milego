export class Workflow {
  /**
   * Constructs a declaratively defined Workflow.
   * @param {string} name 
   */
  constructor(name) {
    this.name = name;
    this.steps = [];
  }

  /**
   * Adds an execution step to the workflow.
   * @param {string} stepName 
   * @param {Function} executeFn 
   * @param {Object} [options={}] 
   */
  addStep(stepName, executeFn, options = {}) {
    this.steps.push({ stepName, executeFn, options });
    return this;
  }

  /**
   * Runs the workflow step-by-step.
   * @param {Object} input 
   * @param {string} [correlationId=null] 
   * @returns {Promise<Object>} Execution report
   */
  async run(input, correlationId = null) {
    let context = { ...input };
    const stepLogs = [];
    const workflowStart = Date.now();

    console.log(`[Workflow Engine] Starting workflow '${this.name}' with correlation ID: ${correlationId}`);

    for (const step of this.steps) {
      const stepStart = Date.now();
      let attempts = 0;
      const maxAttempts = step.options.maxAttempts || 3;
      let stepSuccess = false;
      let error = null;

      while (attempts < maxAttempts && !stepSuccess) {
        attempts++;
        try {
          context = await step.executeFn(context);
          stepSuccess = true;
        } catch (err) {
          error = err;
          if (step.options.retryDelayMs) {
            await new Promise(resolve => setTimeout(resolve, step.options.retryDelayMs));
          }
        }
      }

      const durationMs = Date.now() - stepStart;
      stepLogs.push({
        step_name: step.stepName,
        success: stepSuccess,
        attempts,
        duration_ms: durationMs,
        error: error ? error.message : null
      });

      if (!stepSuccess) {
        console.error(`[Workflow Engine] Workflow '${this.name}' failed at step '${step.stepName}'`);
        throw new Error(`Step '${step.stepName}' failed: ${error.message}`);
      }
    }

    const totalDuration = Date.now() - workflowStart;
    console.log(`[Workflow Engine] Completed workflow '${this.name}' successfully in ${totalDuration}ms`);

    return {
      success: true,
      workflow_name: this.name,
      correlation_id: correlationId,
      duration_ms: totalDuration,
      step_logs: stepLogs,
      result: context
    };
  }
}
