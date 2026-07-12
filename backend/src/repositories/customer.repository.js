import db from '../config/database.js';

export class CustomerRepository {
  baseQuery(tenantId) {
    return db('customers').where({ store_id: tenantId, deleted_at: null });
  }

  async findAll({ tenantId, search, page = 1, perPage = 20 }) {
    let query = this.baseQuery(tenantId);
    if (search) {
      query = query.where((qb) => {
        qb.where('name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('phone', 'like', `%${search}%`);
      });
    }

    const [{ count }] = await db('customers')
      .where({ store_id: tenantId, deleted_at: null })
      .modify((qb) => {
        if (search) {
          qb.where((sqb) => {
            sqb.where('name', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`)
              .orWhere('phone', 'like', `%${search}%`);
          });
        }
      })
      .count({ count: 'id' });

    const customers = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage);

    return { customers, total: parseInt(count, 10) };
  }

  async findById(id, tenantId) {
    return this.baseQuery(tenantId).where({ id }).first();
  }

  async findByEmail(email, tenantId) {
    return this.baseQuery(tenantId).where({ email }).first();
  }

  async findByPhone(phone, tenantId) {
    return this.baseQuery(tenantId).where({ phone }).first();
  }

  async create(data, trx) {
    const conn = trx || db;
    const [customer] = await conn('customers').insert(data).returning('*');
    return customer;
  }

  async update(id, data, trx) {
    const conn = trx || db;
    data.updated_at = conn.fn.now();
    const [customer] = await conn('customers').where({ id }).update(data).returning('*');
    return customer;
  }

  async addAddress(addressData, trx) {
    const conn = trx || db;
    const [address] = await conn('addresses').insert(addressData).returning('*');
    return address;
  }

  async getAddresses(customerId) {
    return db('addresses').where({ customer_id: customerId }).orderBy('is_default', 'desc').orderBy('created_at', 'desc');
  }

  async setDefaultAddress(customerId, addressId, trx) {
    const conn = trx || db;
    await conn('addresses').where({ customer_id: customerId }).update({ is_default: false });
    await conn('addresses').where({ id: addressId, customer_id: customerId }).update({ is_default: true });
  }

  async addNote(noteData, trx) {
    const conn = trx || db;
    const [note] = await conn('customer_notes').insert(noteData).returning('*');
    return note;
  }

  async getNotes(customerId, tenantId) {
    return db('customer_notes')
      .where({ customer_id: customerId, store_id: tenantId })
      .orderBy('created_at', 'desc');
  }
}
