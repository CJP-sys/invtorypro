import { db, requireUser } from './firebase.js';
import { esc, toast, formatCurrency } from './utils.js';
import { openModal, closeModal } from './navigation.js';
import { setSalesNotifications } from './notifications.js';
import { setFinancialSales } from './financials.js';
import {
  collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const NEXT_STATUS = {
  Pending: 'Processing',
  Processing: 'Delivered',
  Delivered: 'Completed'
};

let salesOrders = [];

export async function getSalesOrders() {
  const user = await requireUser();
  const snapshot = await getDocs(query(
    collection(db, 'salesOrders'),
    where('ownerId', '==', user.uid),
    orderBy('createdAt', 'desc')
  ));
  salesOrders = snapshot.docs.map(order => ({ id: order.id, ...order.data() }));
  setSalesNotifications(salesOrders);
  setFinancialSales(salesOrders);
  return salesOrders;
}

export function renderSalesOrders() {
  const body = document.getElementById('sales-orders-tbody');
  if (!body) return;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('so-total-count', salesOrders.length);
  set('so-processing-count', salesOrders.filter(order => order.status === 'Processing').length);
  set('so-delivered-count', salesOrders.filter(order => order.status === 'Delivered').length);
  set('so-completed-count', salesOrders.filter(order => order.status === 'Completed').length);
  set('dashboard-sales-orders', salesOrders.length);
  if (!salesOrders.length) {
    body.innerHTML = '<tr><td colspan="7"><div class="empty-state"><h3>No sales orders yet</h3><p>New customer orders will appear here.</p></div></td></tr>';
    return;
  }
  body.innerHTML = salesOrders.map(order => {
    const next = NEXT_STATUS[order.status];
    return `<tr>
      <td class="text-accent"><strong>${esc(order.orderNumber)}</strong></td>
      <td>${esc(order.customer)}</td>
      <td>${order.itemCount} item${order.itemCount === 1 ? '' : 's'}</td>
      <td>${formatCurrency(order.total)}</td>
      <td>${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Today'}</td>
      <td><span class="badge ${order.status === 'Completed' ? 'success' : 'warning'}">${esc(order.status)}</span></td>
      <td>${next ? `<button class="btn btn-primary btn-xs" onclick="advanceOrderStatus('${order.id}','${order.status}')">${esc(next)}</button>` : ''}</td>
    </tr>`;
  }).join('');
}

export function getLoadedSalesOrders() {
  return salesOrders;
}

export async function loadSalesOrders() {
  const body = document.getElementById('sales-orders-tbody');
  if (body) body.innerHTML = Array(3).fill(`<tr>${Array(7).fill('<td><div class="skeleton" style="height:14px"></div></td>').join('')}</tr>`).join('');
  try {
    await getSalesOrders();
    renderSalesOrders();
  } catch (error) {
    console.error('Could not load sales orders', error);
    toast('Could not load sales orders', 'error');
  }
}

export function openSalesOrderModal() {
  openModal('sales-order-modal');
}
window.openSalesOrderModal = openSalesOrderModal;

export async function createSalesOrder() {
  const customer = document.getElementById('so-customer')?.value.trim() || '';
  const itemCount = Number(document.getElementById('so-items')?.value || 0);
  const total = Number(document.getElementById('so-total')?.value || 0);
  if (!customer || !Number.isInteger(itemCount) || itemCount < 1 || total < 0) {
    toast('Enter a customer, valid item count, and total', 'error');
    return;
  }
  try {
    const user = await requireUser();
    await addDoc(collection(db, 'salesOrders'), {
      ownerId: user.uid,
      orderNumber: `SO-${Date.now().toString().slice(-8)}`,
      customer,
      itemCount,
      total,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    document.getElementById('sales-order-form')?.reset();
    closeModal('sales-order-modal');
    await loadSalesOrders();
    toast('Sales order created', 'success');
  } catch (error) {
    console.error('Could not create sales order', error);
    toast('Could not create sales order', 'error');
  }
}
window.createSalesOrder = createSalesOrder;

export async function advanceOrderStatus(orderId, currentStatus) {
  const next = NEXT_STATUS[currentStatus];
  if (!next) {
    toast('Order already completed', 'info');
    return;
  }
  try {
    await requireUser();
    await updateDoc(doc(db, 'salesOrders', orderId), {
      status: next,
      updatedAt: serverTimestamp()
    });
    await loadSalesOrders();
    toast(`Order moved to ${next}`, 'success');
  } catch (error) {
    console.error('Could not update sales order', error);
    toast('Could not update order status', 'error');
  }
}
window.advanceOrderStatus = advanceOrderStatus;
