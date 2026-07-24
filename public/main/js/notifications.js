/** Builds actionable notifications from the current Firestore-backed data. */
import { esc, formatCurrency } from './utils.js';

const READ_KEY = 'inventory-pro-notifications-read-v2';
const state = { products: [], warehouses: [], purchases: [], sales: [] };

function timestampOf(record) {
  return record.updatedAt?.toMillis?.() || record.createdAt?.toMillis?.() || 0;
}

function relativeTime(time) {
  if (!time) return 'Needs attention';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function readIds() {
  try {
    const value = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function warehouseMetrics(warehouse) {
  const products = state.products.filter(product => product.warehouse === warehouse.name);
  const units = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const capacity = Number(warehouse.capacity || 0);
  return { units, capacity, utilization: capacity > 0 ? Math.round(units / capacity * 100) : 0 };
}

function expectedDateTime(value) {
  if (!value) return 0;
  const time = new Date(`${value}T23:59:59`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildNotifications() {
  const alerts = [];

  state.products.forEach(product => {
    const stock = Number(product.stock || 0);
    const reorder = Number(product.reorder || 0);
    if (stock === 0) {
      alerts.push({
        id:`stock-out:${product.id}:0`, page:'products', time:timestampOf(product),
        priority:5, type:'OUT', icon:'danger', title:'Out of stock',
        message:`${product.name} (${product.sku}) has no units remaining.`
      });
    } else if (stock <= reorder) {
      alerts.push({
        id:`stock-low:${product.id}:${stock}`, page:'products', time:timestampOf(product),
        priority:4, type:'LOW', icon:'warning', title:'Low stock',
        message:`${product.name} has ${stock} unit${stock === 1 ? '' : 's'} left; reorder point is ${reorder}.`
      });
    }
  });

  state.warehouses.forEach(warehouse => {
    const metrics = warehouseMetrics(warehouse);
    if (metrics.capacity > 0 && metrics.units > metrics.capacity) {
      alerts.push({
        id:`capacity:${warehouse.id}:${metrics.units}:${metrics.capacity}`, page:'warehouses',
        time:timestampOf(warehouse), priority:5, type:'CAP', icon:'danger',
        title:'Warehouse over capacity',
        message:`${warehouse.name} is at ${metrics.utilization}% (${metrics.units.toLocaleString()} of ${metrics.capacity.toLocaleString()} units).`
      });
    }
  });

  const now = Date.now();
  state.purchases.forEach(order => {
    const status = String(order.status || '');
    const expected = expectedDateTime(order.expectedDate);
    const closed = ['Completed', 'Cancelled', 'Received'].includes(status);
    if (expected && expected < now && !closed) {
      const daysLate = Math.max(1, Math.ceil((now - expected) / 86400000));
      alerts.push({
        id:`po-late:${order.id}:${order.expectedDate}:${status}`, page:'purchases',
        time:timestampOf(order), priority:5, type:'LATE', icon:'danger',
        title:'Late purchase order',
        message:`${order.orderNumber} from ${order.supplier} is ${daysLate} day${daysLate === 1 ? '' : 's'} late.`
      });
    }
    if (status === 'Pending Approval') {
      alerts.push({
        id:`po-approval:${order.id}`, page:'purchases', time:timestampOf(order),
        priority:3, type:'PO', icon:'warning', title:'Approval needed',
        message:`${order.orderNumber} from ${order.supplier} is awaiting approval · ${formatCurrency(order.total)}.`
      });
    }
  });

  state.sales.filter(order => order.status === 'Pending').forEach(order => {
    alerts.push({
      id:`sales-new:${order.id}`, page:'sales', time:timestampOf(order),
      priority:2, type:'SO', icon:'info', title:'New sales order',
      message:`${order.orderNumber} from ${order.customer} · ${formatCurrency(order.total)}.`
    });
  });

  return alerts.sort((a, b) => b.priority - a.priority || b.time - a.time).slice(0, 30);
}

export function setProductNotifications(products) {
  state.products = [...products];
  renderNotifications();
}

export function setWarehouseNotifications(warehouses) {
  state.warehouses = [...warehouses];
  renderNotifications();
}

export function setPurchaseNotifications(orders) {
  state.purchases = [...orders];
  renderNotifications();
}

export function setSalesNotifications(orders) {
  state.sales = [...orders];
  renderNotifications();
}

export function renderNotifications() {
  const items = buildNotifications();
  const read = readIds();
  const unread = items.filter(item => !read.has(item.id)).length;
  const list = document.getElementById('order-notification-list');
  if (list) list.innerHTML = items.length ? items.map(item => `
    <button type="button" class="notif-item ${read.has(item.id) ? '' : 'unread'}" onclick="openOrderNotification('${item.page}')">
      <div class="notif-icon ${item.icon}">${item.type}</div>
      <div><div class="notif-text"><strong>${esc(item.title)}:</strong> ${esc(item.message)}</div>
      <div class="notif-time">${relativeTime(item.time)}</div></div>
    </button>`).join('') : `
      <div class="empty-state" style="padding:28px 18px">
        <h3>All clear</h3><p>No stock, capacity, order, or approval alerts.</p>
      </div>`;

  const dot = document.getElementById('notification-dot');
  if (dot) dot.hidden = unread === 0;
  const purchaseBadge = document.getElementById('purchase-nav-badge');
  const salesBadge = document.getElementById('sales-nav-badge');
  const purchaseAlerts = items.filter(item => item.page === 'purchases').length;
  const salesAlerts = items.filter(item => item.page === 'sales').length;
  if (purchaseBadge) { purchaseBadge.textContent = purchaseAlerts; purchaseBadge.hidden = !purchaseAlerts; }
  if (salesBadge) { salesBadge.textContent = salesAlerts; salesBadge.hidden = !salesAlerts; }
}

export function markAllOrderNotificationsRead() {
  localStorage.setItem(READ_KEY, JSON.stringify(buildNotifications().map(item => item.id)));
  renderNotifications();
}
window.markAllOrderNotificationsRead = markAllOrderNotificationsRead;

export function openOrderNotification(page) {
  window.navigate?.(page);
  document.getElementById('notif-panel')?.classList.remove('open');
}
window.openOrderNotification = openOrderNotification;
