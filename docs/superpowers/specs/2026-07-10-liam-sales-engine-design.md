# LIAM Sales Engine — Design Doc

**Date:** 2026-07-10  
**Status:** Approved  
**Goal:** Generate complete, conversion-optimized landing pages from raw product data without AI API keys.

## Architecture

### New modules (`backend/src/brain/sales-engine/`)

```
brain/sales-engine/
├── analyzer.js            # Extracts archetype, audience, pain points from product
├── copy-generator.js      # Generates hooks, benefits, FAQs using conversion patterns
├── block-selector.js      # Selects landing blocks based on product archetype
└── blueprint-generator.js # Orchestrates all modules to produce launch_blueprint
```

### analyzer.js

Rules-based classification of any product:

1. **Archetype detection**: From product name, description, category, keywords
   - `health` — medicina, salud, bienestar, dolor, tratamiento, natural
   - `beauty` — belleza, cuidado, piel, crema, facial, cosmético
   - `home` — hogar, cocina, organización, limpieza, decoración
   - `tech` — tecnología, gadget, eléctrico, smart, digital
   - `fashion` — moda, ropa, accesorio, calzado, bolso
   - `food` — alimento, suplemento, bebida, snack
   - `general` — fallback

2. **Audience inference**: From price tier and archetype
   - `< $50k COP` → masivo, impulse
   - `$50k-$150k COP` → aspiracional, calidad-precio
   - `> $150k COP` → premium, consideración alta

3. **Sales levers**: Which psychological triggers apply
   - Precio, calidad, urgencia, exclusividad, salud, estatus, conveniencia

4. **Pain points**: Generated from archetype + price tier templates

### copy-generator.js

Pattern-based copy generation using conversion frameworks (AIDA, PAS, FAB):

| Archetype | Hook template | Pain point template | CTA template |
|-----------|---------------|--------------------|--------------|
| health | "Transforma tu {{healthArea}} con {{product}}" | "¿Cansado de {{pain}}?" | "Recupera tu bienestar hoy" |
| beauty | "Descubre el secreto de una {{benefit}}" | "¿Problemas con {{pain}}?" | "Consigue tu {{benefit}} ahora" |
| home | "{{verb}} tu {{room}} en minutos con {{product}}" | "Di adiós a {{pain}}" | "Transforma tu hogar ya" |
| tech | "La tecnología que {{benefit}}" | "¿{{pain}}? Hay solución" | "Actualízate ahora" |
| fashion | "Marca la diferencia con {{product}}" | "¿Sin {{benefit}}?" | "Estrena estilo hoy" |

Generates:
- 3 hooks (headline, subheadline, CTA)
- 4-6 benefits with emojis
- 4-6 FAQs from product features
- SEO title + description + keywords
- Pricing tiers: unit, 2-pack, 3-pack with discount calculations

### block-selector.js

Selects landing page blocks based on archetype:

| Archetype | Blocks |
|-----------|--------|
| health | Hero, Problem, Enemy, Transformation, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |
| beauty | Hero, Problem, Transformation, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |
| home | Hero, Problem, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |
| tech | Hero, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |
| fashion | Hero, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |
| food | Hero, Problem, Benefits, Offer, Guarantee, FAQ, CTA |
| general | Hero, Benefits, Testimonials, Offer, Guarantee, FAQ, CTA |

### blueprint-generator.js

Orchestrates all modules. Outputs `launch_blueprint`:

```json
{
  "customer": { "audience": "...", "pain_points": [...], "desires": [...] },
  "offer": { "price_unit": 79900, "price_cost": 25000, "bundle": "combo_x2", "discount_pct": 30 },
  "marketing": { "hooks": [...], "emotional_angle": "...", "cta_text": "..." },
  "content": { "benefits": [...], "faq": [...], "features": [...] },
  "seo": { "title": "...", "description": "...", "keywords": [...], "slug": "..." },
  "blocks": ["hero", "problem", "benefits", "testimonials", "offer", "guarantee", "faq", "cta"],
  "confidence": 85,
  "version": 1
}
```

### Modified files

- `landing/generator.js` — Updated to render blocks dynamically instead of fixed HTML. Each block type maps to a render function instead of template replacements.
- `admin.routes.js` — 3 new routes (generate, preview, publish)
- `admin.controller.js` — 3 new methods

### Admin API

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/admin/products/:id/generate-blueprint` | Run LIAM Sales Engine → generate blueprint + landing HTML |
| GET | `/admin/products/:id/preview-landing` | Return rendered landing HTML |
| POST | `/admin/products/:id/publish-landing` | Save as launch_version + set status=published |

### Data flow

```
Product (raw) → analyzer → { archetype, audience, levers }
  → copy-generator → { hooks, benefits, faqs, seo }
  → block-selector → { blocks: [...] }
  → blueprint-generator → launch_blueprint (JSONB)
  → landing/generator → landing_html
  → publisher → launch_versions + product.status = published
```

No database migrations needed. Uses existing `launch_blueprint` JSONB column and `launch_versions` table.
