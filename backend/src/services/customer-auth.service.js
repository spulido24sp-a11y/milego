import { randomBytes, createHash } from 'crypto';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { CustomerAccessRepository } from '../repositories/customer-access.repository.js';
import { signAccessToken } from '../utils/jwt.js';
import db from '../config/database.js';

const customerRepo = new CustomerRepository();
const accessRepo = new CustomerAccessRepository();

export class CustomerAuthService {
  async requestMagicLink(email, tenantId, ipAddress, userAgent) {
    // 1. Find or create customer
    let customer = await customerRepo.findByEmail(email, tenantId);
    if (!customer) {
      customer = await customerRepo.create({
        store_id: tenantId,
        email,
        name: `Cliente ${email.split('@')[0]}`,
      });
    }

    // 2. Generate secure token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 3. Save token to DB (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await accessRepo.saveToken({
      customer_id: customer.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip: ipAddress,
      user_agent: userAgent,
    });

    const magicLink = `http://localhost:3000/api/v1/auth/magic-link?token=${token}`;

    // 4. Enqueue notification job
    await db('jobs').insert({
      type: 'email.magic_link',
      payload: JSON.stringify({
        email,
        link: magicLink,
        customer_name: customer.name,
      }),
    });

    return { magicLink, email };
  }

  async verifyMagicLinkToken(token) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const activeToken = await accessRepo.findActiveToken(tokenHash);

    if (!activeToken) {
      throw Object.assign(new Error('Token de Magic Link inválido, usado o expirado'), {
        statusCode: 401,
        code: 'INVALID_MAGIC_LINK',
      });
    }

    // Mark as used
    await accessRepo.consumeToken(activeToken.id);

    // Retrieve customer
    const customer = await db('customers').where({ id: activeToken.customer_id }).first();
    if (!customer) throw new Error('Cliente no encontrado');

    // Sign JWT (use a special role: 'customer' to distinguish from staff)
    const payload = {
      sub: customer.id,
      store_id: customer.store_id,
      role: 'customer',
      permissions: ['customer.profile.read', 'customer.profile.update'],
    };

    const accessToken = signAccessToken(payload);

    return {
      accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    };
  }
}
