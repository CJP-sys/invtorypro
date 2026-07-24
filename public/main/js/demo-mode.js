/** Read-only presentation data. Nothing in this file reads or writes Firestore. */
import { updateDashboardSummary } from './dashboard.js';

const DEMO_PRODUCTS = [
  { name:'Samsung Galaxy A55', sku:'SKU-0041', cat:'Electronics', stock:142, price:4000, warehouse:'Main Warehouse', status:'In Stock' },
  { name:'Mechanical Keyboard K7', sku:'SKU-0089', cat:'Peripherals', stock:34, price:3000, warehouse:'Main Warehouse', status:'In Stock' },
  { name:'USB-C Hub Pro 7-in-1', sku:'SKU-0112', cat:'Accessories', stock:28, price:1500, warehouse:'Cebu Branch', status:'In Stock' },
  { name:'Wireless Earbuds X3', sku:'SKU-0067', cat:'Electronics', stock:8, price:2000, warehouse:'Main Warehouse', status:'Low Stock' },
  { name:'Ergonomic Mouse M200', sku:'SKU-0095', cat:'Peripherals', stock:55, price:1500, warehouse:'Main Warehouse', status:'In Stock' },
  { name:'HDMI Cable 2m', sku:'SKU-0204', cat:'Accessories', stock:5, price:350, warehouse:'Main Warehouse', status:'Low Stock' },
  { name:'Screen Cleaner Kit', sku:'SKU-0311', cat:'Accessories', stock:3, price:250, warehouse:'Davao Hub', status:'Low Stock' },
  { name:'Laptop Stand LS-Pro', sku:'SKU-0188', cat:'Accessories', stock:0, price:1800, warehouse:'Main Warehouse', status:'Out of Stock' },
  { name:'USB Flash Drive 64GB', sku:'SKU-0219', cat:'Accessories', stock:112, price:450, warehouse:'Cebu Branch', status:'In Stock' },
  { name:'Laptop Sleeve 15"', sku:'SKU-0275', cat:'Accessories', stock:44, price:680, warehouse:'Main Warehouse', status:'In Stock' }
];

