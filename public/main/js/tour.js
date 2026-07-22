/** Small dependency-free guided tour for client presentations. */
const TOUR_KEY = 'inventory-pro-tour-complete-v1';
const steps = [
  { selector:'#page-dashboard .stats-grid', title:'Business overview', text:'Monitor inventory, orders, suppliers, and revenue from one executive dashboard.' },
  { selector:'.nav-item[data-page="products"]', title:'Inventory control', text:'Search stock, monitor reorder levels, and manage the product catalog.' },
  { selector:'.nav-item[data-page="warehouses"]', title:'Multi-warehouse visibility', text:'Compare capacity, managers, and stock across every location.' },
  { selector:'.nav-item[data-page="reports"]', title:'Decision-ready reports', text:'Review operational and financial trends with interactive reports.' },
  { selector:'#demo-mode-badge, #start-tour-btn', title:'Safe client demonstration', text:'Demo Mode uses realistic sample data while every business write remains protected.' }
];

let index = 0;
let overlay;

function endTour() {
  document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
  overlay?.remove(); overlay = null;
  localStorage.setItem(TOUR_KEY, 'true');
}

function showStep() {
  document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
  const step = steps[index];
  const target = document.querySelector(step.selector);
  target?.classList.add('tour-highlight');
  target?.scrollIntoView({ behavior:'smooth', block:'center' });
  overlay.querySelector('[data-tour-count]').textContent = `${index + 1} of ${steps.length}`;
  overlay.querySelector('h2').textContent = step.title;
  overlay.querySelector('p').textContent = step.text;
  overlay.querySelector('[data-tour-back]').disabled = index === 0;
  overlay.querySelector('[data-tour-next]').textContent = index === steps.length - 1 ? 'Finish' : 'Next';
}

export function startProductTour() {
  if (overlay) return;
  index = 0;
  overlay = document.createElement('div');
  overlay.className = 'tour-panel';
  overlay.innerHTML = `<div class="tour-kicker"><span>GUIDED TOUR</span><span data-tour-count></span></div><h2></h2><p></p>
    <div class="tour-actions"><button class="btn btn-ghost btn-sm" data-tour-skip>Skip</button><span></span>
    <button class="btn btn-ghost btn-sm" data-tour-back>Back</button><button class="btn btn-primary btn-sm" data-tour-next>Next</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-tour-skip]').onclick = endTour;
  overlay.querySelector('[data-tour-back]').onclick = () => { if (index > 0) { index--; showStep(); } };
  overlay.querySelector('[data-tour-next]').onclick = () => { if (++index >= steps.length) endTour(); else showStep(); };
  showStep();
}

export function initProductTour() {
  document.getElementById('start-tour-btn')?.addEventListener('click', startProductTour);
  if (!localStorage.getItem(TOUR_KEY)) setTimeout(startProductTour, 900);
}
