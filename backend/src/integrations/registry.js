const registry = {
  dropi: { enabled: false, client: null },
  meta: { enabled: false, client: null },
  whatsapp: { enabled: false, client: null },
  ga4: { enabled: false, client: null },
  tiktok: { enabled: false, client: null },
};

export function getIntegration(name) {
  return registry[name] || null;
}

export function enableIntegration(name, client) {
  if (registry[name]) {
    registry[name].enabled = true;
    registry[name].client = client;
  }
}

export function disableIntegration(name) {
  if (registry[name]) {
    registry[name].enabled = false;
    registry[name].client = null;
  }
}