import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { DropiMapper } from '../integrations/dropi/mapper.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('Dropi API Contract Mapping Tests', () => {

  it('should map the official dropi-product.json sample payload correctly', () => {
    // Read the contract file
    const rawPayload = JSON.parse(readFileSync(`${__dirname}../integrations/dropi/samples/dropi-product.json`, 'utf8'));
    
    // Map to internal model
    const mapped = DropiMapper.mapProduct(rawPayload);

    // Assert mapping matches expectations
    expect(mapped.provider_product_id).toBe('14166');
    expect(mapped.name).toBe('Corrector de Postura Inteligente');
    expect(mapped.wholesale_price).toBe(25000.00);
    expect(mapped.suggested_retail_price).toBe(79900.00);
    expect(mapped.stock).toBe(150);
    expect(mapped.weight).toBe(0.35);
    
    expect(mapped.images).toHaveLength(3);
    expect(mapped.images[0].url).toBe('https://dropi.s3.amazonaws.com/14166/1.jpg');
    expect(mapped.images[0].is_primary).toBe(true);
    
    expect(mapped.variants).toHaveLength(2);
    expect(mapped.variants[0].provider_variant_id).toBe('8872');
    expect(mapped.variants[0].name).toBe('Talla M');
    expect(mapped.variants[0].sku).toBe('CORRECT-M');
  });

  it('should fail mapping if vital contract fields (like id) are missing', () => {
    const invalidPayload = {
      nombre: 'Wrong Product',
      costo: 10000
    };

    expect(() => DropiMapper.mapProduct(invalidPayload)).toThrow(/Payload Dropi inválido o sin ID/);
  });
});
