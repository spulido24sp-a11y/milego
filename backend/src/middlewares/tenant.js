export function tenantContext(req, _res, next) {
  if (req.user?.store_id) {
    req.tenant = { storeId: req.user.store_id };
    return next();
  }
  req.tenant = { storeId: 1 };
  next();
}
