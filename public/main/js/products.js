/**
 * js/products.js
 * ─────────────────────────────────────────────────────
 * Everything related to the Products page:
 *  - Load from Firestore (with local cache fallback)
 *  - Render table with XSS-safe escaping
 *  - Search bar (live filtering)
 *  - Category + Status dropdown filters
 *  - Column sort (click header → asc/desc)
 *  - Pagination (10 rows per page, real buttons)
 *  - Add Product (modal → validate → Firestore write)
 *  - Edit Product (pre-fill modal → update Firestore)
 *  - Delete Product (confirm → Firestore delete)
 *  - Loading skeleton while fetching
 *
 * Other modules that need the products array should
 * import { getProducts } from './products.js'.
 */

import { db, requireUser }  from './firebase.js';
import { esc, toast, formatCurrency, getProductStatus } from './utils.js';
import { openModal, closeModal }                        from './navigation.js';
import { confirmDialog, errorDialog }                   from './dialogs.js';
import { setProductNotifications }                      from './notifications.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── CONSTANTS ──────────────────────────────────────── */
const PAGE_SIZE       = 10;
const CACHE_KEY       = 'ims-products-v2';

/* ─── MODULE STATE ───────────────────────────────────── */
let products         = [];    // full array loaded from Firestore
let editingProductId = null;  // null = add mode, string = edit mode
let currentPage      = 1;
let sortKey          = 'name';
let sortDir          = 'asc';

/* ─── PUBLIC GETTER ──────────────────────────────────────
   Used by dashboard.js and charts.js to read products
   without needing direct access to the private array.
─────────────────────────────────────────────────────── */
export function getProducts() { return products; }

