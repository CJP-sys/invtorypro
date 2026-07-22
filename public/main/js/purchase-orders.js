import { db, requireUser } from './firebase.js';
import { openModal, closeModal } from './navigation.js';
import { esc, toast, formatCurrency } from './utils.js';
import { setPurchaseNotifications } from './notifications.js';
import { setFinancialPurchases } from './financials.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function openPOModal() {
  openModal('po-modal');
}
window.openPOModal = openPOModal;

export function addPOItem() {
  const tbody = document.getElementById('po-items');
  if (!tbody?.rows[0]) return;
  const row = tbody.rows[0].cloneNode(true);
  row.querySelectorAll('input').forEach(input => { input.value = ''; });
  tbody.appendChild(row);
}
window.addPOItem = addPOItem;

let purchaseOrders = [];

export async function loadPurchaseOrders() {
  const body = document.getElementById('purchase-orders-tbody');
  if (body) body.innerHTML = Array(3).fill(`<tr>${Array(7).fill('<td><div class="skeleton" style="height:14px"></div></td>').join('')}</tr>`).join('');
  try {
    const user = await requireUser();
    const snapshot = await getDocs(query(
      collection(db, 'purchaseOrders'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ));
    purchaseOrders = snapshot.docs.map(order => ({ id: order.id, ...order.data() }));
    setPurchaseNotifications(purchaseOrders);
    setFinancialPurchases(purchaseOrders);
    if (body) {
      body.innerHTML = purchaseOrders.length ? purchaseOrders.map(order => `
        <tr><td class="text-accent"><strong>${esc(order.orderNumber)}</strong></td>
        <td>${esc(order.supplier)}</td><td>${order.itemCount} items</td>
        <td>${formatCurrency(order.total)}</td><td>${esc(order.expectedDate || 'Not set')}</td>
        <td><span class="badge warning">${esc(order.status)}</span></td><td></td></tr>`).join('')
        : '<tr><td colspan="7"><div class="empty-state"><h3>No purchase orders yet</h3><p>Create an order when you are ready to replenish inventory.</p></div></td></tr>';
    }
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('po-total', purchaseOrders.length);
    set('po-pending', purchaseOrders.filter(order => order.status === 'Pending Approval').length);
    set('po-transit', purchaseOrders.filter(order => order.status === 'In Transit').length);
    set('po-completed', purchaseOrders.filter(order => order.status === 'Completed').length);
    set('dashboard-purchase-orders', purchaseOrders.length);
  } catch (error) {
    console.error('Could not load purchase orders', error);
    if (body) body.innerHTML = '<tr><td colspan="7" class="text-muted">Could not load purchase orders.</td></tr>';
  }
}

export function getLoadedPurchaseOrders() {
  return purchaseOrders;
}

function readItems() {
  return [...document.querySelectorAll('#po-items tr')].map(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0]?.value.trim() || '';
    const quantity = Number(inputs[1]?.value || 0);
    const unitCost = Number(inputs[2]?.value || 0);
    return { name, quantity, unitCost };
  }).filter(item => item.name && Number.isInteger(item.quantity) && item.quantity > 0 && item.unitCost >= 0);
}

export async function submitPO(status = 'Pending Approval') {
  const modal = document.getElementById('po-modal');
  const selects = modal?.querySelectorAll('select') || [];
  const supplier = document.getElementById('po-supplier')?.value || '';
  const warehouse = document.getElementById('po-warehouse')?.value || '';
  const items = readItems();
  if (!supplier || !warehouse) {
    toast('Select a supplier and an active warehouse', 'error');
    return;
  }
  if (!items.length || items.length > 10) {
    toast('Add between 1 and 10 valid order items', 'error');
    return;
  }
  try {
    const user = await requireUser();
    await addDoc(collection(db, 'purchaseOrders'), {
      ownerId: user.uid,
      orderNumber: `PO-${Date.now().toString().slice(-8)}`,
      supplier,
      expectedDate: modal?.querySelector('input[type="date"]')?.value || '',
      warehouse,
      priority: selects[2]?.value || 'Normal',
      notes: modal?.querySelector('textarea')?.value.trim() || '',
      items,
      itemCount: items.length,
      total: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    closeModal('po-modal');
    await loadPurchaseOrders();
    toast(status === 'Draft' ? 'Saved as draft' : 'Purchase order submitted', 'success');
  } catch (error) {
    console.error('Could not save purchase order', error);
    toast('Could not save purchase order', 'error');
  }
}
window.submitPO = submitPO;
