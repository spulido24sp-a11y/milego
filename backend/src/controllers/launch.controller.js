import db from '../config/database.js';
import { success } from '../utils/response.js';
import { publishLanding } from '../landing/publisher.js';

export class LaunchController {
  /**
   * GET /api/v1/launches/:id/review
   * Returns complete product and its launch blueprint along with edit history.
   */
  async getReview(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      // Fetch versions history
      const history = await db('launch_versions')
        .where({ product_id: id })
        .orderBy('version', 'desc')
        .select('version', 'created_at');

      return success(res, {
        product,
        history
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/launches/:id/review
   * Updates only a specific section of the launch blueprint and saves version history.
   */
  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;
      const { section, data } = req.body;

      if (!section || !data) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Seccion y datos son requeridos' } });
      }

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      const currentBlueprint = product.launch_blueprint || {};
      
      // Update target section (OfferBuilder Phase 5: Margins check)
      if (section === 'offer') {
        const cost = data.price_cost || currentBlueprint.offer?.price_cost || 0;
        const price = data.price_unit || currentBlueprint.offer?.price_unit || 0;
        if (price < cost) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_OFFER', message: 'El precio sugerido no puede ser menor al costo del proveedor' }
          });
        }
      }

      currentBlueprint[section] = data;

      // Increment version number
      const lastVersion = await db('launch_versions')
        .where({ product_id: id })
        .orderBy('version', 'desc')
        .first();
      
      const newVersion = (lastVersion?.version || 0) + 1;

      // Update product launch blueprint and insert version snapshot
      await db.transaction(async (trx) => {
        await trx('products').where({ id }).update({
          launch_blueprint: currentBlueprint,
          updated_at: new Date()
        });

        await trx('launch_versions').insert({
          product_id: id,
          version: newVersion,
          blueprint: currentBlueprint
        });
      });

      return success(res, {
        product: { ...product, launch_blueprint: currentBlueprint },
        version: newVersion
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/launches/:id/regenerate
   * Regenerates a single section of the blueprint using LIAM intelligence.
   */
  async regenerateSection(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;
      const { section } = req.body;

      if (!section) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'section is required' } });
      }

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      const currentBlueprint = product.launch_blueprint || {};
      
      // LIAM Brain section re-evaluation simulation/trigger
      if (section === 'seo') {
        currentBlueprint.seo = {
          title: `${product.name} - La mejor oferta del mercado hoy`,
          slug: product.slug,
          keywords: ['oferta', 'envio gratis', product.name.toLowerCase()]
        };
      } else if (section === 'marketing') {
        currentBlueprint.marketing = {
          hooks: [
            `¿Cansado de buscar? Compra ${product.name} con 50% de descuento.`,
            'Envío totalmente gratis y pagas al recibir.'
          ],
          ugc_angles: [
            'Persona sorprendida abriendo el paquete.',
            'Review honesto del producto.'
          ]
        };
      } else if (section === 'content') {
        currentBlueprint.content = {
          faq: [
            { question: '¿Tiene garantía?', answer: 'Sí, cuenta con 30 días de garantía total.' }
          ],
          whatsapp_template: `Hola, quiero confirmar el despacho del producto ${product.name}.`
        };
      }

      // Increment version number and save changes
      const lastVersion = await db('launch_versions')
        .where({ product_id: id })
        .orderBy('version', 'desc')
        .first();
      
      const newVersion = (lastVersion?.version || 0) + 1;

      await db.transaction(async (trx) => {
        await trx('products').where({ id }).update({
          launch_blueprint: currentBlueprint,
          updated_at: new Date()
        });

        await trx('launch_versions').insert({
          product_id: id,
          version: newVersion,
          blueprint: currentBlueprint
        });
      });

      return success(res, {
        product: { ...product, launch_blueprint: currentBlueprint },
        section: currentBlueprint[section]
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/launches/:id/approve
   * Approves the launch blueprint, changing status from draft/review to approved.
   */
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      await db('products').where({ id }).update({
        status: 'approved',
        updated_at: new Date()
      });

      return success(res, {
        message: 'Lanzamiento aprobado con éxito para publicación',
        status: 'approved'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/launches/:id/reject
   * Rejects the launch blueprint, changing status to draft.
   */
  async reject(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      await db('products').where({ id }).update({
        status: 'draft',
        updated_at: new Date()
      });

      return success(res, {
        message: 'Lanzamiento retornado a borrador',
        status: 'draft'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/launches/:id/publish
   * Genera landing HTML desde el blueprint, guarda versión y publica.
   */
  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });
      }

      const result = await publishLanding(Number(id));

      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/launches/:id/theme
   * Changes the active theme on the launch blueprint.
   */
  async updateTheme(req, res, next) {
    try {
      const { id } = req.params;
      const storeId = req.tenant.storeId;
      const { theme } = req.body;

      if (!theme) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'El campo theme es requerido.' } });
      }

      const product = await db('products').where({ id, store_id: storeId }).first();
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lanzamiento no encontrado' } });
      }

      const bp = product.launch_blueprint || {};
      bp.theme = theme;

      // Update in db
      await db('products').where({ id }).update({
        launch_blueprint: JSON.stringify(bp),
        updated_at: new Date()
      });

      // Save a new audit history version
      const nextVersion = (await db('launch_versions').where({ product_id: id }).max('version as maxV').first())?.maxV + 1 || 1;
      await db('launch_versions').insert({
        product_id: id,
        version: nextVersion,
        blueprint: JSON.stringify(bp),
        created_at: new Date()
      });

      return success(res, {
        message: 'Tema de la plantilla actualizado con éxito.',
        theme,
        version: nextVersion
      });
    } catch (err) {
      next(err);
    }
  }
}
