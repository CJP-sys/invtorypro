/**
 * js/import-export.js
 * ─────────────────────────────────────────────────────
 * CSV Import and CSV Export for the Products module.
 * Kept separate from products.js because:
 *  - It has its own file I/O logic (FileReader, Blob)
 *  - It can be removed or swapped without touching CRUD
 *  - Makes products.js easier to read
 *
 * Wires to: #import-btn and #export-btn in index.html
 */

import { db, requireUser }  from './firebase.js';
import { toast, getProductStatus } from './utils.js';
import { getProducts, loadProducts } from './products.js';
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── EXPORT CSV ─────────────────────────────────────────
   Converts the full in-memory products array to CSV
   and triggers a browser file download.
   Exports ALL products, not just the current page.
─────────────────────────────────────────────────────── */
export function exportProductsCSV() {
  const products = getProducts();
  if (!products.length) { toast('No products to export', 'info'); return; }

  const cols    = ['name','sku','cat','stock','price','reorder','warehouse','supplier','description','status'];
  const headers = ['Name','SKU','Category','Stock','Price','Reorder Point','Warehouse','Supplier','Description','Status'];

  // Wrap each field in quotes, escape any quotes inside the value
  const rows = products.map(p =>
    cols.map(c => `"${String(p[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  // Create a temporary <a> tag, click it, then clean up
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast(`Exported ${products.length} product${products.length !== 1 ? 's' : ''}`, 'success');
}
window.exportProductsCSV = exportProductsCSV;

/* ─── IMPORT CSV ─────────────────────────────────────────
   Reads a user-selected CSV file, validates each row,
   then writes valid rows to Firestore one by one.

   Required column: "name"
   Optional columns (case-insensitive):
     sku, category/cat, stock, price, reorder/reorder point,
     warehouse, supplier, description
─────────────────────────────────────────────────────── */
export function importProductsFromFile(file) {
  if (!file) return;

  const reader   = new FileReader();
  reader.onerror = () => toast('Could not read file', 'error');

  reader.onload = async (e) => {
    const lines = e.target.result.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      toast('CSV must have a header row and at least one data row', 'error');
      return;
    }

    // Parse header row — strip quotes and lowercase for flexible matching
    const headers = lines[0]
      .split(',')
      .map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

    if (!headers.includes('name')) {
      toast('CSV must have a "name" column', 'error');
      return;
    }

    const newItems = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex split handles commas inside quoted fields correctly
      const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) || lines[i].split(',');
      const obj  = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] || '').replace(/^"|"$/g, '').trim();
      });

      if (!obj.name) continue; // skip blank rows

      const stock = parseInt(obj.stock  || '0',  10) || 0;
      const price = parseFloat(obj.price || '0') || 0;

      // Basic validation per row
      if (stock < 0 || price < 0) {
        console.warn(`Row ${i + 1} skipped: negative stock or price`);
        continue;
      }

      newItems.push({
        name:        obj.name,
        sku:         obj.sku                                       || `SKU-${Math.floor(Math.random() * 90000 + 10000)}`,
        cat:         obj.category || obj.cat                       || 'General',
        stock,
        price,
        reorder:     parseInt(obj['reorder point'] || obj.reorder || '10', 10) || 10,
        warehouse:   obj.warehouse                                 || 'Main Warehouse',
        supplier:    obj.supplier                                  || '',
        description: obj.description                               || '',
        status:      getProductStatus(stock)
      });
    }

    if (!newItems.length) {
      toast('No valid rows found in file', 'error');
      return;
    }

    toast(`Importing ${newItems.length} product${newItems.length !== 1 ? 's' : ''}…`, 'info');

    // Write each row to Firestore, count successes
    let saved = 0;
    const user = await requireUser();
    for (const item of newItems) {
      try {
        await addDoc(collection(db, 'products'), { ...item, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        saved++;
      } catch (err) {
        console.error(`Row "${item.name}" failed to save`, err);
      }
    }

    // Reload from Firestore so the table reflects the real state
    await loadProducts();

    toast(
      `Imported ${saved} of ${newItems.length} product${saved !== 1 ? 's' : ''}`,
      saved > 0 ? 'success' : 'error'
    );
  };

  reader.readAsText(file);
}
window.importProductsFromFile = importProductsFromFile;

/* ─── WIRE BUTTONS ───────────────────────────────────── */
document.getElementById('import-btn')?.addEventListener('click', () => {
  // Open a hidden file picker — cleaner than a visible <input>
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.csv,text/csv';
  input.onchange = e => { if (e.target.files[0]) importProductsFromFile(e.target.files[0]); };
  input.click();
});

document.getElementById('export-btn')?.addEventListener('click', exportProductsCSV);
