export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));

      const error = new Error('Error de validación');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = details;
      return next(error);
    }
    req.validated = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));

      const error = new Error('Error de validación');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = details;
      return next(error);
    }
    req.validatedQuery = result.data;
    next();
  };
}