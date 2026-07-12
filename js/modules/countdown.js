export function initCountdown() {
  const container = document.getElementById('countdown-section');
  if (!container) return;

  function getEndOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  function update() {
    const now = new Date();
    const end = getEndOfDay();
    const diff = Math.max(0, end - now);

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hEl = document.getElementById('countdown-hours');
    const mEl = document.getElementById('countdown-minutes');
    const sEl = document.getElementById('countdown-seconds');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
    if (sEl) sEl.textContent = String(seconds).padStart(2, '0');

    if (hours === 0 && minutes < 30) {
      container.classList.add('is-urgent');
    }
  }

  update();
  setInterval(update, 1000);
}
