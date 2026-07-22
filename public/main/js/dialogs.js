/** Accessible replacement for browser confirm dialogs. */
export function confirmDialog({ title='Confirm action', message, confirmText='Confirm', danger=false } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title">
      <div class="app-dialog-icon ${danger ? 'danger' : 'accent'}">${danger ? '!' : '?'}</div>
      <h2 id="app-dialog-title">${title}</h2><p></p>
      <div class="app-dialog-actions"><button class="btn btn-ghost" data-dialog-cancel>Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-dialog-confirm>${confirmText}</button></div></div>`;
    overlay.querySelector('p').textContent = message || 'Are you sure?';
    const finish = value => { overlay.remove(); resolve(value); };
    overlay.querySelector('[data-dialog-cancel]').onclick = () => finish(false);
    overlay.querySelector('[data-dialog-confirm]').onclick = () => finish(true);
    overlay.addEventListener('click', event => { if (event.target === overlay) finish(false); });
    document.body.appendChild(overlay);
    overlay.querySelector('[data-dialog-cancel]').focus();
  });
}

/** Displays a focused error explanation without exposing technical details. */
export function errorDialog({ title='Something went wrong', message='Please check your connection and try again.' } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog" role="alertdialog" aria-modal="true">
      <div class="app-dialog-icon danger">!</div><h2></h2><p></p>
      <div class="app-dialog-actions"><button class="btn btn-primary">Close</button></div></div>`;
    overlay.querySelector('h2').textContent = title;
    overlay.querySelector('p').textContent = message;
    const close = () => { overlay.remove(); resolve(); };
    overlay.querySelector('button').onclick = close;
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
  });
}
