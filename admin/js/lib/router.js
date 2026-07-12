export class Router {
  constructor() {
    this.routes = {};
    window.addEventListener('hashchange', () => this.resolve());
  }

  on(hash, handler) {
    this.routes[hash] = handler;
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  resolve() {
    const fullHash = window.location.hash.slice(1) || '/dashboard';
    const path = fullHash.split('?')[0];
    const handler = this.routes[path];
    if (handler) handler();
  }

  start() {
    this.resolve();
  }
}
