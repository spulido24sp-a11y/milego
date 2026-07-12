import { initCheckoutPage } from './modules/checkout.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutPage);
} else {
  initCheckoutPage();
}
