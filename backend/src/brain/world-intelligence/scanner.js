export class WorldScanner {
  constructor() {
    this.adapters = {
      mock: {
        scan: async () => [
          { external_sku: 'OPP-ORTHO-01', name: 'Almohada Ortopédica Cervical', margin: 58.00, trend: 'rising' },
          { external_sku: 'OPP-MASSAGE-02', name: 'Pistola de Masaje Pro', margin: 48.00, trend: 'rising' },
          { external_sku: 'OPP-ROD-03', name: 'Rodillera de Compresión', margin: 38.00, trend: 'stable' }
        ]
      }
    };
  }

  /**
   * Register a new marketplace scanner adapter.
   * @param {string} name 
   * @param {Object} adapter 
   */
  registerAdapter(name, adapter) {
    this.adapters[name.toLowerCase()] = adapter;
  }

  /**
   * Scans a target source.
   * @param {string} [source='mock'] 
   * @returns {Promise<Object[]>} Discovered products list
   */
  async scan(source = 'mock') {
    const adapter = this.adapters[source.toLowerCase()];
    if (!adapter) {
      throw new Error(`Adaptador de scanner de mundo no soportado: ${source}`);
    }
    return adapter.scan();
  }
}
