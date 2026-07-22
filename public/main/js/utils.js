/**
 * js/utils.js
 * ─────────────────────────────────────────────────────
 * Pure helper functions with zero side effects.
 * Import these anywhere — no Firebase, no DOM globals.
 */

/* ─── XSS PROTECTION ───────────────────────────────────
   WHY: Any string that came from user input must pass
   through esc() before being put into innerHTML.
   Example: a product named <script>alert(1)</script>
   becomes &lt;script&gt;alert(1)&lt;/script&gt; and
   renders as harmless text instead of running as code.
─────────────────────────────────────────────────────── */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* ─── TOAST NOTIFICATIONS ───────────────────────────────
   Shows a small pop-up at bottom-right that auto-removes.
   type: 'success' | 'error' | 'warning' | 'info'
─────────────────────────────────────────────────────── */
export function toast(msg, type = 'info') {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                style="width:18px;height:18px;flex-shrink:0;color:#2ecc71">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                style="width:18px;height:18px;flex-shrink:0;color:#e74c3c">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                style="width:18px;height:18px;flex-shrink:0;color:#f39c12">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                style="width:18px;height:18px;flex-shrink:0;color:#3498db">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>`
  };

  const el = document.createElement('div');
  el.className    = `toast ${type}`;
  el.style.cssText = 'display:flex;align-items:center;gap:10px';
  el.innerHTML    = `${icons[type] || icons.info}<span>${esc(msg)}</span>`;

  document.getElementById('toast-container')?.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ─── CURRENCY FORMAT ───────────────────────────────────
   Formats a number as Philippine Peso.
   formatCurrency(4000) → "₱4,000"
─────────────────────────────────────────────────────── */
export function formatCurrency(val) {
  let currency = 'PHP';
  let locale = 'en-PH';
  try {
    const branding = JSON.parse(localStorage.getItem('inventory-pro-branding-v1') || '{}');
    currency = branding.currency || currency;
    locale = branding.locale || locale;
  } catch {}
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2
  }).format(Number(val || 0));
}

/* ─── PRODUCT STATUS ────────────────────────────────────
   Derives status label from stock count.
   Single rule defined once — used by products.js
   AND import-export.js so they never disagree.
─────────────────────────────────────────────────────── */
export function getProductStatus(stock) {
  if (stock <= 0) return 'Out of Stock';
  if (stock < 10) return 'Low Stock';
  return 'In Stock';
}
