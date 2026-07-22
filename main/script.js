const pageNames = {
  dashboard:'Dashboard',products:'Products',warehouses:'Warehouses',adjustments:'Stock Adjustments',
  purchases:'Purchase Orders',sales:'Sales Orders',suppliers:'Suppliers',customers:'Customers',
  reports:'Reports & Analytics',audit:'Audit Trail',users:'User Management',settings:'Settings'
};
const pageSubtitles = {
  dashboard:'Welcome back, Super Admin',products:'Manage your product catalog',
  warehouses:'Multi-location warehouse management',adjustments:'Stock count corrections',
  purchases:'Procurement & receiving',sales:'Customer orders & deliveries',
  suppliers:'Vendor relationships',customers:'Customer records & CRM',
  reports:'Business intelligence & exports',audit:'Complete activity history',
  users:'Roles, permissions & access',settings:'System configuration'
};

const salesTrendDataSets = {
  '6': {
    labels:['Jan','Feb','Mar','Apr','May','Jun'],
    revenue:[320,410,380,450,420,486],
    orders:[98,124,115,138,129,163]
  },
  '12': {
    labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    revenue:[320,410,380,450,420,486,505,520,540,560,575,610],
    orders:[98,124,115,138,129,163,170,178,185,192,198,205]
  },
  'year': {
    labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    revenue:[320,410,380,450,420,486,505,520,540,560,575,610],
    orders:[98,124,115,138,129,163,170,178,185,192,198,205]
  }
};

const salesTrendState = { range:'6', showRevenue:true, showOrders:true, windowStart:0, windowEnd:5 };

