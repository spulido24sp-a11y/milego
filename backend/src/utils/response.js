export function success(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, meta });
}

export function paginated(res, data, page, perPage, total) {
  return success(res, data, { page, per_page: perPage, total });
}

export function created(res, data) {
  return success(res, data, {}, 201);
}

export function noContent(res) {
  return res.status(204).end();
}

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}