/* ─── LOCAL STORAGE CACHE ────────────────────────────────
   WHY: Firestore charges per read. Cache means the table
   loads instantly on repeat visits while Firestore
   refreshes in the background.
─────────────────────────────────────────────────────── */
function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function loadCache() {
  try {
    const raw    = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/* ─── FIRESTORE DOC → LOCAL SHAPE ───────────────────── */
function mapDoc(snap) {
  const d     = snap.data();
  const stock = Number(d.stock ?? 0);
  return {
    id:          snap.id,
    name:        d.name        || 'Unnamed',
    sku:         d.sku         || snap.id.slice(0, 8).toUpperCase(),
    cat:         d.cat         || 'General',
    stock,
    price:       Number(d.price   ?? 0),
    reorder:     Number(d.reorder ?? 10),
    warehouse:   d.warehouse   || 'Main Warehouse',
    supplier:    d.supplier    || '',
    description: d.description || '',
    status:      getProductStatus(stock),
    createdAt:   d.createdAt,
    updatedAt:   d.updatedAt
  };
}

/* ─── LOAD FROM FIRESTORE ────────────────────────────────
   Shows a skeleton loader, fetches from Firestore,
   falls back to cache if offline.
   Calls updateDashboardSummary() after loading so the
   dashboard stat cards reflect real data.
─────────────────────────────────────────────────────── */
export async function loadProducts() {
  showTableLoading();
  try {
    const user = await requireUser();
    const snap = await getDocs(query(collection(db, 'products'), where('ownerId', '==', user.uid), orderBy('name')));
    products   = snap.docs.map(mapDoc);
    saveCache(products);
  } catch (err) {
    console.warn('Firestore unreachable — using cache', err);
    products = loadCache();
    toast(products.length
      ? 'Offline — showing cached data'
      : 'Could not connect to database',
      products.length ? 'warning' : 'error'
    );
  }
  setProductNotifications(products);

  // Notify dashboard and charts (imported lazily to avoid circular deps)
  import('./dashboard.js').then(m => m.updateDashboardSummary(products));

  currentPage = 1;
  renderProducts();
}

/* ─── SKELETON LOADER ─────────────────────────────────── */
function showTableLoading() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = Array(4).fill(`
    <tr>${Array(9).fill(`
      <td><div class="skeleton" style="height:14px"></div></td>
    `).join('')}</tr>`).join('');
}

/* ─── INPUT VALIDATION ───────────────────────────────────
   Runs before every Firestore write.
   Returns array of error strings — empty = valid.
   WHY: Never trust the browser. Validate here (frontend)
   AND ideally in Firestore security rules (backend).
─────────────────────────────────────────────────────── */
function validateProduct(d) {
  const errors = [];
  if (!d.name.trim())                    errors.push('Product name is required.');
  if (d.name.trim().length > 120)        errors.push('Name must be under 120 characters.');
  if (isNaN(d.price) || d.price < 0)     errors.push('Price must be 0 or a positive number.');
  if (isNaN(d.stock))                    errors.push('Stock must be a number.');
  if (d.stock < 0)                       errors.push('Stock cannot be negative.');
  if (!Number.isInteger(d.stock))        errors.push('Stock must be a whole number.');
  if (isNaN(d.reorder) || d.reorder < 0) errors.push('Reorder point cannot be negative.');
  return errors;
}

/* ─── SAVE PRODUCT (ADD + EDIT) ──────────────────────── */
async function saveProduct() {
  const name       = document.getElementById('pm-name')?.value.trim()    ?? '';
  const rawStock   = document.getElementById('pm-stock')?.value           ?? '';
  const rawPrice   = document.getElementById('pm-price')?.value           ?? '';
  const rawReorder = document.getElementById('pm-reorder')?.value         ?? '';

  const data = {
    name,
    sku:         document.getElementById('pm-sku')?.value.trim()
                   || `SKU-${Math.floor(Math.random() * 90000 + 10000)}`,
    cat:         document.getElementById('pm-cat')?.value       || 'General',
    stock:       rawStock   === '' ? NaN : parseInt(rawStock,   10),
    price:       rawPrice   === '' ? NaN : parseFloat(rawPrice),
    reorder:     rawReorder === '' ? 10  : parseInt(rawReorder, 10),
    warehouse:   document.getElementById('pm-warehouse')?.value || 'Main Warehouse',
    supplier:    document.getElementById('pm-supplier')?.value  || '',
    description: document.getElementById('pm-desc')?.value.trim() || ''
  };

  const errors = validateProduct(data);
  if (!document.getElementById('pm-warehouse')?.value) errors.push('Add an active warehouse before saving a product.');
  if (errors.length) { toast(errors[0], 'error'); return; }

  const payload = { ...data, status: getProductStatus(data.stock) };

  // Disable button to prevent double-submit
  const btn = document.querySelector('#product-modal .modal-footer .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const user = await requireUser();
    if (editingProductId) {
      await updateDoc(doc(db, 'products', editingProductId), { ...payload, updatedAt: serverTimestamp() });
      products = products.map(p =>
        p.id === editingProductId ? { ...p, ...payload, id: editingProductId } : p
      );
      toast(`${data.name} updated`, 'success');
    } else {
      const ref = await addDoc(collection(db, 'products'), {
        ...payload, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      products.unshift({ ...payload, id: ref.id });
      toast(`${data.name} added`, 'success');
    }

    saveCache(products);
    setProductNotifications(products);
    import('./dashboard.js').then(m => m.updateDashboardSummary(products));
    import('./warehouses.js').then(m => m.renderWarehouses());
    currentPage = 1;
    renderProducts();
    closeModal('product-modal');
  } catch (err) {
    console.error('Save failed', err);
    await errorDialog({ title:'Product could not be saved', message:'Your changes were not applied. Check the connection and try again.' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Product'; }
  }
}
window.saveProduct = saveProduct;

/* ─── EDIT — open modal pre-filled ─────────────────── */
function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('pm-name').value      = p.name        ?? '';
  document.getElementById('pm-sku').value       = p.sku         ?? '';
  document.getElementById('pm-cat').value       = p.cat         ?? 'Electronics';
  document.getElementById('pm-price').value     = p.price       ?? '';
  document.getElementById('pm-stock').value     = p.stock       ?? 0;
  document.getElementById('pm-reorder').value   = p.reorder     ?? 10;
  document.getElementById('pm-warehouse').value = p.warehouse   ?? 'Main Warehouse';
  document.getElementById('pm-supplier').value  = p.supplier    ?? '';
  document.getElementById('pm-desc').value      = p.description ?? '';
  openModal('product-modal');
}
window.editProduct = editProduct;

export function openProductModal(editId = null) {
  if (document.body.dataset.access === 'viewer') {
    toast('Administrator access is required to add products. Select Request Admin Access.', 'info');
    return;
  }
  if (editId) { editProduct(editId); return; }
  editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  resetProductForm();
  openModal('product-modal');
}
window.openProductModal = openProductModal;

function resetProductForm() {
  ['pm-name','pm-sku','pm-price','pm-stock','pm-reorder','pm-desc']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['pm-cat','pm-warehouse','pm-supplier']
    .forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
}
window.resetProductForm = resetProductForm;

// Override closeModal for product-modal to also reset form
const _origClose = window.closeModal;
window.closeModal = (id) => {
  _origClose?.(id);
  if (id === 'product-modal') { editingProductId = null; resetProductForm(); }
};

/* ─── DELETE ─────────────────────────────────────────── */
async function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p || !await confirmDialog({
    title: 'Delete product?',
    message: `Delete "${p.name}"? This cannot be undone.`,
    confirmText: 'Delete',
    danger: true
  })) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    products = products.filter(x => x.id !== id);
    saveCache(products);
    setProductNotifications(products);
    import('./dashboard.js').then(m => m.updateDashboardSummary(products));
    import('./warehouses.js').then(m => m.renderWarehouses());
    const maxPage = Math.max(1, Math.ceil(getFiltered().length / PAGE_SIZE));
    if (currentPage > maxPage) currentPage = maxPage;
    renderProducts();
    toast(`${p.name} deleted`, 'warning');
  } catch (err) {
    console.error('Delete failed', err);
    await errorDialog({ title:'Product could not be deleted', message:'The product remains in inventory. Check the connection and try again.' });
  }
}
window.deleteProduct = deleteProduct;

/* ─── FILTER + SORT ──────────────────────────────────── */
function getFiltered() {
  const q      = (document.getElementById('product-search')?.value ?? '').trim().toLowerCase();
  const cat    = document.getElementById('category-filter')?.value ?? '';
  const status = document.getElementById('status-filter')?.value   ?? '';

  let list = products.filter(p => {
    if (q && !(
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)  ||
      p.cat.toLowerCase().includes(q)
    )) return false;
    if (cat    && p.cat    !== cat)    return false;
    if (status && p.status !== status) return false;
    return true;
  });

  // Sort — numeric columns treated as numbers, others as strings
  return [...list].sort((a, b) => {
    let va = a[sortKey] ?? '';
    let vb = b[sortKey] ?? '';
    if (['stock','price','reorder'].includes(sortKey)) {
      va = Number(va); vb = Number(vb);
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 :  1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });
}

/* ─── RENDER TABLE ───────────────────────────────────── */
function renderProducts() {
  const tbody   = document.getElementById('products-tbody');
  const countEl = document.getElementById('products-count');
  if (!tbody) return;

  const filtered   = getFiltered();
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start     = (currentPage - 1) * PAGE_SIZE;
  const pageSlice = filtered.slice(start, start + PAGE_SIZE);

  if (!total) {
    tbody.innerHTML = `
      <tr><td colspan="9" style="text-align:center;padding:48px 20px">
        <div style="color:var(--text-muted)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               style="width:40px;height:40px;margin-bottom:10px;opacity:0.4;display:block;margin:0 auto 10px">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          ${products.length === 0
            ? '<strong style="color:var(--text-secondary)">No products yet</strong><br><span style="font-size:13px">Click <strong>Add Product</strong> to get started.</span>'
            : '<strong style="color:var(--text-secondary)">No matches</strong><br><span style="font-size:13px">Try a different search term or clear the filters.</span>'
          }
        </div>
      </td></tr>`;
    if (countEl) countEl.textContent = 'Showing 0 products';
    renderPager(0, 0);
    return;
  }

  tbody.innerHTML = pageSlice.map(p => {
    const badge      = p.status === 'In Stock' ? 'success' : p.status === 'Low Stock' ? 'warning' : 'danger';
    const stockPct   = Math.min(100, Math.round((p.stock / 150) * 100));
    const stockClass = p.stock === 0 ? 'out' : p.stock < 15 ? 'low' : 'good';
    const safeId     = esc(p.id);
    const actions    = `
      <button class="btn btn-ghost btn-xs"  onclick="editProduct('${safeId}')">Edit</button>
      <button class="btn btn-danger btn-xs" onclick="deleteProduct('${safeId}')">Delete</button>
      ${p.stock <= p.reorder
        ? `<button class="btn btn-primary btn-xs" onclick="openPOModal()">Reorder</button>`
        : ''}`;

    return `<tr>
      <td><input type="checkbox" style="width:16px"></td>
      <td>
        <div style="font-weight:500">${esc(p.name)}</div>
        ${p.description
          ? `<div style="font-size:11px;color:var(--text-muted)">
               ${esc(p.description.slice(0,60))}${p.description.length > 60 ? '…' : ''}
             </div>`
          : ''}
      </td>
      <td class="text-muted">${esc(p.sku)}</td>
      <td><span class="badge info">${esc(p.cat)}</span></td>
      <td>
        <div class="stock-bar-wrap">
          <span style="font-size:13px;min-width:28px">${p.stock}</span>
          <div class="stock-bar">
            <div class="stock-fill ${stockClass}" style="width:${stockPct}%"></div>
          </div>
        </div>
      </td>
      <td>${formatCurrency(p.price)}</td>
      <td class="text-muted" style="font-size:12px">${esc(p.warehouse)}</td>
      <td><span class="badge ${badge}">${esc(p.status)}</span></td>
      <td><div class="btn-group">${actions}</div></td>
    </tr>`;
  }).join('');

  const rangeEnd = Math.min(start + PAGE_SIZE, total);
  if (countEl) countEl.textContent =
    `Showing ${start + 1}–${rangeEnd} of ${total.toLocaleString()} product${total !== 1 ? 's' : ''}`;

  renderPager(currentPage, totalPages);
  updateSortIndicators();
}

/* ─── PAGINATION ─────────────────────────────────────── */
function renderPager(page, totalPages) {
  const countEl = document.getElementById('products-count');
  const pagerEl = countEl?.nextElementSibling;
  if (!pagerEl) return;
  if (totalPages <= 1) { pagerEl.innerHTML = ''; return; }

  const btns = [];
  btns.push(`<button class="btn btn-ghost btn-sm"
    ${page <= 1 ? 'disabled style="opacity:0.4"' : ''}
    onclick="changePage(${page - 1})">← Prev</button>`);

  getPageRange(page, totalPages).forEach(i =>
    btns.push(`<button class="btn ${i === page ? 'btn-secondary' : 'btn-ghost'} btn-sm"
      onclick="changePage(${i})">${i}</button>`)
  );

  btns.push(`<button class="btn btn-ghost btn-sm"
    ${page >= totalPages ? 'disabled style="opacity:0.4"' : ''}
    onclick="changePage(${page + 1})">Next →</button>`);

  pagerEl.innerHTML = btns.join('');
}

function getPageRange(page, total) {
  const start = Math.max(1, page - 2);
  const end   = Math.min(total, page + 2);
  const range = [];
  for (let i = start; i <= end; i++) range.push(i);
  return range;
}

function changePage(page) {
  currentPage = page;
  renderProducts();
  document.getElementById('products-tbody')
    ?.closest('.card')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.changePage = changePage;

/* ─── COLUMN SORT ─────────────────────────────────────── */
const SORT_KEYS = {
  'Product':    'name',
  'SKU':        'sku',
  'Category':   'cat',
  'Stock':      'stock',
  'Unit Price': 'price',
  'Warehouse':  'warehouse',
  'Status':     'status'
};

export function initSortHeaders() {
  const thead = document.querySelector('#products-table thead tr');
  if (!thead) return;
  thead.querySelectorAll('th').forEach(th => {
    const key = SORT_KEYS[th.textContent.trim()];
    if (!key) return;
    th.style.cursor = 'pointer';
    th.title        = `Sort by ${th.textContent.trim()}`;
    th.addEventListener('click', () => {
      sortDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
      sortKey = key;
      currentPage = 1;
      renderProducts();
    });
  });
}

function updateSortIndicators() {
  document.querySelector('#products-table thead tr')
    ?.querySelectorAll('th')
    .forEach(th => {
      th.textContent = th.textContent.replace(/ [↑↓]$/, '');
      const key = SORT_KEYS[th.textContent.trim()];
      if (key && key === sortKey) th.textContent += sortDir === 'asc' ? ' ↑' : ' ↓';
    });
}

/* ─── SEARCH & FILTER LISTENERS ─────────────────────── */
document.getElementById('product-search')  ?.addEventListener('input',  () => { currentPage = 1; renderProducts(); });
document.getElementById('category-filter') ?.addEventListener('change', () => { currentPage = 1; renderProducts(); });
document.getElementById('status-filter')   ?.addEventListener('change', () => { currentPage = 1; renderProducts(); });