function getSalesData(range){ return salesTrendDataSets[range] || salesTrendDataSets['6']; }
function getRangeKey(value){
  if(value==='Last 12 months') return '12';
  if(value==='This year') return 'year';
  return '6';
}
function getRangeLabel(key){
  if(key==='12') return 'Last 12 months';
  if(key==='year') return 'This year';
  return 'Last 6 months';
}
function updateSalesChartWindow(){
  const data = getSalesData(salesTrendState.range);
  salesTrendState.windowEnd = Math.min(salesTrendState.windowEnd, data.labels.length - 1);
  salesTrendState.windowStart = Math.min(salesTrendState.windowStart, salesTrendState.windowEnd);
  const sliceLabels = data.labels.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1);
  const sliceRevenue = data.revenue.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1);
  const sliceOrders = data.orders.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1);
  salesTrendChart.data.labels = sliceLabels;
  salesTrendChart.data.datasets[0].data = sliceRevenue;
  salesTrendChart.data.datasets[1].data = sliceOrders;
  salesTrendChart.update();
  document.querySelector('.section-desc').textContent = `${getRangeLabel(salesTrendState.range)} revenue & orders`;
}
function setSalesRange(range){
  salesTrendState.range = range;
  salesTrendState.windowStart = 0;
  salesTrendState.windowEnd = getSalesData(range).labels.length - 1;
  updateSalesChartWindow();
  const select = document.getElementById('sales-range-select');
  if(select) select.value = getRangeLabel(range);
}
function getSalesTrendIndexFromEvent(evt){
  if(!salesTrendChart) return null;
  const points = salesTrendChart.getElementsAtEventForMode(evt,'nearest',{intersect:false},false);
  if(points && points.length) return points[0].index + salesTrendState.windowStart;
  const xScale = salesTrendChart.scales.x;
  if(!xScale) return Math.floor((salesTrendState.windowStart + salesTrendState.windowEnd) / 2);
  const x = evt.offsetX;
  const left = xScale.left;
  const right = xScale.right;
  if(x < left || x > right) return Math.floor((salesTrendState.windowStart + salesTrendState.windowEnd) / 2);
  const ratio = (x - left) / (right - left);
  const indexInWindow = Math.floor(ratio * (salesTrendState.windowEnd - salesTrendState.windowStart + 1));
  return Math.min(salesTrendState.windowEnd, Math.max(salesTrendState.windowStart, salesTrendState.windowStart + indexInWindow));
}
function zoomSalesTrend(amount, focusIndex){
  const data = getSalesData(salesTrendState.range);
  const total = data.labels.length;
  const currentLength = salesTrendState.windowEnd - salesTrendState.windowStart + 1;
  const nextLength = Math.min(total, Math.max(3, currentLength - amount));
  const focus = typeof focusIndex === 'number' && focusIndex >= salesTrendState.windowStart && focusIndex <= salesTrendState.windowEnd
    ? focusIndex
    : Math.floor((salesTrendState.windowStart + salesTrendState.windowEnd) / 2);
  const offset = currentLength > 1 ? (focus - salesTrendState.windowStart) / (currentLength - 1) : 0.5;
  const start = Math.round(focus - offset * (nextLength - 1));
  salesTrendState.windowStart = Math.max(0, Math.min(total - nextLength, start));
  salesTrendState.windowEnd = salesTrendState.windowStart + nextLength - 1;
  updateSalesChartWindow();
}
function resetSalesZoom(){
  const data = getSalesData(salesTrendState.range);
  salesTrendState.windowStart = 0;
  salesTrendState.windowEnd = data.labels.length - 1;
  updateSalesChartWindow();
}
function toggleSalesSeries(series){
  if(!salesTrendChart) return;
  if(series==='revenue'){
    salesTrendState.showRevenue = !salesTrendState.showRevenue;
    salesTrendChart.data.datasets[0].hidden = !salesTrendState.showRevenue;
    document.getElementById('toggle-revenue').classList.toggle('active', salesTrendState.showRevenue);
  } else {
    salesTrendState.showOrders = !salesTrendState.showOrders;
    salesTrendChart.data.datasets[1].hidden = !salesTrendState.showOrders;
    document.getElementById('toggle-orders').classList.toggle('active', salesTrendState.showOrders);
  }
  salesTrendChart.update();
}
function initSalesTrendControls(){
  const select = document.getElementById('sales-range-select');
  const reset = document.getElementById('sales-reset-zoom');
  const toggleRevenue = document.getElementById('toggle-revenue');
  const toggleOrders = document.getElementById('toggle-orders');
  if(select) select.addEventListener('change', e => setSalesRange(getRangeKey(e.target.value)));
  if(reset) reset.addEventListener('click', resetSalesZoom);
  if(toggleRevenue) toggleRevenue.addEventListener('click', () => toggleSalesSeries('revenue'));
  if(toggleOrders) toggleOrders.addEventListener('click', () => toggleSalesSeries('orders'));
}

let salesTrendChart;


function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if(nav) nav.classList.add('active');
  document.getElementById('page-title').textContent = pageNames[page]||page;
  document.getElementById('page-subtitle').textContent = pageSubtitles[page]||'';
  if(page==='reports') setTimeout(initReportCharts,100);
}

document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
  item.addEventListener('click',()=>navigate(item.dataset.page));
});

document.querySelectorAll('.stat-card[data-page]').forEach(card=>{
  card.addEventListener('click',()=>navigate(card.dataset.page));
});

document.getElementById('toggle-sidebar').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('collapsed');
});

document.getElementById('notif-btn').addEventListener('click',()=>{
  document.getElementById('notif-panel').classList.toggle('open');
});
document.getElementById('close-notif').addEventListener('click',()=>{
  document.getElementById('notif-panel').classList.remove('open');
});

function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){
  const modal = document.getElementById(id);
  if(modal) modal.classList.remove('show');
  if(id === 'product-modal') {
    editingProductId = null;
    resetProductForm();
  }
}

function resetProductForm(){
  document.querySelectorAll('#product-modal input, #product-modal textarea, #product-modal select').forEach(el=>{
    if(el.tagName==='SELECT'){
      el.selectedIndex = 0;
    } else {
      el.value = '';
    }
  });
}

