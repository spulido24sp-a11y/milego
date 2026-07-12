const API_BASE = '/api/v1';

export class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('milego_access', access);
    localStorage.setItem('milego_refresh', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('milego_access');
    localStorage.removeItem('milego_refresh');
  }

  loadTokens() {
    this.accessToken = localStorage.getItem('milego_access');
    this.refreshToken = localStorage.getItem('milego_refresh');
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retry = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
        return retry.json();
      }
      this.clearTokens();
      window.location.hash = '#/login';
      return null;
    }

    return res.json();
  }

  async refresh() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
    return false;
  }

  async login(email, password) {
    const res = await this.request('POST', '/auth/login', { email, password });
    if (res.success) {
      this.setTokens(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  }

  async logout() {
    await this.request('POST', '/auth/logout', { refreshToken: this.refreshToken });
    this.clearTokens();
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }
}

export const api = new ApiClient();
