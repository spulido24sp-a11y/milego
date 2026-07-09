import { $$ } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';

export function initCounters() {
  const counters = $$('[data-counter]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach((el) => observer.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = parseInt(el.dataset.duration, 10) || 2000;
  const suffix = el.dataset.suffix || '';
  const start = 0;
  const step = Math.max(1, Math.floor(target / (duration / 16)));
  let current = start;

  const update = () => {
    current += step;
    if (current >= target) {
      el.textContent = formatNumber(target) + suffix;
      return;
    }
    el.textContent = formatNumber(current) + suffix;
    requestAnimationFrame(update);
  };

  update();
}
