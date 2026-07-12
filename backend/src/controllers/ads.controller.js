import db from '../config/database.js';
import { AdCreator } from '../brain/ads/ad-creator.js';
import { success } from '../utils/response.js';

const adCreator = new AdCreator();

export class AdsController {
  async generateAds(req, res, next) {
    try {
      const product = await db('products').where('id', parseInt(req.params.id, 10)).first();
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });

      const bp = product.launch_blueprint || {};
      const result = adCreator.generate(product, bp);

      return success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
