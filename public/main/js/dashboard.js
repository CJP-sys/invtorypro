/**
 * js/dashboard.js
 * ─────────────────────────────────────────────────────
 * Dashboard summary cards and product list widget.
 * Called by products.js after every load/save/delete
 * so the cards always reflect real data.
 *
 * Receives the products array as a parameter instead of
 * importing it — avoids circular dependency between
 * dashboard.js ↔ products.js.
 */

import { esc, formatCurrency } from './utils.js';

/* ─── UPDATE SUMMARY CARDS ───────────────────────────────
   Called with the current products array.
   Updates every stat card and the mini product list.
─────────────────────────────────────────────────────── */
export function updateDashboardSummary(products = []) {
  const total    = products.length;
  const inStock  = products.filter(p => p.stock >= 10).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;
  const outStock = products.filter(p => p.stock <= 0).length;
  const value    = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  // Helper — silently skips IDs that don't exist in DOM
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('dashboard-total-products',     total.toLocaleString());
  set('dashboard-low-stock',          lowStock.toLocaleString());
  set('dashboard-out-of-stock',       outStock.toLocaleString());
  set('dashboard-inventory-value',    formatCurrency(value));
  set('dashboard-in-stock-count',     `${inStock} items`);
  set('dashboard-low-stock-count',    `${lowStock} items`);
  set('dashboard-out-of-stock-count', `${outStock} items`);

  // Mini product list on dashboard
  const listEl = document.getElementById('dashboard-product-list');
  if (listEl) {
    listEl.innerHTML = total === 0
      ? `<div style="font-size:13px;color:var(--text-muted)">
           No products yet — add one in the Products page.
         </div>`
      : products.slice(0, 5).map(p => `
          <div style="padding:8px 10px;background:var(--bg-surface);border-radius:8px;
               display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div>
              <div style="font-size:13px;font-weight:600">${esc(p.name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${esc(p.sku)} · ${esc(p.cat)}</div>
            </div>
            <span class="badge ${
              p.status === 'Out of Stock' ? 'danger'
              : p.status === 'Low Stock'  ? 'warning'
              : 'success'
            }">
              ${p.stock} in stock
            </span>
          </div>`).join('');
  }

  const topProducts = document.querySelector('#page-dashboard table tbody');
  if (topProducts) {
    topProducts.innerHTML = products.length ? [...products]
      .sort((a, b) => (b.stock * b.price) - (a.stock * a.price))
      .slice(0, 5)
      .map(product => `<tr>
        <td><strong>${esc(product.name)}</strong><div class="text-muted">${esc(product.sku)}</div></td>
        <td>${esc(product.cat)}</td><td>${product.stock}</td>
        <td>${formatCurrency(product.stock * product.price)}</td>
      </tr>`).join('') : '<tr><td colspan="4" class="text-muted">No products yet.</td></tr>';
  }

  // Update the stock donut chart if it already exists
  // The chart instance is owned by charts.js — we reach it
  // through the window so we don't need to import charts.js here.
  if (window.__stockHealthChart) {
    window.__stockHealthChart.data.datasets[0].data = [inStock, lowStock, outStock];
    window.__stockHealthChart.update();
  }
}
