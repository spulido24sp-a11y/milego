const STORAGE_KEY = 'milego_orders';

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function addOrder(orderData) {
  const orders = getOrders();
  const order = { ...orderData, synced: false, createdAt: new Date().toISOString() };
  orders.push(order);
  saveOrders(orders);
  return order;
}

export function markSynced(orderId) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.orderId === orderId);
  if (idx === -1) return;
  orders[idx].synced = true;
  orders[idx].syncedAt = new Date().toISOString();
  saveOrders(orders);
}

export function getPendingOrders() {
  return getOrders().filter(o => !o.synced);
}

export async function processQueue(sendFn) {
  const pending = getPendingOrders();
  if (!pending.length) return;
  for (const order of pending) {
    try {
      await sendFn(order);
      markSynced(order.orderId);
    } catch (err) {
      console.warn(`[OrderQueue] Falló reintento orden ${order.orderId}:`, err);
    }
  }
}
