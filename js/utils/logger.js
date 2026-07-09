const LOG_KEY = 'milego_logs';
const MAX_LOGS = 200;

function getLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(log) {
  const logs = getLogs();
  logs.push(log);
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(logs)); } catch {}
}

function formatMsg(level, label, msg, data) {
  return { level, label, msg, data, ts: new Date().toISOString() };
}

export function info(msg, data) {
  const entry = formatMsg('INFO', 'app', msg, data);
  persist(entry);
  console.info(`[${entry.ts}] INFO: ${msg}`, data || '');
}

export function warn(msg, data) {
  const entry = formatMsg('WARN', 'app', msg, data);
  persist(entry);
  console.warn(`[${entry.ts}] WARN: ${msg}`, data || '');
}

export function error(msg, data) {
  const entry = formatMsg('ERROR', 'app', msg, data);
  persist(entry);
  console.error(`[${entry.ts}] ERROR: ${msg}`, data || '');
}

export function getRecent(limit = 50) {
  return getLogs().slice(-limit);
}

export function initGlobalHandlers() {
  window.addEventListener('error', (e) => {
    error('Uncaught error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    error('Unhandled promise rejection', {
      message: e.reason?.message || String(e.reason),
      stack: e.reason?.stack,
    });
  });
}
