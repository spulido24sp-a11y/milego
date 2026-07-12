export class DropiError extends Error {
  constructor(message, status = 500, code = 'DROPI_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

export class DropiAPIError extends DropiError {
  constructor(message, status, payload) {
    super(message, status, 'DROPI_API_ERROR');
    this.payload = payload;
  }
}

export class DropiConnectionError extends DropiError {
  constructor(message) {
    super(message, 503, 'DROPI_CONNECTION_ERROR');
  }
}

export class DropiAuthError extends DropiError {
  constructor(message) {
    super(message, 401, 'DROPI_AUTH_ERROR');
  }
}