/** Recreates the supplied viewer product table without enabling any mutations. */
function renderDemoProducts() {
  const body = document.getElementById('products-tbody');
  if (!body) return;
  const query = (document.getElementById('product-search')?.value || '').trim().toLowerCase();
  const category = document.getElementById('category-filter')?.value || '';
  const status = document.getElementById('status-filter')?.value || '';
  const visible = DEMO_PRODUCTS.filter(product =>
    (!query || [product.name, product.sku, product.cat, product.warehouse].some(value => value.toLowerCase().includes(query))) &&
    (!category || product.cat === category) && (!status || product.status === status)
  );
  body.innerHTML = visible.length ? visible.map(product => {
    const badge = product.status === 'In Stock' ? 'success' : product.status === 'Low Stock' ? 'warning' : 'danger';
    return `<tr>
      <td><input type="checkbox" aria-label="Select ${product.name}"></td>
      <td><strong>${product.name}</strong></td><td class="text-muted">${product.sku}</td>
      <td><span class="badge info">${product.cat}</span></td><td>${product.stock}</td>
      <td>₱${product.price.toLocaleString()}</td><td class="text-muted">${product.warehouse}</td>
      <td><span class="badge ${badge}">${product.status}</span></td>
      <td><button class="btn btn-ghost btn-xs" onclick="requestAdminAccess()">Request Admin Access</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="9" class="text-muted" style="text-align:center;padding:36px">No sample products match these filters.</td></tr>';
  const count = document.getElementById('products-count');
  if (count) count.textContent = `Showing ${visible.length} of ${DEMO_PRODUCTS.length} sample products`;
}

/** Makes discovery controls real while all business mutations remain simulated. */
function wireDemoInteractions() {
  ['product-search', 'category-filter', 'status-filter'].forEach(id => {
    const element = document.getElementById(id);
    element?.addEventListener(id === 'product-search' ? 'input' : 'change', renderDemoProducts);
  });

  document.getElementById('global-search')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const productSearch = document.getElementById('product-search');
    if (productSearch) productSearch.value = event.currentTarget.value;
    window.navigate?.('products');
    renderDemoProducts();
  });

  document.addEventListener('submit', event => {
    if (document.body.dataset.access !== 'viewer') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.toast?.('Administrator access is required to save changes. Select Request Admin Access.', 'info');
  }, true);

  document.addEventListener('click', event => {
    if (document.body.dataset.access !== 'viewer') return;
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.getAttribute('onclick') || '';
    const label = button.textContent.trim();
    const previewSafe = /saveBrandingSettings|saveCurrencySettings/.test(action);
    const blocked = !previewSafe && (['import-btn', 'export-btn'].includes(button.id) ||
      /saveProduct|submitPO|createSalesOrder|saveWarehouse|advanceOrderStatus/.test(action) ||
      /^(Create|Apply|Save Invitation|Save Changes|Update Password)$/i.test(label));
    if (!blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.toast?.('Administrator access is required for this action. Select Request Admin Access.', 'info');
  }, true);
}

/** Labels every protected control so clients understand why it is restricted. */
function markAdminControls() {
  const selectors = [
    '#import-btn', '#export-btn',
    'button[onclick*="openProductModal"]', 'button[onclick*="openWarehouseModal"]',
    'button[onclick*="openPOModal"]', 'button[onclick*="openSalesOrderModal"]',
    'button[onclick*="openSupplierModal"]', 'button[onclick*="openRecordModal"]',
    'button[onclick*="submitPO"]', 'button[onclick*="saveProduct"]',
    'button[onclick*="saveWarehouse"]', 'button[onclick*="createSalesOrder"]'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(button => {
    button.dataset.adminRequired = 'true';
    button.title = 'Administrator access required';
  });
}

/** Paints sample metrics and restricts the viewer to the dashboard. */
export function loadDemoDashboard() {
  document.body.dataset.access = 'viewer';
  document.getElementById('demo-mode-badge')?.removeAttribute('hidden');
  document.getElementById('request-admin-btn')?.removeAttribute('hidden');
  document.querySelectorAll('#sidebar .nav-group').forEach(group => { group.hidden = false; });
  renderDemoProducts();
  const warehouseList = document.getElementById('warehouse-list');
  if (warehouseList) warehouseList.innerHTML = [
    ['Main Warehouse','Quezon City, Metro Manila','842','68%','Jose Reyes'],
    ['Cebu Branch','Mandaue City, Cebu','312','41%','Ana Cruz'],
    ['Davao Hub','Davao City, Davao del Sur','130','22%','Ben Lim']
  ].map(([name,address,products,capacity,manager]) => `<div class="card" style="border-top:3px solid var(--accent)">
    <div style="font-size:16px;font-weight:600;margin-bottom:6px">${name}</div>
    <div class="text-muted" style="font-size:12px;margin-bottom:12px">${address}</div>
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
      <div class="flex-between"><span class="text-muted">Total Products</span><span>${products}</span></div>
      <div class="flex-between"><span class="text-muted">Capacity</span><span>${capacity}</span></div>
      <div class="flex-between"><span class="text-muted">Manager</span><span>${manager}</span></div>
      <div class="flex-between"><span class="text-muted">Status</span><span class="badge success">Active</span></div>
    </div></div>`).join('');
  const addProduct = document.querySelector('button[onclick="openProductModal()"]');
  if (addProduct) {
    addProduct.title = 'Administrator access required';
    addProduct.dataset.adminRequired = 'true';
  }
  markAdminControls();
  wireDemoInteractions();
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  updateDashboardSummary(DEMO_PRODUCTS);
  set('dashboard-suppliers', '12');
  set('dashboard-sales-orders', '148');
  set('dashboard-purchase-orders', '37');
  set('dashboard-revenue', '₱486,000');
  set('financial-revenue', '₱486,000');
  set('financial-expenses', '₱312,000');
  set('financial-profit', '₱174,000');
  set('financial-margin', '35.8%');
  set('page-subtitle', 'Read-only product demonstration');
  const activity = document.querySelector('#page-dashboard .activity-feed');
  if (activity) activity.innerHTML = '<div class="text-muted">Demo activity: 8 orders fulfilled, 3 purchase orders approved, and 2 stock alerts generated today.</div>';
  const notifications = document.getElementById('order-notification-list');
  if (notifications) notifications.innerHTML = `
    <button class="notif-item unread" onclick="navigate('products')"><div class="notif-icon danger">OUT</div><div><div class="notif-text"><strong>Out of stock:</strong> Laptop Stand LS-Pro has no units remaining.</div><div class="notif-time">2 minutes ago</div></div></button>
    <button class="notif-item unread" onclick="navigate('warehouses')"><div class="notif-icon danger">CAP</div><div><div class="notif-text"><strong>Warehouse over capacity:</strong> Manila Hub is at 108% capacity.</div><div class="notif-time">12 minutes ago</div></div></button>
    <button class="notif-item unread" onclick="navigate('purchases')"><div class="notif-icon warning">LATE</div><div><div class="notif-text"><strong>Late purchase order:</strong> PO-1091 is 3 days overdue.</div><div class="notif-time">35 minutes ago</div></div></button>
    <button class="notif-item unread" onclick="navigate('purchases')"><div class="notif-icon warning">PO</div><div><div class="notif-text"><strong>Approval needed:</strong> Purchase order PO-1092 is awaiting approval.</div><div class="notif-time">1 hour ago</div></div></button>
    <button class="notif-item unread" onclick="navigate('sales')"><div class="notif-icon info">SO</div><div><div class="notif-text"><strong>New sales order:</strong> SO-2847 from Juan Dela Cruz.</div><div class="notif-time">2 hours ago</div></div></button>`;
  document.getElementById('notification-dot')?.removeAttribute('hidden');
  requestAnimationFrame(() => {
    if (window.__stockHealthChart) {
      window.__stockHealthChart.data.datasets[0].data = [3, 2, 1];
      window.__stockHealthChart.update();
    }
  });
}
