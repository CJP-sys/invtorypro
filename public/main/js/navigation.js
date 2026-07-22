/**
 * js/navigation.js
 * ─────────────────────────────────────────────────────
 * Handles all UI navigation:
 *  - navigate(page) — shows the right page, updates topbar
 *  - Sidebar collapse toggle
 *  - Notification panel open/close
 *  - Modal open/close helpers (used by all modules)
 *
 * Exports navigate() and modal helpers so other modules
 * can trigger navigation without importing the whole nav.
 */

/* ─── PAGE METADATA ──────────────────────────────────── */
const PAGE_NAMES = {
  dashboard:   'Dashboard',
  products:    'Products',
  warehouses:  'Warehouses',
  adjustments: 'Stock Adjustments',
  purchases:   'Purchase Orders',
  sales:       'Sales Orders',
  suppliers:   'Suppliers',
  customers:   'Customers',
  reports:     'Reports & Analytics',
  audit:       'Audit Trail',
  users:       'User Management',
  settings:    'Settings'
};

const PAGE_SUBS = {
  dashboard:   'Welcome back',
  products:    'Manage your product catalog',
  warehouses:  'Multi-location warehouse management',
  adjustments: 'Stock count corrections',
  purchases:   'Procurement & receiving',
  sales:       'Customer orders & deliveries',
  suppliers:   'Vendor relationships',
  customers:   'Customer records & CRM',
  reports:     'Business intelligence & exports',
  audit:       'Complete activity history',
  users:       'Roles, permissions & access',
  settings:    'System configuration'
};

/* ─── NAVIGATE ───────────────────────────────────────────
   Shows the page matching `page` key, hides all others.
   Updates the topbar title and subtitle.
   If switching to 'reports', fires chart init (lazy).
─────────────────────────────────────────────────────── */
export function navigate(page) {
  // Hide all pages, deactivate all nav items
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show the target page
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  // Update topbar text
  const titleEl    = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  if (titleEl)    titleEl.textContent    = PAGE_NAMES[page] || page;
  if (subtitleEl) subtitleEl.textContent = PAGE_SUBS[page]  || '';

  // Reports page needs chart init on first visit
  // Import is dynamic so chart code isn't loaded until needed
  if (page === 'reports') {
    import('./charts.js').then(m => setTimeout(m.initReportCharts, 100));
  }
  if (matchMedia('(max-width:600px)').matches) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  }
}

// Make navigate available to onclick="navigate(...)" in HTML
window.navigate = navigate;

/* ─── WIRE NAV ITEMS & STAT CARDS ───────────────────── */
document.querySelectorAll('.nav-item[data-page]').forEach(el =>
  el.addEventListener('click', () => navigate(el.dataset.page))
);
document.querySelectorAll('.stat-card[data-page]').forEach(el =>
  el.addEventListener('click', () => navigate(el.dataset.page))
);

/* ─── SIDEBAR COLLAPSE ───────────────────────────────── */
document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (matchMedia('(max-width:600px)').matches) sidebar?.classList.toggle('mobile-open');
  else sidebar?.classList.toggle('collapsed');
});
document.getElementById('sidebar-backdrop')?.addEventListener('click', () =>
  document.getElementById('sidebar')?.classList.remove('mobile-open')
);

/* ─── NOTIFICATION PANEL ─────────────────────────────── */
document.getElementById('notif-btn')?.addEventListener('click', () =>
  document.getElementById('notif-panel')?.classList.toggle('open')
);
document.getElementById('close-notif')?.addEventListener('click', () =>
  document.getElementById('notif-panel')?.classList.remove('open')
);

/* ─── MODAL HELPERS ──────────────────────────────────────
   Exported so products.js, suppliers.js, etc. can call
   openModal / closeModal without importing navigation.
─────────────────────────────────────────────────────── */
export function openModal(id) {
  document.getElementById(id)?.classList.add('show');
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
}

// Close any modal when clicking the dark overlay behind it
document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  })
);

// Expose to HTML onclick attributes
window.openModal  = openModal;
window.closeModal = closeModal;
