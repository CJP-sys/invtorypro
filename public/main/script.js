/**
 * script.js — Entry Point
 * ─────────────────────────────────────────────────────
 * This file's only job is to import all modules in the
 * right order and boot the app.
 *
 * IMPORT ORDER MATTERS:
 *  1. utils.js        — no dependencies, must load first
 *  2. firebase.js     — no dependencies
 *  3. auth.js         — depends on firebase + utils
 *  4. navigation.js   — depends on utils
 *  5. products.js     — depends on firebase + utils + navigation
 *  6. import-export.js— depends on firebase + utils + products
 *  7. purchase-orders — depends on navigation + utils
 *  8. sales-orders.js — depends on utils
 *  9. suppliers.js    — depends on utils + navigation
 * 10. dashboard.js    — depends on utils (no circular deps)
 * 11. charts.js       — depends on nothing (reads from window)
 *
 * FILE STRUCTURE:
 *  public/
 *  ├── index.html          ← login page
 *  ├── login.css
 *  ├── login.js
 *  └── main/
 *      ├── index.html      ← dashboard shell (HTML only)
 *      ├── style.css
 *      ├── script.js       ← YOU ARE HERE
 *      └── js/
 *          ├── firebase.js
 *          ├── utils.js
 *          ├── auth.js
 *          ├── navigation.js
 *          ├── products.js
 *          ├── import-export.js
 *          ├── purchase-orders.js
 *          ├── sales-orders.js
 *          ├── suppliers.js
 *          ├── dashboard.js
 *          └── charts.js
 */

// ── 1. Shared utilities (no deps) ───────────────────
import { toast } from './js/utils.js';

// ── 2. Auth guard + sign-out ─────────────────────────
import './js/auth.js';

// ── 3. Navigation, sidebar, modals ───────────────────
import './js/navigation.js';

// ── 4. Products — load, render, CRUD ─────────────────
import { loadProducts, initSortHeaders } from './js/products.js';
import { loadWarehouses } from './js/warehouses.js';

// ── 5. Import / Export CSV ───────────────────────────
import './js/import-export.js';

// ── 6. Purchase Orders modal ─────────────────────────
import { loadPurchaseOrders } from './js/purchase-orders.js';

// ── 7. Sales Orders ───────────────────────────────────
import { loadSalesOrders } from './js/sales-orders.js';

// ── 8. Suppliers list + detail ───────────────────────
import { loadSuppliers } from './js/suppliers.js';
import { loadRecords } from './js/records.js';
import './js/notifications.js';
import './js/financials.js';
import { getAccessContext } from './js/access.js';
import { loadDemoDashboard } from './js/demo-mode.js';
import { applyBranding } from './js/branding.js';
import { initProductTour } from './js/tour.js';

// ── 9. Charts (dashboard boot deferred until after load)
import { initCharts } from './js/charts.js?v=20260723-2';

function clearLegacyDemoContent() {
  const emptyTables = [
    ['#page-adjustments tbody', 8, 'No stock adjustments recorded.'],
    ['#page-customers tbody', 8, 'No customers yet.'],
    ['#page-audit tbody', 6, 'No audit entries yet.'],
    ['#page-users tbody', 5, 'No user directory data available.']
  ];
  emptyTables.forEach(([selector, columns, message]) => {
    const body = document.querySelector(selector);
    if (body) body.innerHTML = `<tr><td colspan="${columns}" class="text-muted">${message}</td></tr>`;
  });
  const topProducts = document.querySelector('#page-dashboard table tbody');
  if (topProducts) topProducts.innerHTML = '<tr><td colspan="4" class="text-muted">Loading product data…</td></tr>';
  const activity = document.querySelector('#page-dashboard .activity-feed');
  if (activity) activity.innerHTML = '<div class="text-muted">No activity recorded yet.</div>';
  const notifications = document.querySelector('#notif-panel .notif-list');
  if (notifications) notifications.innerHTML = '<div class="text-muted" style="padding:16px">No notifications.</div>';
  document.querySelectorAll('input[type="date"][value]').forEach(input => input.removeAttribute('value'));
}

clearLegacyDemoContent();
applyBranding();

// ── EXPOSE toast globally ─────────────────────────────
// The inline <script> in index.html defines a basic window.toast.
// We replace it here with the full SVG version from utils.js.
window.toast = toast;

// ── INJECT PULSE ANIMATION ────────────────────────────
// Used by the table loading skeleton in products.js
const style = document.createElement('style');
style.textContent = `@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`;
document.head.appendChild(style);

/* ─── BOOT SEQUENCE ──────────────────────────────────────
   Order:
   1. Wire sort column headers (needs DOM to be ready)
   2. Render supplier list (static, instant)
   3. Load products from Firestore (async — shows skeleton)
   4. Init charts AFTER products load so the donut chart
      receives real stock counts on first paint
─────────────────────────────────────────────────────── */
async function bootApplication() {
  const access = await getAccessContext();
  if (!access.user) return;
  initProductTour();

  if (!access.isAdmin) {
    initCharts();
    loadDemoDashboard();
    return;
  }

  document.body.dataset.access = 'admin';
  initSortHeaders();
  loadSuppliers();
  loadSalesOrders();
  loadPurchaseOrders();
  await loadProducts();
  await loadWarehouses();
  loadRecords();
  setTimeout(initCharts, 150);
}

bootApplication();
