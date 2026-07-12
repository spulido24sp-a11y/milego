export class Validator {
  /**
   * Validates standard MIleGo internal contract for commercial safety.
   * @param {Object} normalizedData 
   * @returns {boolean} True if passes validation, throws otherwise
   */
  validate(normalizedData) {
    if (!normalizedData) {
      throw new Error('Estructura de producto normalizado vacía');
    }

    const errors = [];

    if (!normalizedData.name?.trim()) errors.push('El nombre del producto es obligatorio');
    if (!normalizedData.sku_base?.trim()) errors.push('El SKU base es obligatorio');
    if (!normalizedData.slug?.trim()) errors.push('El slug URL es obligatorio');
    
    // Check pricing structures
    const info = normalizedData.supplier_info;
    if (!info) {
      errors.push('Información del proveedor (supplier_info) ausente');
    } else {
      if (typeof info.wholesale_price !== 'number' || info.wholesale_price < 0) {
        errors.push('Costo del proveedor inválido o menor a 0');
      }
      if (typeof info.suggested_retail_price !== 'number' || info.suggested_retail_price < 0) {
        errors.push('Precio de venta sugerido inválido o menor a 0');
      }
      if (info.suggested_retail_price < info.wholesale_price) {
        errors.push('Alerta: El precio sugerido de venta es inferior al costo del proveedor');
      }
      if (typeof info.stock_available !== 'number' || info.stock_available < 0) {
        errors.push('El stock reportado del proveedor no es un número válido');
      }
    }

    if (errors.length > 0) {
      throw Object.assign(new Error(`Falló la validación del Launch Engine: ${errors.join(', ')}`), {
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        details: errors
      });
    }

    return true;
  }
}
