export class PerformanceAi {
  /**
   * Evaluates telemetry inputs (ROAS, CTR) to emit recommendations.
   * @param {Object} metrics 
   * @returns {Object} Action trace
   */
  evaluatePerformance(metrics) {
    const roas = parseFloat(metrics.roas || 0);
    const ctr = parseFloat(metrics.ctr || 0);

    let action = 'maintain';
    let reasoning = 'Métricas estables dentro del rango esperado.';

    if (roas > 3.0 && ctr > 2.0) {
      action = 'scale';
      reasoning = 'ROAS alto y CTR óptimo. Recomiendo aumentar el presupuesto publicitario en Meta Ads.';
    } else if (roas < 1.5 || ctr < 1.0) {
      action = 'optimize';
      reasoning = 'Conversión o CTR por debajo de lo esperado. Recomiendo refrescar creativos.';
    }

    return {
      action,
      reasoning,
      analyzed_at: new Date()
    };
  }
}
