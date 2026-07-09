import { $, $$, createEl, on } from '../utils/dom.js';

const colorPalette = ['#6366f1','#f59e0b','#10b981','#ef4444','#ec4899','#8b5cf6','#06b6d4','#f97316','#14b8a6','#e11d48'];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

let cachedReviews = null;

async function loadReviews() {
  if (cachedReviews) return cachedReviews;
  try {
    const res = await fetch('/data/reviews.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    cachedReviews = data.map(r => ({ ...r, initials: getInitials(r.name), color: getColor(r.name) }));
    return cachedReviews;
  } catch (err) {
    console.warn('Failed to load reviews:', err);
    return [];
  }
}

export async function initReviewsCarousel() {
  const container = $('#reviews-carousel-section');
  if (!container) return;

  const reviews = await loadReviews();
  if (!reviews.length) return;

  const track = container.querySelector('.reviews-carousel-track');
  const dotsContainer = container.querySelector('.reviews-carousel-dots');
  const prevBtn = container.querySelector('[data-carousel-prev]');
  const nextBtn = container.querySelector('[data-carousel-next]');
  if (!track) return;

  reviews.forEach(r => {
    const starsStr = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    const card = createEl('div', { className: 'review-card' }, [
      createEl('div', { className: 'review-card-header' }, [
        createEl('div', { className: 'review-avatar', style: `background:${r.color}` }, [document.createTextNode(r.initials)]),
        createEl('div', { className: 'review-meta' }, [
          createEl('div', { className: 'review-name' }, [document.createTextNode(r.name)]),
          createEl('div', { className: 'review-detail' }, [document.createTextNode(`${r.city} · ${r.date}`)]),
        ]),
      ]),
      createEl('div', { className: 'review-stars' }, [document.createTextNode(starsStr)]),
      createEl('p', { className: 'review-text' }, [document.createTextNode(r.text)]),
    ]);
    track.appendChild(card);
  });

  let current = 0;
  let cardsPerView = getCardsPerView();
  let autoplayTimer = null;

  function getCardsPerView() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }

  const totalSlides = Math.ceil(reviews.length / cardsPerView);

  function getTranslate() {
    const gap = 16;
    const cardWidth = track.querySelector('.review-card')?.offsetWidth || 0;
    if (cardsPerView === 1) return -(current * (cardWidth + gap));
    if (cardsPerView === 2) return -(current * (cardWidth * 2 + gap));
    return -(current * (cardWidth * 3 + gap * 2));
  }

  function update() {
    track.style.transform = `translateX(${getTranslate()}px)`;
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.reviews-dot').forEach((d, i) => d.classList.toggle('is-active', i === current));
    }
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current >= totalSlides - 1;
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, totalSlides - 1));
    update();
  }

  function goNext() { goTo(current + 1); }
  function goPrev() { goTo(current - 1); }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      if (current >= totalSlides - 1) goTo(0);
      else goNext();
    }, 4000);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function buildDots() {
    if (!dotsContainer) return;
    const newTotal = Math.ceil(reviews.length / cardsPerView);
    dotsContainer.innerHTML = '';
    for (let i = 0; i < newTotal; i++) {
      const dot = createEl('button', {
        className: `reviews-dot${i === current ? ' is-active' : ''}`,
        'aria-label': `Ir a reseña ${i + 1}`,
      });
      on(dot, 'click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  buildDots();
  if (prevBtn) on(prevBtn, 'click', goPrev);
  if (nextBtn) on(nextBtn, 'click', goNext);

  on(track.parentElement, 'mouseenter', stopAutoplay);
  on(track.parentElement, 'mouseleave', startAutoplay);

  let touchStartX = 0;
  on(track.parentElement, 'touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  on(track.parentElement, 'touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) { if (diff > 0) goNext(); else goPrev(); }
  }, { passive: true });

  let resizeTimer;
  on(window, 'resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newCardsPerView = getCardsPerView();
      if (newCardsPerView !== cardsPerView) {
        cardsPerView = newCardsPerView;
        const newTotal = Math.ceil(reviews.length / cardsPerView);
        if (current >= newTotal) current = newTotal - 1;
        buildDots();
        update();
      }
    }, 200);
  });

  update();
  startAutoplay();
}
