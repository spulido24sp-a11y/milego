import db from '../config/database.js';

export class CustomerAccessRepository {
  async saveToken(data) {
    const [token] = await db('customer_access_tokens').insert(data).returning('*');
    return token;
  }

  async findActiveToken(hash) {
    return db('customer_access_tokens')
      .where({ token_hash: hash, used_at: null })
      .andWhere('expires_at', '>', db.fn.now())
      .first();
  }

  async consumeToken(id, trx) {
    const conn = trx || db;
    await conn('customer_access_tokens')
      .where({ id })
      .update({ used_at: conn.fn.now() });
  }
}
