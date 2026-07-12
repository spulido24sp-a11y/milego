import { CustomerRepository } from '../repositories/customer.repository.js';

const repo = new CustomerRepository();

export class CustomerService {
  async list(tenantId, search, page, perPage) {
    return repo.findAll({ tenantId, search, page, perPage });
  }

  async getById(id, tenantId) {
    return repo.findById(id, tenantId);
  }

  async getByEmail(email, tenantId) {
    return repo.findByEmail(email, tenantId);
  }

  async getByPhone(phone, tenantId) {
    return repo.findByPhone(phone, tenantId);
  }

  async create(tenantId, data) {
    return repo.create({ ...data, store_id: tenantId });
  }

  async update(id, tenantId, data) {
    // Ensure the customer exists for this store
    const customer = await repo.findById(id, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    return repo.update(id, data);
  }

  async getAddresses(customerId, tenantId) {
    // Validate customer belongs to store
    const customer = await repo.findById(customerId, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    return repo.getAddresses(customerId);
  }

  async addAddress(customerId, tenantId, addressData) {
    const customer = await repo.findById(customerId, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    const address = await repo.addAddress({
      ...addressData,
      customer_id: customerId,
    });

    if (addressData.is_default) {
      await repo.setDefaultAddress(customerId, address.id);
    }

    return address;
  }

  async setAddressDefault(customerId, tenantId, addressId) {
    const customer = await repo.findById(customerId, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    await repo.setDefaultAddress(customerId, addressId);
  }

  async getNotes(customerId, tenantId) {
    const customer = await repo.findById(customerId, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    return repo.getNotes(customerId, tenantId);
  }

  async addNote(customerId, tenantId, noteText, createdBy) {
    const customer = await repo.findById(customerId, tenantId);
    if (!customer) throw new Error('Cliente no encontrado');

    return repo.addNote({
      customer_id: customerId,
      store_id: tenantId,
      note: noteText,
      created_by: createdBy || null,
    });
  }
}
