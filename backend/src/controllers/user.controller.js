import { UserRepository } from '../repositories/user.repository.js';
import { success, created } from '../utils/response.js';
import { hashPassword } from '../utils/password.js';

const userRepo = new UserRepository();

export class UserController {
  async list(req, res, next) {
    try {
      const users = await userRepo.findAll({ tenant: req.tenant });
      return success(res, users);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = {
        ...req.validated,
        store_id: req.tenant.storeId,
        password_hash: await hashPassword(req.validated.password),
      };
      delete data.password;
      const user = await userRepo.create(data);
      return created(res, { id: user.id, name: user.name, email: user.email });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = { ...req.validated };
      if (data.password) {
        data.password_hash = await hashPassword(data.password);
        delete data.password;
      }
      const user = await userRepo.update(req.params.id, data);
      return success(res, { id: user.id, name: user.name, email: user.email });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await userRepo.softDelete(req.params.id);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
