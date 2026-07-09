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
    const hash = window.location.hash.slice(1) || '/dashboard';
    const handler = this.routes[hash];
    if (handler) handler();
  }

  start() {
    this.resolve();
  }
}
