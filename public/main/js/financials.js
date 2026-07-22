/**
 * Calculates the current-month financial summary from Firestore-backed orders.
 * Revenue is recognized for Delivered/Completed sales; expenses exclude Draft POs.
 */
import { formatCurrency } from './utils.js';

const state = { purchases: [], sales: [] };

function isCurrentMonth(order) {
  const date = order.createdAt?.toDate?.();
  const now = new Date();
  return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function setFinancialPurchases(orders) {
  state.purchases = [...orders];
  renderFinancialSummary();
}

export function setFinancialSales(orders) {
  state.sales = [...orders];
  renderFinancialSummary();
}

export function getMonthlyFinancials() {
  const revenue = state.sales
    .filter(order => isCurrentMonth(order) && ['Delivered', 'Completed'].includes(order.status))
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const expenses = state.purchases
    .filter(order => isCurrentMonth(order) && order.status !== 'Draft')
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, expenses, profit, margin };
}

export function renderFinancialSummary() {
  const summary = getMonthlyFinancials();
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  set('financial-month-label', new Date().toLocaleDateString(undefined, { month:'long', year:'numeric' }));
  set('financial-revenue', formatCurrency(summary.revenue));
  set('financial-expenses', formatCurrency(summary.expenses));
  set('financial-profit', formatCurrency(summary.profit));
  set('financial-margin', `${summary.margin.toFixed(1)}%`);
  set('dashboard-revenue', formatCurrency(summary.revenue));

  const profitElement = document.getElementById('financial-profit');
  const marginElement = document.getElementById('financial-margin');
  [profitElement, marginElement].forEach(element => {
    if (element) element.style.color = summary.profit >= 0 ? 'var(--success)' : 'var(--danger)';
  });
}
