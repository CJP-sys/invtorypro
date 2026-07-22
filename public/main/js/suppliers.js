import { db, requireUser } from './firebase.js';
import { esc, toast, formatCurrency } from './utils.js';
import { openModal, closeModal } from './navigation.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let suppliers = [];

export async function loadSuppliers() {
  try {
    const user = await requireUser();
    const snapshot = await getDocs(query(
      collection(db, 'suppliers'),
      where('ownerId', '==', user.uid),
      orderBy('name')
    ));
    suppliers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderSuppliers();
    populateSupplierSelects();
    const count = document.getElementById('dashboard-suppliers');
    if (count) count.textContent = suppliers.length;
  } catch (error) {
    console.error('Could not load suppliers', error);
    suppliers = [];
    renderSuppliers();
    toast('Could not load suppliers', 'error');
  }
}

export function renderSuppliers() {
  const listEl = document.getElementById('supplier-list');
  if (!listEl) return;
  listEl.innerHTML = suppliers.length ? suppliers.map((supplier, index) => `
    <button type="button" onclick="showSupplierDetail(${index})"
      style="padding:12px;background:var(--bg-surface);border:0;border-radius:8px;color:inherit;text-align:left;cursor:pointer">
      <div style="font-size:14px;font-weight:500">${esc(supplier.name)}</div>
      <div style="font-size:12px;color:var(--text-muted)">${supplier.orders || 0} orders</div>
    </button>`).join('') : '<div class="text-muted">No suppliers yet.</div>';
}

function populateSupplierSelects() {
  const options = suppliers.length
    ? suppliers.map(supplier => `<option value="${esc(supplier.name)}">${esc(supplier.name)}</option>`).join('')
    : '<option value="">No suppliers available</option>';
  document.querySelectorAll('#pm-supplier, #po-supplier').forEach(select => {
    select.innerHTML = options;
  });
}

export function showSupplierDetail(index) {
  const supplier = suppliers[index];
  const el = document.getElementById('supplier-detail');
  if (!el || !supplier) return;
  el.innerHTML = `
    <div style="font-size:18px;font-weight:600">${esc(supplier.name)}</div>
    <div class="text-muted">${esc(supplier.contact || '')}</div>
    <hr class="divider">
    <div class="flex-between"><span>Orders</span><span>${supplier.orders || 0}</span></div>
    <div class="flex-between"><span>Total spent</span><span>${formatCurrency(supplier.spent || 0)}</span></div>`;
}
window.showSupplierDetail = showSupplierDetail;

/** Opens the supplier creation form. */
export function openSupplierModal() { openModal('supplier-modal'); }
window.openSupplierModal = openSupplierModal;

/** Validates and creates an owner-scoped supplier record. */
export async function createSupplier() {
  const name = document.getElementById('supplier-name')?.value.trim() || '';
  const contact = document.getElementById('supplier-email')?.value.trim() || '';
  const phone = document.getElementById('supplier-phone')?.value.trim() || '';
  if (!name || !contact) return toast('Supplier name and email are required', 'error');
  const user = await requireUser();
  await addDoc(collection(db, 'suppliers'), {
    ownerId:user.uid, name, contact, phone, rating:0, orders:0, spent:0,
    status:'Active', createdAt:serverTimestamp(), updatedAt:serverTimestamp()
  });
  closeModal('supplier-modal'); document.getElementById('supplier-form')?.reset();
  await loadSuppliers(); toast('Supplier created', 'success');
}
window.createSupplier = createSupplier;