function formatCurrency(value){
  return `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function updateDashboardSummary(){
  const totalProducts = products.length;
  const lowStock = products.filter(item => item.stock > 0 && item.stock < 10).length;
  const outOfStock = products.filter(item => item.stock <= 0).length;
  const inStock = products.filter(item => item.stock >= 10).length;
  const inventoryValue = products.reduce((sum, item) => sum + (Number(item.stock || 0) * Number(item.price || 0)), 0);

  const totalValueEl = document.getElementById('dashboard-total-products');
  const lowStockEl = document.getElementById('dashboard-low-stock');
  const outOfStockEl = document.getElementById('dashboard-out-of-stock');
  const inventoryValueEl = document.getElementById('dashboard-inventory-value');
  const inStockCountEl = document.getElementById('dashboard-in-stock-count');
  const lowStockCountEl = document.getElementById('dashboard-low-stock-count');
  const outOfStockCountEl = document.getElementById('dashboard-out-of-stock-count');
  const productListEl = document.getElementById('dashboard-product-list');

  if(totalValueEl) totalValueEl.textContent = totalProducts.toLocaleString();
  if(lowStockEl) lowStockEl.textContent = lowStock.toLocaleString();
  if(outOfStockEl) outOfStockEl.textContent = outOfStock.toLocaleString();
  if(inventoryValueEl) inventoryValueEl.textContent = formatCurrency(inventoryValue);
  if(inStockCountEl) inStockCountEl.textContent = `${inStock.toLocaleString()} items`;
  if(lowStockCountEl) lowStockCountEl.textContent = `${lowStock.toLocaleString()} items`;
  if(outOfStockCountEl) outOfStockCountEl.textContent = `${outOfStock.toLocaleString()} items`;

  if(productListEl){
    if(!products.length){
      productListEl.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">No products added yet.</div>';
    } else {
      productListEl.innerHTML = products.slice(0, 5).map(item => `
        <div style="padding:8px 10px;background:var(--bg-surface);border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div>
            <div style="font-size:13px;font-weight:600">${item.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${item.sku} · ${item.cat}</div>
          </div>
          <span class="badge ${item.status === 'Out of Stock' ? 'danger' : item.status === 'Low Stock' ? 'warning' : 'success'}">${item.stock} in stock</span>
        </div>`).join('');
    }
  }

  if(stockHealthChart){
    stockHealthChart.data.datasets[0].data = [inStock, lowStock, outOfStock];
    stockHealthChart.update();
  }
}

function getProductStatus(stock){
  if(stock <= 0) return 'Out of Stock';
  if(stock < 10) return 'Low Stock';
  return 'In Stock';
}

function loadProducts(){
  try {
    const saved = localStorage.getItem('inventorypro-products');
    if(saved){
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Unable to load saved products', error);
  }
  return [];
}

function saveProductsToStorage(){
  localStorage.setItem('inventorypro-products', JSON.stringify(products));
}

let products = loadProducts();
if(!products.length){
  products = [
    {id:'prod-demo-1',name:'Samsung Galaxy A55',sku:'SKU-0041',cat:'Electronics',stock:142,price:4000,warehouse:'Main Warehouse',supplier:'Tech Distributors PH',description:'Flagship smartphone',status:'In Stock'},
    {id:'prod-demo-2',name:'Mechanical Keyboard K7',sku:'SKU-0089',cat:'Peripherals',stock:34,price:3000,warehouse:'Main Warehouse',supplier:'AudioTech PH',description:'RGB mechanical keyboard',status:'In Stock'},
    {id:'prod-demo-3',name:'Wireless Earbuds X3',sku:'SKU-0067',cat:'Electronics',stock:8,price:2000,warehouse:'Main Warehouse',supplier:'AudioTech PH',description:'Portable earbuds',status:'Low Stock'},
    {id:'prod-demo-4',name:'Laptop Stand LS-Pro',sku:'SKU-0188',cat:'Accessories',stock:0,price:1800,warehouse:'Main Warehouse',supplier:'DeskPro Co.',description:'Ergonomic laptop stand',status:'Out of Stock'}
  ];
  saveProductsToStorage();
}
let editingProductId = null;
let stockHealthChart = null;

function openProductModal(editId = null){
  if(editId){
    const product = products.find(item => item.id === editId);
    if(product){
      editingProductId = editId;
      document.getElementById('product-modal-title').textContent = 'Edit Product';
      document.getElementById('pm-name').value = product.name || '';
      document.getElementById('pm-sku').value = product.sku || '';
      document.getElementById('pm-cat').value = product.cat || 'Electronics';
      document.getElementById('pm-price').value = product.price || '';
      document.getElementById('pm-stock').value = product.stock || 0;
      document.getElementById('pm-reorder').value = product.reorder || 10;
      document.getElementById('pm-warehouse').value = product.warehouse || 'Main Warehouse';
      document.getElementById('pm-supplier').value = product.supplier || 'Tech Distributors PH';
      document.getElementById('pm-desc').value = product.description || '';
      openModal('product-modal');
      return;
    }
  }

  editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  resetProductForm();
  openModal('product-modal');
}

function closeProductModal(){
  editingProductId = null;
  resetProductForm();
  closeModal('product-modal');
}

function openPOModal(){ openModal('po-modal'); }

function addPOItem(){
  const tbody = document.getElementById('po-items');
  const row = tbody.rows[0].cloneNode(true);
  row.querySelectorAll('input').forEach(i=>i.value='');
  tbody.appendChild(row);
}

function applyProductFilters(){
  try{
    const q = (document.getElementById('product-search')||{value:''}).value.trim().toLowerCase();
    const cat = (document.getElementById('category-filter')||{value:''}).value;
    const status = (document.getElementById('status-filter')||{value:''}).value;
    return products.filter(p=>{
      if(q){
        const found = (p.name||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q) || (p.cat||'').toLowerCase().includes(q);
        if(!found) return false;
      }
      if(cat && p.cat !== cat) return false;
      if(status){
        if(status === 'In Stock' && p.stock < 10) return false;
        if(status === 'Low Stock' && !(p.stock > 0 && p.stock < 10)) return false;
        if(status === 'Out of Stock' && p.stock > 0) return false;
      }
      return true;
    });
  } catch(err){
    console.error('Filter error', err);
    toast('Error applying filters','error');
    return products.slice();
  }
}

function renderProducts(filteredList){
  const tbody = document.getElementById('products-tbody');
  if(!tbody) return;
  const list = Array.isArray(filteredList) ? filteredList : products;

  if(!list.length){
    tbody.innerHTML = '<tr><td colspan="9" class="text-muted" style="text-align:center;padding:24px">No products match the current filters.</td></tr>';
    document.getElementById('products-count').textContent = `Showing 0 of ${products.length.toLocaleString()} products`;
    return;
  }

  tbody.innerHTML = list.map(p=>{
    const badgeClass = p.status === 'In Stock' ? 'success' : p.status === 'Low Stock' ? 'warning' : 'danger';
    const stockPct = Math.min(100, Math.round((p.stock / 150) * 100));
    const stockClass = p.stock === 0 ? 'out' : p.stock < 15 ? 'low' : 'good';
    const actionButtons = [];
    actionButtons.push(`<button class="btn btn-ghost btn-xs" onclick="editProduct('${p.id}')">Edit</button>`);
    actionButtons.push(`<button class="btn btn-danger btn-xs" onclick="deleteProduct('${p.id}')">Delete</button>`);
    if(p.stock <= (p.reorder || 10)){
      actionButtons.push(`<button class="btn btn-primary btn-xs" onclick="openPOModal();toast('Create PO for ${p.name}','info')">Reorder</button>`);
    }

    return `<tr>
      <td><input type="checkbox" style="width:16px"></td>
      <td><div style="font-weight:500">${p.name}</div></td>
      <td class="text-muted">${p.sku}</td>
      <td><span class="badge info">${p.cat}</span></td>
      <td>
        <div class="stock-bar-wrap">
          <span style="font-size:13px;min-width:28px">${p.stock}</span>
          <div class="stock-bar"><div class="stock-fill ${stockClass}" style="width:${stockPct}%"></div></div>
        </div>
      </td>
      <td>₱${Number(p.price || 0).toLocaleString()}</td>
      <td class="text-muted" style="font-size:12px">${p.warehouse}</td>
      <td><span class="badge ${badgeClass}">${p.status}</span></td>
      <td>
        <div class="btn-group">${actionButtons.join('')}</div>
      </td>
    </tr>`;
  }).join('');

  // update count text
  const displayed = list.length;
  document.getElementById('products-count').textContent = `Showing ${displayed.toLocaleString()} of ${products.length.toLocaleString()} products`;
}

// initial render
renderProducts(applyProductFilters());
updateDashboardSummary();

function saveProduct(){
  const name = document.getElementById('pm-name').value.trim();
  if(!name){toast('Product name is required','error');return;}

  const stock = parseInt(document.getElementById('pm-stock').value || 0, 10) || 0;
  const price = parseFloat(document.getElementById('pm-price').value || 0) || 0;
  const sku = document.getElementById('pm-sku').value.trim() || `SKU-${String(Math.floor(Math.random()*9000)+1000)}`;
  const payload = {
    id: editingProductId || `prod-${Date.now()}`,
    name,
    sku,
    cat: document.getElementById('pm-cat').value,
    stock,
    price,
    reorder: parseInt(document.getElementById('pm-reorder').value || 10, 10) || 10,
    warehouse: document.getElementById('pm-warehouse').value,
    supplier: document.getElementById('pm-supplier').value,
    description: document.getElementById('pm-desc').value.trim(),
    status: getProductStatus(stock)
  };

  if(editingProductId){
    products = products.map(item => item.id === editingProductId ? { ...item, ...payload } : item);
    toast(`${name} updated successfully`,'success');
  } else {
    products.unshift(payload);
    toast(`${name} added successfully`,'success');
  }

  saveProductsToStorage();
  updateDashboardSummary();
  renderProducts();
  closeProductModal();
}

function editProduct(id){
  openProductModal(id);
}

function deleteProduct(id){
  const product = products.find(item => item.id === id);
  if(!product) return;
  if(!confirm(`Delete ${product.name}?`)) return;

  products = products.filter(item => item.id !== id);
  saveProductsToStorage();
  updateDashboardSummary();
  renderProducts();
  toast(`${product.name} deleted`,'warning');
}

const suppliers = [
  {name:'Tech Distributors PH',contact:'sales@techdist.ph',phone:'+63 2 8888 1234',rating:4.8,orders:45,spent:'₱2.1M',status:'Active'},
  {name:'AudioTech PH',contact:'info@audiotech.ph',phone:'+63 917 222 3333',rating:4.5,orders:18,spent:'₱480K',status:'Active'},
  {name:'CablePro Inc',contact:'orders@cablepro.com',phone:'+63 2 7777 5678',rating:4.2,orders:32,spent:'₱320K',status:'Active'},
  {name:'DeskPro Co.',contact:'sales@deskpro.ph',phone:'+63 918 444 5555',rating:3.9,orders:12,spent:'₱180K',status:'Active'},
  {name:'Office Mart',contact:'bulk@officemart.ph',phone:'+63 2 5555 9012',rating:4.6,orders:27,spent:'₱145K',status:'Active'},
];

function renderSuppliers(){
  const list = document.getElementById('supplier-list');
  list.innerHTML = suppliers.map((s,i)=>`
    <div onclick="showSupplierDetail(${i})" style="padding:12px;background:var(--bg-surface);border-radius:8px;cursor:pointer;transition:background 0.2s;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background='rgba(170,0,0,0.1)'" onmouseout="this.style.background='var(--bg-surface)'">
      <div>
        <div style="font-size:14px;font-weight:500">${s.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${s.orders} orders · ${s.spent}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:var(--warning)">★ ${s.rating}</span>
        <span class="badge success">${s.status}</span>
      </div>
    </div>`).join('');
}
renderSuppliers();

function showSupplierDetail(i){
  const s = suppliers[i];
  document.getElementById('supplier-detail').innerHTML = `
    <div style="font-size:18px;font-weight:600;margin-bottom:4px">${s.name}</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${s.contact} · ${s.phone}</div>
    <hr class="divider">
    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;margin-top:12px">
      <div class="flex-between"><span class="text-muted">Supplier Rating</span><span style="color:var(--warning);font-weight:600">★ ${s.rating}/5.0</span></div>
      <div class="flex-between"><span class="text-muted">Total Orders</span><span>${s.orders}</span></div>
      <div class="flex-between"><span class="text-muted">Total Spent</span><span style="color:var(--success);font-weight:600">${s.spent}</span></div>
      <div class="flex-between"><span class="text-muted">Status</span><span class="badge success">${s.status}</span></div>
    </div>
    <hr class="divider">
    <div class="btn-group mt-16">
      <button class="btn btn-primary btn-sm" onclick="openPOModal()">Create PO</button>
      <button class="btn btn-secondary btn-sm" onclick="toast('Opening supplier profile','info')">View Profile</button>
    </div>`;
}

function toast(msg, type='info'){
  const icons = {
    success:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
    info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icons[type]||icons.info}<span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

function switchTab(btn, targetId){
  const parent = btn.closest('.tabs');
  parent.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const container = parent.nextElementSibling;
  let el = container;
  while(el){
    if(el.id && el.id.startsWith('tab-')||el.id&&el.id.startsWith('stab-')){
      el.style.display = el.id===targetId?'':'none';
    }
    el = el.nextElementSibling;
  }
  if(targetId==='tab-sales-report') initSalesReportChart();
  if(targetId==='tab-purchase-report') initPurchReportChart();
  if(targetId==='tab-financial-report') initFinReportChart();
}

let chartsInit = {};

function initCharts(){
  if(chartsInit.main) return;
  chartsInit.main = true;
  const salesData = getSalesData(salesTrendState.range);
  salesTrendState.windowStart = 0;
  salesTrendState.windowEnd = salesData.labels.length - 1;
  const salesCtx = document.getElementById('salesChart');
  salesTrendChart = new Chart(salesCtx,{type:'bar',data:{labels:salesData.labels.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1),datasets:[
      {label:'Revenue (₱K)',data:salesData.revenue.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1),backgroundColor:'rgba(170,0,0,0.7)',borderColor:'#aa0000',borderWidth:1,yAxisID:'y',hidden:!salesTrendState.showRevenue},
      {label:'Orders',data:salesData.orders.slice(salesTrendState.windowStart, salesTrendState.windowEnd + 1),type:'line',borderColor:'#3498db',backgroundColor:'rgba(52,152,219,0.1)',borderWidth:2,fill:true,tension:0.4,yAxisID:'y1',pointBackgroundColor:'#3498db',pointRadius:4,hidden:!salesTrendState.showOrders}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label(ctx){return ctx.dataset.label==='Orders'?`${ctx.dataset.label}: ${ctx.formattedValue} orders`:`${ctx.dataset.label}: ₱${ctx.formattedValue}K`;}}}},scales:{y:{position:'left',ticks:{color:'#888',callback:v=>`₱${v}K`},grid:{color:'rgba(255,255,255,0.05)'}},y1:{position:'right',ticks:{color:'#3498db'},grid:{display:false}},x:{ticks:{color:'#888'},grid:{color:'rgba(255,255,255,0.05)'}}},onClick:(evt, active)=>{
        if(!active.length) return;
        const item = active[0];
        const dataset = salesTrendChart.data.datasets[item.datasetIndex];
        const label = salesTrendChart.data.labels[item.index];
        const value = dataset.data[item.index];
        const info = dataset.label==='Orders' ? `${value} orders` : `₱${value}K`;
        document.getElementById('sales-chart-info').textContent = `${dataset.label} in ${label}: ${info}`;
      }}}
  );
  salesCtx.addEventListener('wheel', e => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -2 : 2;
    const focusIndex = getSalesTrendIndexFromEvent(e);
    zoomSalesTrend(direction, focusIndex);
    const labels = getSalesData(salesTrendState.range).labels;
    const focusLabel = labels[salesTrendState.windowStart + Math.floor((salesTrendState.windowEnd - salesTrendState.windowStart) / 2)];
    document.getElementById('sales-chart-info').textContent = `Zoom ${direction > 0 ? 'in' : 'out'} around ${focusLabel}`;
  }, {passive:false});
  initSalesTrendControls();
  stockHealthChart = new Chart(document.getElementById('stockDonut'),{
    type:'doughnut',
    data:{
      labels:['In Stock','Low Stock','Out of Stock'],
      datasets:[{data:[0,0,0],backgroundColor:['#2ecc71','#f39c12','#e74c3c'],borderWidth:0,hoverOffset:4}]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'70%',
      plugins:{legend:{display:false}},
      onClick:(evt, active) => {
        if(active && active.length){
          navigate('products');
          toast('Opening products list for stock review','info');
        }
      }
    }
  });
  updateDashboardSummary();
}

function initReportCharts(){
  if(chartsInit.cat) return;
  chartsInit.cat=true;
  new Chart(document.getElementById('catChart'),{
    type:'bar',
    data:{
      labels:['Electronics','Peripherals','Accessories','Office Supplies','Other'],
      datasets:[{label:'Value (₱K)',data:[920,380,240,95,65],backgroundColor:['rgba(170,0,0,0.8)','rgba(52,152,219,0.7)','rgba(46,204,113,0.7)','rgba(243,156,18,0.7)','rgba(155,89,182,0.7)'],borderWidth:0}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888',callback:v=>'₱'+v+'K'},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#888'},grid:{display:false}}}}
  });
  new Chart(document.getElementById('movChart'),{
    type:'line',
    data:{
      labels:['Jun 1','Jun 3','Jun 5','Jun 7','Jun 9','Jun 10'],
      datasets:[
        {label:'Stock In',data:[200,150,80,220,100,300],borderColor:'#2ecc71',backgroundColor:'rgba(46,204,113,0.08)',fill:true,tension:0.4,borderWidth:2,pointBackgroundColor:'#2ecc71',pointRadius:4},
        {label:'Stock Out',data:[120,180,95,160,140,200],borderColor:'#aa0000',backgroundColor:'rgba(170,0,0,0.08)',fill:true,tension:0.4,borderWidth:2,pointBackgroundColor:'#aa0000',pointRadius:4}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888'},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#888'},grid:{display:false}}}}
  });
}

function initSalesReportChart(){
  if(chartsInit.sr) return; chartsInit.sr=true;
  new Chart(document.getElementById('salesReportChart'),{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue',data:[320,410,380,450,420,486],backgroundColor:'rgba(170,0,0,0.7)',borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888',callback:v=>'₱'+v+'K'},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#888'},grid:{display:false}}}}});
}
function initPurchReportChart(){
  if(chartsInit.pr) return; chartsInit.pr=true;
  new Chart(document.getElementById('purchReportChart'),{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Purchase Value',data:[180,220,195,280,240,312],backgroundColor:'rgba(52,152,219,0.7)',borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888',callback:v=>'₱'+v+'K'},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#888'},grid:{display:false}}}}});
}
function initFinReportChart(){
  if(chartsInit.fr) return; chartsInit.fr=true;
  new Chart(document.getElementById('finReportChart'),{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue',data:[320,410,380,450,420,486],backgroundColor:'rgba(46,204,113,0.7)',borderWidth:0},{label:'Expenses',data:[210,265,240,295,275,312],backgroundColor:'rgba(170,0,0,0.6)',borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888',callback:v=>'₱'+v+'K'},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#888',maxRotation:0},grid:{display:false}}}}});
}

initCharts();

setTimeout(initCharts, 200);

document.querySelectorAll('.modal-overlay').forEach(overlay=>{
  overlay.addEventListener('click', e=>{
    if(e.target===overlay) overlay.classList.remove('show');
  });
});

// Product page search and filters
const productSearchEl = document.getElementById('product-search');
const categoryFilterEl = document.getElementById('category-filter');
const statusFilterEl = document.getElementById('status-filter');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');

if(productSearchEl) productSearchEl.addEventListener('input', ()=>{
  try{ renderProducts(applyProductFilters()); }catch(e){console.error(e);toast('Search error','error');}
});
if(categoryFilterEl) categoryFilterEl.addEventListener('change', ()=>{
  try{ renderProducts(applyProductFilters()); }catch(e){console.error(e);toast('Filter error','error');}
});
if(statusFilterEl) statusFilterEl.addEventListener('change', ()=>{
  try{ renderProducts(applyProductFilters()); }catch(e){console.error(e);toast('Filter error','error');}
});

function exportProductsCSV(){
  try{
    if(!products.length) { toast('No products to export','info'); return; }
    const headers = ['id','name','sku','cat','stock','price','reorder','warehouse','supplier','description','status'];
    const rows = products.map(p=>headers.map(h=>`"${String(p[h]===undefined?'':p[h]).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `products_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Export started','info');
  } catch(err){ console.error(err); toast('Export failed','error'); }
}

function importProductsFromFile(file){
  try{
    if(!file) throw new Error('No file');
    const reader = new FileReader();
    reader.onload = e => {
      try{
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if(!lines.length) { toast('Empty file','error'); return; }
        const headers = lines[0].split(',').map(h=>h.replace(/(^"|"$)/g,'').trim());
        const required = ['name'];
        const newItems = [];
        for(let i=1;i<lines.length;i++){
          const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c=>c.replace(/(^\s*"|"\s*$)/g,'').trim());
          if(cols.length !== headers.length) continue;
          const obj = {};
          headers.forEach((h,idx)=>obj[h]=cols[idx]);
          if(!obj.name) continue;
          const stock = parseInt(obj.stock||0,10)||0;
          const price = parseFloat(obj.price||0)||0;
          const payload = {
            id: obj.id || `prod-${Date.now()}-${i}`,
            name: obj.name,
            sku: obj.sku || `SKU-${Math.floor(Math.random()*9000)+1000}`,
            cat: obj.cat || 'Other',
            stock,
            price,
            reorder: parseInt(obj.reorder||10,10)||10,
            warehouse: obj.warehouse || 'Main Warehouse',
            supplier: obj.supplier || '',
            description: obj.description || '',
            status: getProductStatus(stock)
          };
          newItems.push(payload);
        }
        if(!newItems.length){ toast('No valid products found in file','error'); return; }
        products = newItems.concat(products);
        saveProductsToStorage();
        updateDashboardSummary();
        renderProducts(applyProductFilters());
        toast(`Imported ${newItems.length} product(s)`,'success');
      } catch(err){ console.error(err); toast('Import failed: invalid file','error'); }
    };
    reader.onerror = () => { toast('Unable to read file','error'); };
    reader.readAsText(file);
  } catch(err){ console.error(err); toast('Import failed','error'); }
}

if(importBtn) importBtn.addEventListener('click', ()=>{
  try{
    const input = document.createElement('input'); input.type='file'; input.accept='.csv,text/csv';
    input.onchange = e => { const f = e.target.files[0]; if(f) importProductsFromFile(f); };
    input.click();
  } catch(err){ console.error(err); toast('Import failed','error'); }
});
if(exportBtn) exportBtn.addEventListener('click', exportProductsCSV);

import { db } from "./firebase.js";
import { collection, addDoc } from "firebase/firestore";

async function addProduct() {
    await addDoc(collection(db, "products"), {
        name: "Keyboard",
        quantity: 20,
        price: 500
    });

    console.log("Added!");
}

import { collection, getDocs } from "firebase/firestore";

async function getProducts() {
    const querySnapshot = await getDocs(collection(db, "products"));

    querySnapshot.forEach((doc) => {
        console.log(doc.id, doc.data());
    });
}

getProducts();

import { doc, updateDoc } from "firebase/firestore";

const productRef = doc(db, "products", "DOCUMENT_ID");

await updateDoc(productRef, {
    quantity: 30
}); 

import { doc, deleteDoc } from "firebase/firestore";

await deleteDoc(doc(db, "products", "DOCUMENT_ID"));