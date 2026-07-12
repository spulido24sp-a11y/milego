import { ConversionScorer } from './conversion-scorer.js';

const scorer = new ConversionScorer();

export function getConversionScore(product, blueprint, extra = {}) {
  return scorer.score(product, blueprint, extra);
}

export function formatScoreReport(scoreResult) {
  return scorer.formatReport(scoreResult);
}
