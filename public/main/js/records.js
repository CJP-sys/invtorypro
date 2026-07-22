/** Owner-scoped Firestore workflows for customers, adjustments, and invitations. */
import { db, requireUser } from './firebase.js';
import { getProducts, loadProducts } from './products.js';
import { esc, toast, formatCurrency } from './utils.js';
import { openModal, closeModal } from './navigation.js';
import {
  collection, addDoc, getDocs, doc, query, where, orderBy,
  runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const state = { customers: [], adjustments: [], invitations: [] };

/** Loads every supporting collection and refreshes its view. */
export async function loadRecords() {
  try {
    const user = await requireUser();
    const owned = name => query(collection(db, name), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const results = await Promise.all(['customers', 'stockAdjustments', 'userInvitations'].map(name => getDocs(owned(name))));
    [state.customers, state.adjustments, state.invitations] = results.map(result => result.docs.map(item => ({ id: item.id, ...item.data() })));
    renderCustomers(); renderAdjustments(); renderInvitations(); populateProducts();
  } catch (error) {
    console.error('Could not load supporting records', error);
    toast('Could not load supporting records', 'error');
  }
}

/** Renders customer state. */
function renderCustomers() {
  const body = document.getElementById('customers-tbody');
  if (!body) return;
  body.innerHTML = state.customers.length ? state.customers.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.email)}</td><td>${esc(item.phone)}</td><td>${item.totalOrders}</td><td>${formatCurrency(item.totalSpent)}</td><td>${formatCurrency(item.balance)}</td><td><span class="badge success">${esc(item.status)}</span></td><td></td></tr>`).join('') : '<tr><td colspan="8" class="text-muted">No customers yet.</td></tr>';
}

/** Renders stock-adjustment state. */
function renderAdjustments() {
  const body = document.getElementById('adjustments-tbody');
  if (!body) return;
  body.innerHTML = state.adjustments.length ? state.adjustments.map(item => `<tr><td class="text-accent">${esc(item.reference)}</td><td>${esc(item.productName)}</td><td>${esc(item.type)}</td><td>${item.quantityChange}</td><td>${esc(item.reason)}</td><td>${esc(item.adjustedBy)}</td><td>${item.createdAt?.toDate?.().toLocaleDateString() || 'Today'}</td><td><span class="badge success">Applied</span></td></tr>`).join('') : '<tr><td colspan="8" class="text-muted">No stock adjustments recorded.</td></tr>';
}

/** Renders pending invitation state without presenting invitations as Auth users. */
function renderInvitations() {
  const body = document.getElementById('users-tbody');
  if (!body) return;
  body.innerHTML = state.invitations.length ? state.invitations.map(item => `<tr><td>${esc(item.email)}</td><td>${esc(item.role)}</td><td>Not signed in</td><td><span class="badge warning">${esc(item.status)}</span></td><td></td></tr>`).join('') : '<tr><td colspan="5" class="text-muted">No pending invitations.</td></tr>';
}

/** Populates product choices from current inventory state. */
function populateProducts() {
  const select = document.getElementById('adjustment-product');
  if (select) select.innerHTML = getProducts().map(item => `<option value="${item.id}">${esc(item.name)} (${item.stock})</option>`).join('') || '<option value="">No products available</option>';
}

/** Opens one of the record workflow modals. */
export function openRecordModal(name) { openModal(`${name}-modal`); }
window.openRecordModal = openRecordModal;

/** Creates a customer with zeroed accounting aggregates. */
export async function createCustomer() {
  const name = document.getElementById('customer-name')?.value.trim() || '';
  const email = document.getElementById('customer-email')?.value.trim() || '';
  const phone = document.getElementById('customer-phone')?.value.trim() || '';
  if (!name || !email) return toast('Customer name and email are required', 'error');
  const user = await requireUser();
  await addDoc(collection(db, 'customers'), { ownerId:user.uid, name, email, phone, totalOrders:0, totalSpent:0, balance:0, status:'Active', createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
  closeModal('customer-modal'); document.getElementById('customer-form')?.reset();
  await loadRecords(); toast('Customer created', 'success');
}
window.createCustomer = createCustomer;

/** Atomically applies stock movement and writes its audit record. */
export async function createAdjustment() {
  const productId = document.getElementById('adjustment-product')?.value || '';
  const type = document.getElementById('adjustment-type')?.value || 'Add';
  const quantity = Number(document.getElementById('adjustment-quantity')?.value || 0);
  const reason = document.getElementById('adjustment-reason')?.value.trim() || '';
  const product = getProducts().find(item => item.id === productId);
  if (!product || !Number.isInteger(quantity) || quantity < 1 || !reason) return toast('Complete all adjustment fields', 'error');
  const user = await requireUser();
  const delta = type === 'Add' ? quantity : -quantity;
  const productRef = doc(db, 'products', productId);
  const auditRef = doc(collection(db, 'stockAdjustments'));
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(productRef);
    const next = snapshot.data().stock + delta;
    if (!snapshot.exists() || snapshot.data().ownerId !== user.uid || next < 0) throw new Error('Invalid stock adjustment');
    transaction.update(productRef, { stock:next, status:next <= 0 ? 'Out of Stock' : next < 10 ? 'Low Stock' : 'In Stock', updatedAt:serverTimestamp() });
    transaction.set(auditRef, { ownerId:user.uid, reference:`ADJ-${Date.now().toString().slice(-8)}`, productId, productName:product.name, type, quantityChange:delta, reason, adjustedBy:user.displayName || user.email || 'User', createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
  });
  closeModal('adjustment-modal'); document.getElementById('adjustment-form')?.reset();
  await loadProducts(); await loadRecords(); toast('Stock adjustment applied', 'success');
}
window.createAdjustment = createAdjustment;

/** Stores a non-privileged account invitation for later admin provisioning. */
export async function createInvitation() {
  const email = document.getElementById('invite-email')?.value.trim() || '';
  const role = document.getElementById('invite-role')?.value || 'Viewer';
  if (!email) return toast('Invite email is required', 'error');
  const user = await requireUser();
  await addDoc(collection(db, 'userInvitations'), { ownerId:user.uid, email, role, status:'Pending', createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
  closeModal('invite-modal'); document.getElementById('invite-form')?.reset();
  await loadRecords(); toast('Invitation request saved', 'success');
}
window.createInvitation = createInvitation;
