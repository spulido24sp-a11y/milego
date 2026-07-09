import { UserRepository } from '../repositories/user.repository.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import db from '../config/database.js';
import { createHash } from 'crypto';

const userRepo = new UserRepository();

export class AuthService {
  async login(email, password, ipAddress, userAgent) {
    const user = await userRepo.findByEmail(email);
    if (!user || !(await verifyPassword(user.password_hash, password))) {
      throw Object.assign(new Error('Credenciales inválidas'), {
        statusCode: 401, code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.is_active) {
      throw Object.assign(new Error('Usuario inactivo'), {
        statusCode: 403, code: 'USER_INACTIVE',
      });
    }

    const payload = { sub: user.id, store_id: user.store_id, permissions: user.permissions || [] };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await db('sessions').insert({
      user_id: user.id,
      refresh_token_hash: hash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
  }

  async refresh(token) {
    try {
      const payload = verifyToken(token);
      const hash = createHash('sha256').update(token).digest('hex');

      const session = await db('sessions')
        .where({ refresh_token_hash: hash })
        .whereNull('revoked_at')
        .where('expires_at', '>', db.fn.now())
        .first();

      if (!session) {
        const revoked = await db('sessions')
          .where({ refresh_token_hash: hash })
          .whereNotNull('revoked_at')
          .first();
        if (revoked) {
          await db('sessions').where({ user_id: revoked.user_id }).del();
          throw Object.assign(new Error('Reuso de token detectado — todas las sesiones revocadas'), {
            statusCode: 401, code: 'TOKEN_REUSE_DETECTED',
          });
        }
        throw new Error('Invalid session');
      }

      await db('sessions').where({ id: session.id }).update({ revoked_at: db.fn.now() });

      const user = await userRepo.findById(payload.sub);
      if (!user) throw new Error('User not found');

      const newPayload = { sub: user.id, store_id: user.store_id, permissions: user.permissions || [] };
      const newAccessToken = signAccessToken(newPayload);
      const newRefreshToken = signRefreshToken(newPayload);

      const newHash = createHash('sha256').update(newRefreshToken).digest('hex');
      await db('sessions').insert({
        user_id: user.id,
        refresh_token_hash: newHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err.code === 'TOKEN_REUSE_DETECTED') throw err;
      throw Object.assign(new Error('Refresh token inválido o expirado'), {
        statusCode: 401, code: 'REFRESH_INVALID',
      });
    }
  }

  async logout(token) {
    const hash = createHash('sha256').update(token).digest('hex');
    await db('sessions').where({ refresh_token_hash: hash }).del();
  }
}
