import { CustomerService } from '../services/customer.service.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createAddressSchema,
  createCustomerNoteSchema,
} from '../validators/customer.validator.js';
import { success, error, created } from '../utils/response.js';

const customerService = new CustomerService();

export class CustomerController {
  // Staff Admin Endpoints
  async adminList(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { search, page, per_page } = req.query;
      const result = await customerService.list(
        tenantId,
        search,
        page ? parseInt(page, 10) : 1,
        per_page ? parseInt(per_page, 10) : 20
      );
      return success(res, result.customers, { total: result.total });
    } catch (err) {
      next(err);
    }
  }

  async adminGet(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const customer = await customerService.getById(parseInt(id, 10), tenantId);
      if (!customer) {
        return error(res, 'Cliente no encontrado', 404);
      }
      return success(res, customer);
    } catch (err) {
      next(err);
    }
  }

  async adminAddNote(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const { note } = createCustomerNoteSchema.parse(req.body);
      const staffUserId = req.user.sub;

      const createdNote = await customerService.addNote(
        parseInt(id, 10),
        tenantId,
        note,
        staffUserId
      );
      return created(res, createdNote);
    } catch (err) {
      if (err.name === 'ZodError') {
        return error(res, 'Datos de validación inválidos', 400, err.errors);
      }
      next(err);
    }
  }

  async adminGetNotes(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const notes = await customerService.getNotes(parseInt(id, 10), tenantId);
      return success(res, notes);
    } catch (err) {
      next(err);
    }
  }

  // Public Customer Profile Endpoints (with Customer JWT)
  async profileGet(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const customerId = req.customer.id;
      const customer = await customerService.getById(customerId, tenantId);
      if (!customer) {
        return error(res, 'Perfil de cliente no encontrado', 404);
      }
      return success(res, customer);
    } catch (err) {
      next(err);
    }
  }

  async profileUpdate(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const customerId = req.customer.id;
      const validatedData = updateCustomerSchema.parse(req.body);

      const customer = await customerService.update(customerId, tenantId, validatedData);
      return success(res, customer);
    } catch (err) {
      if (err.name === 'ZodError') {
        return error(res, 'Datos de validación inválidos', 400, err.errors);
      }
      next(err);
    }
  }

  async addressesList(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const customerId = req.customer.id;
      const addresses = await customerService.getAddresses(customerId, tenantId);
      return success(res, addresses);
    } catch (err) {
      next(err);
    }
  }

  async addressesAdd(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const customerId = req.customer.id;
      const validatedData = createAddressSchema.parse(req.body);

      const address = await customerService.addAddress(customerId, tenantId, validatedData);
      return created(res, address);
    } catch (err) {
      if (err.name === 'ZodError') {
        return error(res, 'Datos de validación inválidos', 400, err.errors);
      }
      next(err);
    }
  }

  async addressesSetDefault(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const customerId = req.customer.id;
      const { addressId } = req.params;

      await customerService.setAddressDefault(customerId, tenantId, parseInt(addressId, 10));
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
}
