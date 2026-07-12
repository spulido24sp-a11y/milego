import db from '../../config/database.js';
import { WorldScanner } from './scanner.js';

const scanner = new WorldScanner();

export class OpportunityHunter {
  /**
   * Scans external sources to discover and qualify new products.
   * @param {string} [source='mock'] 
   * @returns {Promise<Object[]>} List of newly qualified market opportunities
   */
  async huntOpportunities(source = 'mock') {
    const rawItems = await scanner.scan(source);
    const qualified = [];

    for (const item of rawItems) {
      // Qualify: margins >= 40% are qualified
      const isQualified = item.margin >= 40;
      
      const [inserted] = await db('market_opportunities')
        .insert({
          source,
          external_sku: item.external_sku,
          name: item.name,
          estimated_margin: item.margin,
          trend_status: item.trend,
          hunter_decision: isQualified ? 'qualified' : 'ignored'
        })
        .returning('*');

      if (isQualified) qualified.push(inserted);
    }

    return qualified;
  }
}
