import { getProducts } from './products.js';
import { getLoadedSalesOrders } from './sales-orders.js';
import { getLoadedPurchaseOrders } from './purchase-orders.js';

const chartsInit = {};

function monthlySalesData() {
  if (document.body.dataset.access === 'viewer') {
    return {
      labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      revenue: [310000, 338000, 372000, 405000, 448000, 486000],
      orders: [91, 102, 116, 127, 139, 148]
    };
  }
  const months = new Map();
  getLoadedSalesOrders().filter(order => ['Delivered', 'Completed'].includes(order.status)).forEach(order => {
    const date = order.createdAt?.toDate?.();
    if (!date) return;
    const key = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    const entry = months.get(key) || { revenue: 0, orders: 0 };
    entry.revenue += Number(order.total || 0);
    entry.orders += 1;
    months.set(key, entry);
  });
  return {
    labels: [...months.keys()],
    revenue: [...months.values()].map(value => value.revenue),
    orders: [...months.values()].map(value => value.orders)
  };
}

function monthlyPurchaseData() {
  if (document.body.dataset.access === 'viewer') {
    return {
      labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      expenses: [225000, 238000, 251000, 279000, 296000, 312000]
    };
  }
  const months = new Map();
  getLoadedPurchaseOrders().filter(order => order.status !== 'Draft').forEach(order => {
    const date = order.createdAt?.toDate?.();
    if (!date) return;
    const key = date.toLocaleDateString(undefined, { month:'short', year:'numeric' });
    months.set(key, (months.get(key) || 0) + Number(order.total || 0));
  });
  return { labels:[...months.keys()], expenses:[...months.values()] };
}

export function initCharts() {
  if (chartsInit.main) return;
  chartsInit.main = true;
  const sales = monthlySalesData();
  const salesCtx = document.getElementById('salesChart');
  if (salesCtx) {
    new Chart(salesCtx, {
      type: 'bar',
      data: {
        labels: sales.labels,
        datasets: [
          { label: 'Revenue', data: sales.revenue, backgroundColor: 'rgba(98,108,232,.72)', yAxisID: 'y' },
          { label: 'Orders', data: sales.orders, type: 'line', borderColor: '#28bdc8', yAxisID: 'y1' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const donutCtx = document.getElementById('stockDonut');
  if (donutCtx) {
    window.__stockHealthChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{ data: [0, 0, 0], backgroundColor: ['#28bdc8', '#7c83ef', '#9bb7d2'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }
}

export function initReportCharts() {
  if (chartsInit.reports) return;
  chartsInit.reports = true;
  const totals = new Map();
  if (document.body.dataset.access === 'viewer') {
    [['Electronics', 584000], ['Peripherals', 184500], ['Accessories', 139600]]
      .forEach(([category, value]) => totals.set(category, value));
  } else {
    getProducts().forEach(product => {
      totals.set(product.cat, (totals.get(product.cat) || 0) + product.stock * product.price);
    });
  }
  const catCtx = document.getElementById('catChart');
  if (catCtx) {
    new Chart(catCtx, {
      type: 'bar',
      data: {
        labels: [...totals.keys()],
        datasets: [{ label: 'Inventory value', data: [...totals.values()], backgroundColor: 'rgba(40,189,200,.75)' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  const movement = document.getElementById('movChart');
  if (movement) {
    new Chart(movement, {
      type: 'line',
      data: document.body.dataset.access === 'viewer'
        ? { labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets:[
            { label:'Stock In', data:[42,65,38,81,54,32,71], borderColor:'#2ecc71' },
            { label:'Stock Out', data:[31,48,44,52,63,27,46], borderColor:'#e74c3c' }
          ] }
        : { labels: [], datasets: [{ label: 'Stock movement', data: [] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function initOrderReport(canvasId, label, values) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  new Chart(el, {
    type: 'bar',
    data: { labels: values.labels, datasets: [{ label, data: values.revenue, backgroundColor: 'rgba(98,108,232,.72)' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

export function switchTab(btn, targetId) {
  btn.closest('.tabs').querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  btn.classList.add('active');
  let el = btn.closest('.tabs').nextElementSibling;
  while (el) {
    if (el.id?.startsWith('tab-')) el.style.display = el.id === targetId ? '' : 'none';
    el = el.nextElementSibling;
  }
  if (targetId === 'tab-sales-report' && !chartsInit.salesReport) {
    chartsInit.salesReport = true;
    initOrderReport('salesReportChart', 'Sales revenue', monthlySalesData());
  }
  if (targetId === 'tab-purchase-report' && !chartsInit.purchaseReport) {
    chartsInit.purchaseReport = true;
    const purchases = monthlyPurchaseData();
    initOrderReport('purchReportChart', 'Purchases', { labels:purchases.labels, revenue:purchases.expenses });
  }
  if (targetId === 'tab-financial-report' && !chartsInit.financialReport) {
    chartsInit.financialReport = true;
    const element = document.getElementById('finReportChart');
    if (element) {
      const sales = monthlySalesData();
      const purchases = monthlyPurchaseData();
      const labels = [...new Set([...sales.labels, ...purchases.labels])];
      const salesByMonth = new Map(sales.labels.map((label, index) => [label, sales.revenue[index]]));
      const purchasesByMonth = new Map(purchases.labels.map((label, index) => [label, purchases.expenses[index]]));
      new Chart(element, {
        type:'bar',
        data:{ labels, datasets:[
          { label:'Revenue', data:labels.map(label => salesByMonth.get(label) || 0), backgroundColor:'rgba(40,189,200,.76)' },
          { label:'Expenses', data:labels.map(label => purchasesByMonth.get(label) || 0), backgroundColor:'rgba(98,108,232,.70)' }
        ]},
        options:{ responsive:true, maintainAspectRatio:false }
      });
    }
  }
}
window.switchTab = switchTab;
