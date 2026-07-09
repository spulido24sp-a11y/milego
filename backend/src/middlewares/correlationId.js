import { v4 as uuidv4 } from 'uuid';

export function correlationId(req, res, next) {
  const cid = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();
  req.correlationId = cid;
  req.id = cid;
  res.setHeader('X-Correlation-Id', cid);
  next();
}