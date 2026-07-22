/** Builds notifications and badges from loaded purchase and sales orders. */
import { esc, formatCurrency } from './utils.js';

const READ_KEY = 'inventory-pro-orders-read-at';
const state = { purchases: [], sales: [] };

function timestampOf(order) {
  return order.updatedAt?.toMillis?.() || order.createdAt?.toMillis?.() || 0;
}

function relativeTime(time) {
  if (!time) return 'Just now';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function setPurchaseNotifications(orders) {
  state.purchases = [...orders];
  renderNotifications();
}

export function setSalesNotifications(orders) {
  state.sales = [...orders];
  renderNotifications();
}

function buildNotifications() {
  const purchases = state.purchases.map(order => ({
    page:'purchases', time:timestampOf(order), type:'PO',
    title:order.status === 'Pending Approval' ? 'Purchase approval needed' : 'Purchase order updated',
    message:`${order.orderNumber} · ${order.supplier} · ${formatCurrency(order.total)} · ${order.status}`
  }));
  const sales = state.sales.map(order => ({
    page:'sales', time:timestampOf(order), type:'SO',
    title:order.status === 'Pending' ? 'New sales order' : 'Sales order updated',
    message:`${order.orderNumber} · ${order.customer} · ${formatCurrency(order.total)} · ${order.status}`
  }));
  return [...purchases, ...sales].sort((a,b) => b.time - a.time).slice(0,20);
}

export function renderNotifications() {
  const items = buildNotifications();
  const readAt = Number(localStorage.getItem(READ_KEY) || 0);
  const unread = items.filter(item => item.time > readAt).length;
  const list = document.getElementById('order-notification-list');
  if (list) list.innerHTML = items.length ? items.map(item => `
    <button type="button" class="notif-item ${item.time > readAt ? 'unread' : ''}" onclick="openOrderNotification('${item.page}')">
      <div class="notif-icon info">${item.type}</div>
      <div><div class="notif-text"><strong>${esc(item.title)}:</strong> ${esc(item.message)}</div>
      <div class="notif-time">${relativeTime(item.time)}</div></div>
    </button>`).join('') : '<div class="text-muted" style="padding:18px">No order notifications.</div>';

  const dot = document.getElementById('notification-dot');
  if (dot) dot.hidden = unread === 0;
  const purchaseBadge = document.getElementById('purchase-nav-badge');
  const salesBadge = document.getElementById('sales-nav-badge');
  const pendingPurchases = state.purchases.filter(order => order.status === 'Pending Approval').length;
  const activeSales = state.sales.filter(order => order.status !== 'Completed').length;
  if (purchaseBadge) { purchaseBadge.textContent = pendingPurchases; purchaseBadge.hidden = !pendingPurchases; }
  if (salesBadge) { salesBadge.textContent = activeSales; salesBadge.hidden = !activeSales; }
}

export function markAllOrderNotificationsRead() {
  localStorage.setItem(READ_KEY, String(Date.now()));
  renderNotifications();
}
window.markAllOrderNotificationsRead = markAllOrderNotificationsRead;

export function openOrderNotification(page) {
  window.navigate?.(page);
  document.getElementById('notif-panel')?.classList.remove('open');
}
window.openOrderNotification = openOrderNotification;
