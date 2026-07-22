/** Browser-level branding preferences for presentations and single-device installs. */
import { toast } from './utils.js';

const KEY = 'inventory-pro-branding-v1';
const defaults = { companyName:'Inventory Pro', logoText:'IMS', logoImage:'', currency:'PHP', locale:'en-PH' };

export function getBranding() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

export function applyBranding() {
  const value = getBranding();
  const name = document.getElementById('brand-name');
  const logo = document.getElementById('brand-logo');
  if (name) name.textContent = value.companyName;
  if (logo) {
    logo.textContent = value.logoImage ? '' : value.logoText;
    logo.style.backgroundImage = value.logoImage ? `url("${value.logoImage}")` : '';
    logo.classList.toggle('has-image', Boolean(value.logoImage));
  }
  document.title = `${value.companyName} · Inventory Management`;
  const companyInput = document.getElementById('setting-company-name');
  const logoInput = document.getElementById('setting-logo-text');
  const currency = document.getElementById('setting-currency');
  const locale = document.getElementById('setting-locale');
  if (companyInput) companyInput.value = value.companyName;
  if (logoInput) logoInput.value = value.logoText;
  if (currency) currency.value = value.currency;
  if (locale) locale.value = value.locale;
}

function persist(changes) {
  localStorage.setItem(KEY, JSON.stringify({ ...getBranding(), ...changes }));
  applyBranding();
}

export async function saveBrandingSettings() {
  const companyName = document.getElementById('setting-company-name')?.value.trim();
  const logoText = document.getElementById('setting-logo-text')?.value.trim().toUpperCase();
  const file = document.getElementById('setting-logo-file')?.files?.[0];
  if (!companyName || !logoText) { toast('Company name and logo initials are required', 'error'); return; }
  if (file && file.size > 1024 * 1024) { toast('Logo must be smaller than 1 MB', 'error'); return; }
  let logoImage = getBranding().logoImage;
  if (file) logoImage = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  persist({ companyName, logoText, logoImage });
  toast('Company branding updated', 'success');
}

export function saveCurrencySettings() {
  persist({
    currency: document.getElementById('setting-currency')?.value || 'PHP',
    locale: document.getElementById('setting-locale')?.value || 'en-PH'
  });
  toast('Currency updated. Refreshing values…', 'success');
  setTimeout(() => location.reload(), 500);
}

window.saveBrandingSettings = saveBrandingSettings;
window.saveCurrencySettings = saveCurrencySettings;
