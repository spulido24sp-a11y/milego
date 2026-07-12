// Carga los dos productos de ejemplo que ya vimos en los prototipos,
// para que la app no arranque vacía. Ejecutar con: npm run seed
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const alivia = await db.product.create({
    data: {
      name: 'ALIVIA — Masajeador cervical inteligente',
      cost: 40000, price: 129900, wow: true, commodity: false,
      score: 96, recommendation: 'lanzar', status: 'active', template: 'editorial',
      buyerPersona: {
        perfil: '32-48 años · trabajo de oficina o remoto · 6+ horas frente a pantalla',
        frustraciones: ['Tensión cervical acumulada', 'Sin tiempo para masajes profesionales', 'Analgésicos como única solución'],
        objeciones: ['¿Duele el nivel de percusión alto?', '¿Vale la pena vs. un masaje real?', '¿Dura la batería una semana de uso?'],
      },
      tiers: [
        { qty: 1, label: '1x unidad', sub: 'unidad individual', price: 129900, compareAt: 189900 },
        { qty: 2, label: '2x unidades', sub: '1 para ti, 1 de regalo', price: 189900, compareAt: 259900 },
        { qty: 3, label: '3x unidades', sub: 'pack familiar', price: 259900, compareAt: 349900 },
      ],
    },
  });

  const nuva = await db.product.create({
    data: {
      name: 'NUVA — Cinturón de terapia de luz roja',
      cost: 55000, price: 179900, wow: true, commodity: false,
      score: 96, recommendation: 'lanzar', status: 'active', template: 'pagepilot',
      buyerPersona: {
        perfil: '28-45 años · practica deporte o entrenamiento regular',
        frustraciones: ['Recuperación muscular lenta', 'Precio alto de sesiones de spa/fisioterapia', 'Rigidez después de entrenar'],
        objeciones: ['¿Es seguro usarlo a diario?', '¿Cuánto dura la batería?', '¿Realmente funciona la luz roja?'],
      },
      tiers: [
        { qty: 1, label: '1x NUVA', sub: 'unidad individual', price: 179900, compareAt: 349900 },
        { qty: 2, label: '2x NUVA', sub: '1 para ti, 1 de regalo', price: 305900, compareAt: 699800 },
        { qty: 3, label: '3x NUVA', sub: 'familiar + funda de viaje', price: 419900, compareAt: 1049700 },
      ],
    },
  });

  await db.launchDecision.createMany({
    data: [
      { productId: alivia.id, type: 'scoring de producto', recommendation: `lanzar ${alivia.name}`, recommendedBy: 'liam', humanAction: 'aceptado', outcome: 'acertó' },
      { productId: nuva.id, type: 'scoring de producto', recommendation: `lanzar ${nuva.name}`, recommendedBy: 'liam', humanAction: 'aceptado', outcome: 'pendiente' },
    ],
  });

  console.log('Seed completo: ALIVIA y NUVA activos en la tienda.');
}

main().finally(() => db.$disconnect());
