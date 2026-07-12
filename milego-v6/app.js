const colombia = {
  "Bogota D.C.": ["Bogota"],
  "Antioquia": ["Medellin", "Bello", "Envigado", "Itagui", "Rionegro", "Sabaneta", "Caldas", "Apartado", "Caucasia", "Chigorodo", "Copacabana", "La Estrella", "Marinilla", "Turbaco"],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tulua", "Yumbo", "Buga", "Jamundi", "Cartago", "Florida", "Pradera"],
  "Atlantico": ["Barranquilla", "Soledad", "Malambo", "Sabanagrande", "Baranoa", "Galapa", "Puerto Colombia"],
  "Santander": ["Bucaramanga", "Floridablanca", "Giron", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro"],
  "Cundinamarca": ["Soacha", "Chia", "Zipaquira", "Facatativa", "Fusagasuga", "Mosquera", "Funza", "Madrid", "Girardot", "Cajica", "Sopo", "Tocancipa"],
  "Bolivar": ["Cartagena", "Magangue", "Turbaco", "Arjona", "El Carmen de Bolivar"],
  "Norte de Santander": ["Cucuta", "Ocana", "Pamplona", "Villa del Rosario", "Los Patios"],
  "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia"],
  "Caldas": ["Manizales", "Villamaria", "La Dorada", "Chinchina"],
  "Quindio": ["Armenia", "Calarca", "Montenegro", "Quimbaya", "La Tebaida"],
  "Tolima": ["Ibague", "Espinal", "Melgar", "Mariquita", "Libano"],
  "Huila": ["Neiva", "Pitalito", "Garzon", "La Plata"],
  "Meta": ["Villavicencio", "Acacias", "Granada"],
  "Magdalena": ["Santa Marta", "Cienaga", "Fundacion", "El Banco"],
  "Cesar": ["Valledupar", "Aguachica", "Codazzi", "Bosconia"],
  "Narino": ["Pasto", "Ipiales", "Tumaco", "Tuquerres"],
  "Cordoba": ["Monteria", "Cerete", "Lorica", "Sahagun", "Planeta Rica"],
  "Sucre": ["Sincelejo", "Corozal", "San Marcos"]
};

const PACKS = {
  6: { name: "Pack x6", price: 79900, oldPrice: 119900, desc: "Organiza 6 pares" },
  12: { name: "Pack x12", price: 129900, oldPrice: 199900, desc: "Organiza 12 pares (Recomendado)" },
  18: { name: "Pack x18", price: 179900, oldPrice: 279900, desc: "Organiza 18 pares" }
};

const formatCOP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initHeaderScroll();
  initMobileMenu();
  initScrollReveal();
  initCounters();
  initFaq();
  initLocationDropdowns();
  initPriceSelector();
  initOrderForm();
  initWhatsapp();
});

function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  setTimeout(() => loader.classList.add('hidden'), 1800);
}

function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;
  const check = () => header.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', check, { passive: true });
  check();
}

function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu');
  const nav = document.querySelector('#header nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
    btn.innerHTML = nav.classList.contains('open')
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
  }));
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

function initCounters() {
  const counters = document.querySelectorAll('.counter');
  if (!counters.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const target = parseFloat(el.dataset.target);
        const isDecimal = target % 1 !== 0;
        const duration = 2000;
        const start = performance.now();
        const animate = now => {
          const progress = Math.min((now - start) / duration, 1);
          const current = progress * target;
          el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
          if (progress < 1) requestAnimationFrame(animate);
          else el.textContent = isDecimal ? target.toFixed(1) : target;
        };
        requestAnimationFrame(animate);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
}

function initFaq() {
  document.querySelectorAll('.faq-item button').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      item.classList.toggle('active');
      document.querySelectorAll('.faq-item').forEach(other => {
        if (other !== item) other.classList.remove('active');
      });
    });
  });
}

function initLocationDropdowns() {
  const dept = document.getElementById('departamento');
  const city = document.getElementById('ciudad');
  if (!dept || !city) return;

  Object.keys(colombia).sort().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    dept.appendChild(opt);
  });

  dept.addEventListener('change', () => {
    city.innerHTML = '<option value="">Selecciona...</option>';
    city.disabled = !dept.value;
    if (dept.value && colombia[dept.value]) {
      colombia[dept.value].sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        city.appendChild(opt);
      });
    }
  });
}

function initPriceSelector() {
  const combo = document.getElementById('combo');
  const total = document.getElementById('totalPrice');
  if (!combo || !total) return;
  const update = () => {
    const pack = PACKS[combo.value];
    if (pack) total.textContent = formatCOP(pack.price);
  };
  combo.addEventListener('change', update);
  update();
}

function initOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.btn-order');
    btn.disabled = true;
    btn.textContent = 'PROCESANDO...';

    const comboVal = document.getElementById('combo')?.value || '12';
    const pack = PACKS[comboVal] || PACKS[12];

    const order = {
      orderId: 'CMD-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      comboId: comboVal,
      comboName: pack.name,
      comboPrice: pack.price,
      clientName: document.getElementById('nombre')?.value || '',
      clientPhone: document.getElementById('telefono')?.value || '',
      clientState: document.getElementById('departamento')?.value || '',
      clientCity: document.getElementById('ciudad')?.value || '',
      clientAddress: document.getElementById('direccion')?.value || '',
      clientNotes: document.getElementById('observaciones')?.value || '',
      status: 'Pendiente'
    };

    setTimeout(() => {
      try {
        const orders = JSON.parse(localStorage.getItem('milego_orders') || '[]');
        orders.unshift(order);
        localStorage.setItem('milego_orders', JSON.stringify(orders));
        triggerWebhook(order);
        window.location.href = `/gracias.html?id=${order.orderId}&name=${encodeURIComponent(order.clientName)}&combo=${encodeURIComponent(order.comboName)}&price=${order.comboPrice}`;
      } catch (err) {
        console.error('Error:', err);
        alert('Ocurrio un error. Intenta de nuevo.');
        btn.disabled = false;
        btn.textContent = 'CONFIRMAR MI PEDIDO';
      }
    }, 1200);
  });
}

function triggerWebhook(order) {
  const config = JSON.parse(localStorage.getItem('milego_webhook') || 'null');
  if (!config?.url || !config?.token) return;
  fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.token}` },
    body: JSON.stringify({ event: 'new_order', ...order })
  }).catch(() => {});
}

function initWhatsapp() {
  const wa = document.querySelector('.whatsapp-float');
  if (!wa) return;
  wa.addEventListener('click', e => {
    e.preventDefault();
    const msg = 'Hola! Quiero informacion sobre OrganiMax.';
    window.open(`https://wa.me/573000000000?text=${encodeURIComponent(msg)}`, '_blank');
  });
}
