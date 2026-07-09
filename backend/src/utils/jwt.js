import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessExpires });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.jwt.secret, { expiresIn: config.jwt.refreshExpires });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}
