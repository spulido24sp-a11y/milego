// Lógica de scoring de LIAM v1 — corresponde 1:1 con LIAM_V1_Prompt_Scoring.md
// Criterio 1: factor wow / resuelve un problema real
// Criterio 2: margen mínimo de 3x sobre costo de proveedor
// Criterio 3: no debe ser fácilmente encontrable en un supermercado/tienda física local

export function scoreProduct(cost: number, price: number, wow: boolean, commodity: boolean) {
  const marginOk = cost > 0 && price / cost >= 3;
  const notCommodity = !commodity;
  const passes = [wow, marginOk, notCommodity].filter(Boolean).length;

  const scoreByPasses = [10, 33, 66, 96];
  const score = scoreByPasses[passes];

  let recommendation: 'lanzar' | 'monitorear' | 'descartar' = 'descartar';
  if (passes === 3) recommendation = 'lanzar';
  else if (passes === 2) recommendation = 'monitorear';

  return { marginOk, notCommodity, score, recommendation, passes };
}

export function genBuyerPersona(productName: string) {
  return {
    perfil: '28-45 años · trabajo de oficina o remoto',
    frustraciones: [
      `Busca una solución rápida relacionada con "${productName}"`,
      'Poco tiempo para soluciones presenciales',
      'Ya probó alternativas genéricas sin buenos resultados',
    ],
    objeciones: [
      '¿Realmente funciona como dice?',
      '¿Vale la pena frente a la opción profesional?',
      '¿Cuánto tarda el envío?',
    ],
  };
}

export function buildTiers(price: number) {
  return [
    { qty: 1, label: '1x unidad', sub: 'unidad individual', price: Math.round(price), compareAt: Math.round(price * 1.55) },
    { qty: 2, label: '2x unidades', sub: '1 para ti, 1 de regalo', price: Math.round(price * 1.7), compareAt: Math.round(price * 1.55 * 2) },
    { qty: 3, label: '3x unidades', sub: 'pack familiar + extra', price: Math.round(price * 2.3), compareAt: Math.round(price * 1.55 * 3) },
  ];
}
