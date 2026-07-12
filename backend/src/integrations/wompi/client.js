import { config } from '../../config/index.js';

const SANDBOX_BASE = 'https://sandbox.wompi.co/v1';
const PRODUCTION_BASE = 'https://production.wompi.co/v1';

const SANDBOX_PUBLIC_KEY = 'pub_stagtest_5e4c1d6d6f7d4c1d6d6f7d4c';
const SANDBOX_PRIVATE_KEY = 'prv_stagtest_5e4c1d6d6f7d4c1d6d6f7d4c';

export class WompiClient {
  constructor() {
    this.isSandbox = (process.env.WOMPI_ENV || 'sandbox') !== 'production';
    this.baseUrl = this.isSandbox ? SANDBOX_BASE : PRODUCTION_BASE;
    this.publicKey = process.env.WOMPI_PUBLIC_KEY || SANDBOX_PUBLIC_KEY;
    this.privateKey = process.env.WOMPI_PRIVATE_KEY || SANDBOX_PRIVATE_KEY;
  }

  async request(endpoint, { auth = true, ...options } = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (auth) {
      headers['Authorization'] = `Bearer ${this.privateKey}`;
    }

    delete options.headers;

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Wompi API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getAcceptanceToken() {
    const data = await this.request(`/merchants/${this.publicKey}`, { auth: false });
    return data.data?.presigned_acceptance?.acceptance_token;
  }

  async createTransaction({ amount, currency, customerData, reference, redirectUrl, webhookUrl }) {
    const acceptanceToken = await this.getAcceptanceToken();
    if (!acceptanceToken) {
      throw new Error('No se pudo obtener el acceptance token de Wompi');
    }

    const amountInCents = Math.round(amount * 100);

    const payload = {
      amount_in_cents: amountInCents,
      currency: currency || 'COP',
      customer_email: customerData.email,
      reference,
      acceptance_token: acceptanceToken,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      payment_method: {
        type: 'CARD',
        installments: customerData.installments || 1,
      },
    };

    if (customerData.document_type && customerData.document_number) {
      payload.customer_data = {
        phone_number: customerData.phone,
        full_name: customerData.name,
        legal_id_type: customerData.document_type,
        legal_id: customerData.document_number,
      };
    }

    const result = await this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result.data;
  }

  async getTransaction(transactionId) {
    const result = await this.request(`/transactions/${transactionId}`);
    return result.data;
  }
}
