import db from '../config/database.js';
import { bus } from './index.js';

export async function replayEvent(eventLogId) {
  const original = await db('event_logs').where({ id: eventLogId }).first();
  if (!original) {
    const err = new Error('Evento no encontrado');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const MAX_AGE_DAYS = parseInt(process.env.MAX_REPLAY_AGE_DAYS, 10) || 7;
  const ageDays = (Date.now() - new Date(original.created_at).getTime()) / 86400000;
  if (ageDays > MAX_AGE_DAYS) {
    const err = new Error(`Evento demasiado antiguo (${Math.round(ageDays)} días, máximo ${MAX_AGE_DAYS})`);
    err.statusCode = 400;
    err.code = 'EVENT_TOO_OLD';
    throw err;
  }

  const parsed = typeof original.payload === 'string' ? JSON.parse(original.payload) : original.payload;

  const newLog = await bus.emit(original.event_name, parsed.data, {
    ...parsed.meta,
    replayedFrom: original.id,
    isReplay: true,
    correlationId: parsed.meta?.correlationId,
    version: original.version || 1,
  });

  return newLog;
}
