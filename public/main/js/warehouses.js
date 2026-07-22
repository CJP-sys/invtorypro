/**
 * Warehouse backend integration.
 *
 * Firestore stores warehouse identity and capacity. Product counts, unit totals,
 * and utilization are derived from the live products array, avoiding stale
 * duplicated totals in warehouse documents.
 */

import { db, requireUser } from './firebase.js';
import { esc, toast } from './utils.js';
import { openModal, closeModal } from './navigation.js';
import { getProducts } from './products.js';
import {
  collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let warehouses = [];
let editingWarehouseId = null;

/** Returns a copy so other modules cannot mutate warehouse state accidentally. */
export function getWarehouses() {
  return warehouses.map(warehouse => ({ ...warehouse }));
}

/** Reads only the signed-in owner's warehouse documents and refreshes the UI. */
export async function loadWarehouses() {
  const list = document.getElementById('warehouse-list');
  if (list) list.innerHTML = Array(3).fill('<div class="card"><div class="skeleton" style="height:22px;width:60%;margin-bottom:14px"></div><div class="skeleton" style="height:80px"></div></div>').join('');

  try {
    const user = await requireUser();
    const snapshot = await getDocs(query(
      collection(db, 'warehouses'),
      where('ownerId', '==', user.uid),
      orderBy('name')
    ));
    warehouses = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderWarehouses();
    populateWarehouseSelects();
  } catch (error) {
    console.error('Could not load warehouses', error);
    if (list) list.innerHTML = '<div class="card text-muted">Could not load warehouses.</div>';
    toast('Could not load warehouses', 'error');
  }
}

/** Builds live stock metrics by matching each product's warehouse name. */
function getWarehouseMetrics(name) {
  const matching = getProducts().filter(product => product.warehouse === name);
  return {
    productCount: matching.length,
    units: matching.reduce((total, product) => total + Number(product.stock || 0), 0)
  };
}

/** Renders every warehouse card from Firestore plus current inventory metrics. */
export function renderWarehouses() {
  const list = document.getElementById('warehouse-list');
  if (!list) return;
  if (!warehouses.length) {
    list.innerHTML = '<div class="card empty-state"><h3>No warehouses configured</h3><p>Add a location to assign products and purchase orders.</p></div>';
    return;
  }

  list.innerHTML = warehouses.map(warehouse => {
    const metrics = getWarehouseMetrics(warehouse.name);
    const capacity = Number(warehouse.capacity || 0);
    const utilization = capacity > 0 ? Math.min(100, Math.round(metrics.units / capacity * 100)) : 0;
    const progressClass = utilization >= 90 ? 'danger' : utilization >= 70 ? 'warning' : 'success';
    const statusClass = warehouse.status === 'Active' ? 'success' : 'neutral';
    return `
      <div class="card" style="border-top:3px solid var(--accent)">
        <div class="flex-between" style="align-items:flex-start">
          <div>
            <div style="font-size:16px;font-weight:600;margin-bottom:6px">${esc(warehouse.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${esc(warehouse.code)} · ${esc(warehouse.address)}</div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" onclick="editWarehouse('${warehouse.id}')">Edit</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div class="flex-between"><span class="text-muted">Products</span><span>${metrics.productCount}</span></div>
          <div class="flex-between"><span class="text-muted">Stored Units</span><span>${metrics.units.toLocaleString()}</span></div>
          <div class="flex-between"><span class="text-muted">Capacity Used</span><span>${utilization}% of ${capacity.toLocaleString()}</span></div>
          <div class="flex-between"><span class="text-muted">Manager</span><span>${esc(warehouse.manager || 'Not assigned')}</span></div>
          <div class="flex-between"><span class="text-muted">Status</span><span class="badge ${statusClass}">${esc(warehouse.status)}</span></div>
        </div>
        <div class="progress-bar mt-16"><div class="progress-fill ${progressClass}" style="width:${utilization}%"></div></div>
      </div>`;
  }).join('');
}

/** Replaces hardcoded product and purchase-order options with backend data. */
export function populateWarehouseSelects() {
  ['pm-warehouse', 'po-warehouse'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const previous = select.value;
    const available = id === 'po-warehouse'
      ? warehouses.filter(warehouse => warehouse.status === 'Active')
      : warehouses;
    select.innerHTML = available.length
      ? available.map(warehouse =>
          `<option value="${esc(warehouse.name)}">${esc(warehouse.name)}${warehouse.status === 'Inactive' ? ' (Inactive)' : ''}</option>`
        ).join('')
      : '<option value="">No warehouses available</option>';
    if (available.some(warehouse => warehouse.name === previous)) select.value = previous;
  });
}

/** Resets and opens the warehouse form in create mode. */
export function openWarehouseModal() {
  editingWarehouseId = null;
  document.getElementById('warehouse-modal-title').textContent = 'Add Warehouse';
  document.getElementById('warehouse-form')?.reset();
  openModal('warehouse-modal');
}
window.openWarehouseModal = openWarehouseModal;

/** Opens an existing backend record for editing. */
export function editWarehouse(id) {
  const warehouse = warehouses.find(item => item.id === id);
  if (!warehouse) return;
  editingWarehouseId = id;
  document.getElementById('warehouse-modal-title').textContent = 'Edit Warehouse';
  document.getElementById('warehouse-name').value = warehouse.name;
  document.getElementById('warehouse-code').value = warehouse.code;
  document.getElementById('warehouse-address').value = warehouse.address;
  document.getElementById('warehouse-manager').value = warehouse.manager || '';
  document.getElementById('warehouse-capacity').value = warehouse.capacity;
  document.getElementById('warehouse-status').value = warehouse.status;
  openModal('warehouse-modal');
}
window.editWarehouse = editWarehouse;

/** Validates and writes a new or edited warehouse to Firestore. */
export async function saveWarehouse() {
  const capacity = Number(document.getElementById('warehouse-capacity')?.value);
  const payload = {
    name: document.getElementById('warehouse-name')?.value.trim() || '',
    code: document.getElementById('warehouse-code')?.value.trim().toUpperCase() || '',
    address: document.getElementById('warehouse-address')?.value.trim() || '',
    manager: document.getElementById('warehouse-manager')?.value.trim() || '',
    capacity,
    status: document.getElementById('warehouse-status')?.value || 'Active'
  };
  if (!payload.name || !payload.code || !payload.address) {
    toast('Name, code, and address are required', 'error');
    return;
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000000000) {
    toast('Capacity must be a whole number between 1 and 1,000,000,000', 'error');
    return;
  }
  const duplicate = warehouses.some(warehouse =>
    warehouse.id !== editingWarehouseId &&
    (warehouse.name.toLowerCase() === payload.name.toLowerCase() ||
      warehouse.code.toLowerCase() === payload.code.toLowerCase())
  );
  if (duplicate) {
    toast('Warehouse name and code must be unique', 'error');
    return;
  }

  const button = document.getElementById('warehouse-save-button');
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving…';
  }
  try {
    const user = await requireUser();
    if (editingWarehouseId) {
      await updateDoc(doc(db, 'warehouses', editingWarehouseId), {
        ...payload,
        updatedAt: serverTimestamp()
      });
      toast(`${payload.name} updated`, 'success');
    } else {
      await addDoc(collection(db, 'warehouses'), {
        ...payload,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast(`${payload.name} added`, 'success');
    }
    closeModal('warehouse-modal');
    await loadWarehouses();
  } catch (error) {
    console.error('Could not save warehouse', error);
    toast('Could not save warehouse', 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Save Warehouse';
    }
  }
}
window.saveWarehouse = saveWarehouse;
